"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { BusinessSettings } from "@/lib/types";
import type { AdminPanelProps } from "./panel-types";

type NotificationStatus =
  | "loading"
  | "unsupported"
  | "blocked"
  | "disabled"
  | "enabled";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

export default function SettingsPanel({
  data,
  save,
  isSaving,
}: AdminPanelProps) {
  const [draft, setDraft] =
    useState<BusinessSettings>(data.settings);

  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>("loading");

  const [notificationMessage, setNotificationMessage] =
    useState("");

  const [notificationError, setNotificationError] =
    useState(false);

  const [isNotificationBusy, setIsNotificationBusy] =
    useState(false);

  function update(
    field: keyof BusinessSettings,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await save(
      "/api/admin/settings",
      "PATCH",
      draft,
      "Configurações atualizadas com sucesso."
    );
  }

  function showNotificationFeedback(
    message: string,
    error = false
  ) {
    setNotificationMessage(message);
    setNotificationError(error);
  }

  async function getCurrentSubscription() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    const registration =
      await navigator.serviceWorker.ready;

    return registration.pushManager.getSubscription();
  }

  const refreshNotificationStatus =
    useCallback(async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setNotificationStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setNotificationStatus("blocked");
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.ready;

        const subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          setNotificationStatus("disabled");
          return;
        }

        const response = await fetch(
          "/api/admin/push/status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          }
        );

        if (response.status === 401) {
          window.location.replace("/admin/login");
          return;
        }

        const result: {
          subscribed?: boolean;
          message?: string;
        } = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ??
              "Não foi possível verificar as notificações."
          );
        }

        setNotificationStatus(
          result.subscribed
            ? "enabled"
            : "disabled"
        );
      } catch (error) {
        console.error(
          "Falha ao consultar notificações:",
          error
        );

        setNotificationStatus("disabled");
      }
    }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshNotificationStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshNotificationStatus]);

  async function enableNotifications() {
    setIsNotificationBusy(true);
    showNotificationFeedback("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setNotificationStatus("unsupported");

        throw new Error(
          "Este dispositivo não oferece suporte às notificações do aplicativo."
        );
      }

      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error(
          "A chave pública de notificações não está configurada."
        );
      }

      let permission = Notification.permission;

      if (permission === "default") {
        permission =
          await Notification.requestPermission();
      }

      if (permission === "denied") {
        setNotificationStatus("blocked");

        throw new Error(
          "As notificações estão bloqueadas neste dispositivo. Libere-as nas configurações do navegador."
        );
      }

      if (permission !== "granted") {
        setNotificationStatus("disabled");

        throw new Error(
          "A permissão para notificações não foi concedida."
        );
      }

      const registration =
        await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          });
      }

      const response = await fetch(
        "/api/admin/push/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription:
              subscription.toJSON(),
            deviceName:
              navigator.userAgent,
          }),
        }
      );

      const result: {
        success?: boolean;
        message?: string;
      } = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        window.location.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Não foi possível ativar as notificações."
        );
      }

      setNotificationStatus("enabled");

      showNotificationFeedback(
        "Notificações ativadas neste dispositivo."
      );
    } catch (error) {
      showNotificationFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível ativar as notificações.",
        true
      );
    } finally {
      setIsNotificationBusy(false);
    }
  }

  async function disableNotifications() {
    setIsNotificationBusy(true);
    showNotificationFeedback("");

    try {
      const subscription =
        await getCurrentSubscription();

      if (!subscription) {
        setNotificationStatus("disabled");

        showNotificationFeedback(
          "As notificações já estão desativadas neste dispositivo."
        );

        return;
      }

      const response = await fetch(
        "/api/admin/push/unsubscribe",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        }
      );

      const result: {
        success?: boolean;
        message?: string;
      } = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        window.location.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Não foi possível desativar as notificações."
        );
      }

      await subscription.unsubscribe();

      setNotificationStatus("disabled");

      showNotificationFeedback(
        "Notificações desativadas neste dispositivo."
      );
    } catch (error) {
      showNotificationFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível desativar as notificações.",
        true
      );
    } finally {
      setIsNotificationBusy(false);
    }
  }

  async function sendTestNotification() {
    setIsNotificationBusy(true);
    showNotificationFeedback("");

    try {
      const response = await fetch(
        "/api/admin/push/test",
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const result: {
        success?: boolean;
        sent?: number;
        total?: number;
        message?: string;
      } = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        window.location.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ??
            "Não foi possível enviar a notificação de teste."
        );
      }

      showNotificationFeedback(
        result.sent === 1
          ? "Notificação de teste enviada."
          : `Notificação enviada para ${
              result.sent ?? 0
            } dispositivos.`
      );
    } catch (error) {
      showNotificationFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a notificação de teste.",
        true
      );
    } finally {
      setIsNotificationBusy(false);
    }
  }

  function notificationStatusText() {
    if (notificationStatus === "loading") {
      return "Verificando...";
    }

    if (notificationStatus === "enabled") {
      return "Ativadas";
    }

    if (notificationStatus === "blocked") {
      return "Bloqueadas pelo navegador";
    }

    if (notificationStatus === "unsupported") {
      return "Não disponível neste dispositivo";
    }

    return "Desativadas";
  }

  return (
    <div className="settings-page-stack">
      <form
        className="admin-panel admin-edit-form"
        onSubmit={submit}
      >
        <div className="form-grid">
          <label>
            Nome do salão
            <input
              value={draft.businessName}
              maxLength={100}
              onChange={(event) =>
                update(
                  "businessName",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Subtítulo
            <input
              value={draft.subtitle}
              maxLength={120}
              onChange={(event) =>
                update(
                  "subtitle",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label className="form-span-two">
            Descrição curta
            <textarea
              value={draft.description}
              maxLength={280}
              rows={2}
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            WhatsApp
            <input
              type="tel"
              value={draft.whatsapp}
              onChange={(event) =>
                update(
                  "whatsapp",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Instagram
            <input
              value={draft.instagram}
              maxLength={120}
              onChange={(event) =>
                update(
                  "instagram",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Endereço
            <input
              value={draft.street}
              maxLength={180}
              onChange={(event) =>
                update(
                  "street",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Bairro/localidade
            <input
              value={draft.address}
              maxLength={120}
              onChange={(event) =>
                update(
                  "address",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label className="form-span-two">
            Texto de funcionamento
            <textarea
              value={draft.openingText}
              maxLength={280}
              rows={2}
              onChange={(event) =>
                update(
                  "openingText",
                  event.target.value
                )
              }
              required
            />
          </label>

          <label className="form-span-two">
            Logo (caminho dentro de public)
            <input
              value={draft.logoUrl}
              maxLength={500}
              onChange={(event) =>
                update(
                  "logoUrl",
                  event.target.value
                )
              }
            />
          </label>

          <label className="color-field">
            Cor principal
            <input
              type="color"
              value={draft.primaryColor}
              onChange={(event) =>
                update(
                  "primaryColor",
                  event.target.value
                )
              }
            />
          </label>

          <label className="color-field">
            Cor secundária
            <input
              type="color"
              value={draft.secondaryColor}
              onChange={(event) =>
                update(
                  "secondaryColor",
                  event.target.value
                )
              }
            />
          </label>

          <label className="color-field">
            Cor de destaque
            <input
              type="color"
              value={draft.accentColor}
              onChange={(event) =>
                update(
                  "accentColor",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={isSaving}
          >
            {isSaving
              ? "SALVANDO..."
              : "SALVAR ALTERAÇÕES"}
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={isSaving}
            onClick={() =>
              setDraft(data.settings)
            }
          >
            CANCELAR
          </button>
        </div>
      </form>

      <section className="admin-panel notification-settings-panel">
        <div className="notification-settings-header">
          <div>
            <p className="eyebrow">
              Aplicativo
            </p>

            <h2>Notificações</h2>

            <p className="muted-copy">
              Receba avisos neste dispositivo sobre
              novos agendamentos.
            </p>
          </div>

          <span
            className={`notification-status notification-status-${notificationStatus}`}
          >
            {notificationStatusText()}
          </span>
        </div>

        {notificationStatus === "blocked" ? (
          <p className="form-error">
            As notificações foram bloqueadas pelo
            navegador. Abra as configurações do site no
            seu aparelho para permitir novamente.
          </p>
        ) : null}

        {notificationStatus === "unsupported" ? (
          <p className="muted-copy">
            Este navegador ou dispositivo não oferece
            suporte às notificações do aplicativo.
          </p>
        ) : null}

        {notificationMessage ? (
          <p
            className={
              notificationError
                ? "admin-feedback error"
                : "admin-feedback success"
            }
            role="status"
          >
            {notificationMessage}
          </p>
        ) : null}

        <div className="admin-form-actions">
          {notificationStatus !== "enabled" &&
          notificationStatus !== "unsupported" &&
          notificationStatus !== "blocked" ? (
            <button
              type="button"
              className="primary-button"
              disabled={isNotificationBusy}
              onClick={enableNotifications}
            >
              {isNotificationBusy
                ? "ATIVANDO..."
                : "ATIVAR NOTIFICAÇÕES"}
            </button>
          ) : null}

          {notificationStatus === "enabled" ? (
            <>
              <button
                type="button"
                className="primary-button"
                disabled={isNotificationBusy}
                onClick={sendTestNotification}
              >
                {isNotificationBusy
                  ? "ENVIANDO..."
                  : "ENVIAR NOTIFICAÇÃO DE TESTE"}
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={isNotificationBusy}
                onClick={disableNotifications}
              >
                DESATIVAR NESTE DISPOSITIVO
              </button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}