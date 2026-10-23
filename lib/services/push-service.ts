import "server-only";

import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import webpush, {
  type PushSubscription,
} from "web-push";

import {
  getSupabaseServerClient,
} from "@/lib/supabase/server-client";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
  appointmentId?: string;
};

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) {
    return;
  }

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const privateKey =
    process.env.VAPID_PRIVATE_KEY;

  const subject =
    process.env.VAPID_SUBJECT;

  if (
    !publicKey ||
    !privateKey ||
    !subject
  ) {
    throw new Error(
      "Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT."
    );
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );

  vapidConfigured = true;
}

function hashNotificationToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function tokensMatch(
  candidate: string,
  expectedHash: string
) {
  const candidateHash =
    Buffer.from(
      hashNotificationToken(
        candidate
      ),
      "hex"
    );

  const expected =
    Buffer.from(
      expectedHash,
      "hex"
    );

  return (
    candidateHash.length ===
      expected.length &&
    timingSafeEqual(
      candidateHash,
      expected
    )
  );
}

/*
 * =========================================================
 * ADMIN
 * =========================================================
 */

export async function saveAdminPushSubscription(
  subscription: PushSubscription,
  deviceName?: string
) {
  const supabase =
    getSupabaseServerClient();

  const {
    endpoint,
    keys,
  } = subscription;

  if (
    !endpoint ||
    !keys?.p256dh ||
    !keys?.auth
  ) {
    throw new Error(
      "Subscription push inválida."
    );
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from(
      "push_subscriptions"
    )
    .upsert(
      {
        endpoint,
        p256dh:
          keys.p256dh,
        auth:
          keys.auth,

        role:
          "ADMIN",

        device_name:
          deviceName?.trim() ||
          null,

        active:
          true,

        updated_at:
          now,
      },
      {
        onConflict:
          "endpoint",
      }
    );

  if (error) {
    throw new Error(
      `Não foi possível salvar a assinatura push: ${error.message}`
    );
  }
}

export async function removeAdminPushSubscription(
  endpoint: string
) {
  const supabase =
    getSupabaseServerClient();

  const {
    error,
  } = await supabase
    .from(
      "push_subscriptions"
    )
    .delete()
    .eq(
      "endpoint",
      endpoint
    )
    .eq(
      "role",
      "ADMIN"
    );

  if (error) {
    throw new Error(
      `Não foi possível remover a assinatura push: ${error.message}`
    );
  }
}

export async function hasAdminPushSubscription(
  endpoint: string
) {
  const supabase =
    getSupabaseServerClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "push_subscriptions"
    )
    .select("id")
    .eq(
      "endpoint",
      endpoint
    )
    .eq(
      "role",
      "ADMIN"
    )
    .eq(
      "active",
      true
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível consultar a assinatura push: ${error.message}`
    );
  }

  return Boolean(data);
}

async function deactivateAdminSubscription(
  endpoint: string
) {
  const supabase =
    getSupabaseServerClient();

  const now =
    new Date().toISOString();

  await supabase
    .from(
      "push_subscriptions"
    )
    .update({
      active: false,

      last_failure_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "endpoint",
      endpoint
    );
}

async function markAdminPushSuccess(
  endpoint: string
) {
  const supabase =
    getSupabaseServerClient();

  await supabase
    .from(
      "push_subscriptions"
    )
    .update({
      last_success_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "endpoint",
      endpoint
    );
}

async function markAdminPushFailure(
  endpoint: string
) {
  const supabase =
    getSupabaseServerClient();

  await supabase
    .from(
      "push_subscriptions"
    )
    .update({
      last_failure_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "endpoint",
      endpoint
    );
}

export async function sendPushToEndpoint(
  subscription: PushSubscription,
  payload: PushPayload
) {
  configureVapid();

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(
        payload
      )
    );

    await markAdminPushSuccess(
      subscription.endpoint
    );

    return true;
  } catch (error) {
    const statusCode =
      typeof error ===
        "object" &&
      error !== null &&
      "statusCode" in error
        ? Number(
            error.statusCode
          )
        : null;

    if (
      statusCode === 404 ||
      statusCode === 410
    ) {
      await deactivateAdminSubscription(
        subscription.endpoint
      );
    } else {
      await markAdminPushFailure(
        subscription.endpoint
      );
    }

    console.error(
      "Falha ao enviar Web Push administrativo:",
      statusCode ??
        "sem status"
    );

    return false;
  }
}

export async function sendAdminNotification(
  payload: PushPayload
) {
  const supabase =
    getSupabaseServerClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "push_subscriptions"
    )
    .select(
      "endpoint, p256dh, auth"
    )
    .eq(
      "role",
      "ADMIN"
    )
    .eq(
      "active",
      true
    );

  if (error) {
    throw new Error(
      `Não foi possível carregar subscriptions: ${error.message}`
    );
  }

  if (!data?.length) {
    return {
      total: 0,
      sent: 0,
    };
  }

  const results =
    await Promise.all(
      data.map(
        (row) =>
          sendPushToEndpoint(
            {
              endpoint:
                row.endpoint,

              keys: {
                p256dh:
                  row.p256dh,

                auth:
                  row.auth,
              },
            },
            payload
          )
      )
    );

  return {
    total:
      data.length,

    sent:
      results.filter(
        Boolean
      ).length,
  };
}

/*
 * =========================================================
 * TOKEN DO CLIENTE
 * =========================================================
 */

export async function createCustomerNotificationToken(
  appointmentId: string
) {
  const token =
    randomBytes(32)
      .toString(
        "base64url"
      );

  const tokenHash =
    hashNotificationToken(
      token
    );

  const supabase =
    getSupabaseServerClient();

  const {
    error,
  } = await supabase
    .from(
      "appointment_notification_tokens"
    )
    .upsert(
      {
        appointment_id:
          appointmentId,

        token_hash:
          tokenHash,
      },
      {
        onConflict:
          "appointment_id",
      }
    );

  if (error) {
    throw new Error(
      `Não foi possível preparar notificações do agendamento: ${error.message}`
    );
  }

  return token;
}

async function validateCustomerNotificationToken(
  appointmentId: string,
  token: string
) {
  const supabase =
    getSupabaseServerClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "appointment_notification_tokens"
    )
    .select(
      "token_hash"
    )
    .eq(
      "appointment_id",
      appointmentId
    )
    .maybeSingle();

  if (
    error ||
    !data?.token_hash
  ) {
    return false;
  }

  try {
    return tokensMatch(
      token,
      data.token_hash
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * SUBSCRIPTION DO CLIENTE
 * =========================================================
 */

export async function saveCustomerPushSubscription(
  appointmentId: string,
  token: string,
  subscription: PushSubscription
) {
  const isValid =
    await validateCustomerNotificationToken(
      appointmentId,
      token
    );

  if (!isValid) {
    throw new Error(
      "Autorização de notificações inválida."
    );
  }

  const {
    endpoint,
    keys,
  } = subscription;

  if (
    !endpoint ||
    !keys?.p256dh ||
    !keys?.auth
  ) {
    throw new Error(
      "Subscription push inválida."
    );
  }

  const supabase =
    getSupabaseServerClient();

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabase
    .from(
      "customer_push_subscriptions"
    )
    .upsert(
      {
        appointment_id:
          appointmentId,

        endpoint,

        p256dh:
          keys.p256dh,

        auth:
          keys.auth,

        active:
          true,

        updated_at:
          now,
      },
      {
        onConflict:
          "appointment_id,endpoint",
      }
    );

  if (error) {
    throw new Error(
      `Não foi possível ativar os lembretes: ${error.message}`
    );
  }
}

export async function removeCustomerPushSubscription(
  appointmentId: string,
  token: string,
  endpoint: string
) {
  const isValid =
    await validateCustomerNotificationToken(
      appointmentId,
      token
    );

  if (!isValid) {
    throw new Error(
      "Autorização de notificações inválida."
    );
  }

  const supabase =
    getSupabaseServerClient();

  const {
    error,
  } = await supabase
    .from(
      "customer_push_subscriptions"
    )
    .delete()
    .eq(
      "appointment_id",
      appointmentId
    )
    .eq(
      "endpoint",
      endpoint
    );

  if (error) {
    throw new Error(
      `Não foi possível desativar os lembretes: ${error.message}`
    );
  }
}

async function markCustomerPushSuccess(
  id: string
) {
  const supabase =
    getSupabaseServerClient();

  await supabase
    .from(
      "customer_push_subscriptions"
    )
    .update({
      last_success_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      id
    );
}

async function markCustomerPushFailure(
  id: string,
  deactivate: boolean
) {
  const supabase =
    getSupabaseServerClient();

  const now =
    new Date().toISOString();

  await supabase
    .from(
      "customer_push_subscriptions"
    )
    .update({
      active:
        deactivate
          ? false
          : true,

      last_failure_at:
        now,

      updated_at:
        now,
    })
    .eq(
      "id",
      id
    );
}

export async function sendCustomerNotification(
  appointmentId: string,
  payload: PushPayload
) {
  configureVapid();

  const supabase =
    getSupabaseServerClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "customer_push_subscriptions"
    )
    .select(
      "id, endpoint, p256dh, auth"
    )
    .eq(
      "appointment_id",
      appointmentId
    )
    .eq(
      "active",
      true
    );

  if (error) {
    throw new Error(
      `Não foi possível carregar os lembretes do cliente: ${error.message}`
    );
  }

  if (!data?.length) {
    return {
      total: 0,
      sent: 0,
    };
  }

  const results =
    await Promise.all(
      data.map(
        async (row) => {
          const subscription: PushSubscription =
            {
              endpoint:
                row.endpoint,

              keys: {
                p256dh:
                  row.p256dh,

                auth:
                  row.auth,
              },
            };

          try {
            await webpush.sendNotification(
              subscription,
              JSON.stringify(
                payload
              )
            );

            await markCustomerPushSuccess(
              row.id
            );

            return true;
          } catch (pushError) {
            const statusCode =
              typeof pushError ===
                "object" &&
              pushError !==
                null &&
              "statusCode" in
                pushError
                ? Number(
                    pushError.statusCode
                  )
                : null;

            await markCustomerPushFailure(
              row.id,
              statusCode ===
                404 ||
                statusCode ===
                  410
            );

            console.error(
              "Falha ao enviar Web Push ao cliente:",
              statusCode ??
                "sem status"
            );

            return false;
          }
        }
      )
    );

  return {
    total:
      data.length,

    sent:
      results.filter(
        Boolean
      ).length,
  };
}