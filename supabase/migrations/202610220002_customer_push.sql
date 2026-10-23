create table if not exists public.appointment_notification_tokens (
  appointment_id uuid primary key
    references public.appointments(id)
    on delete cascade,

  token_hash text not null,

  created_at timestamptz not null default now()
);

alter table public.appointment_notification_tokens
  enable row level security;

revoke all
  on table public.appointment_notification_tokens
  from anon;

revoke all
  on table public.appointment_notification_tokens
  from authenticated;


create table if not exists public.customer_push_subscriptions (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  endpoint text not null,

  p256dh text not null,

  auth text not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  last_success_at timestamptz,

  last_failure_at timestamptz,

  unique (appointment_id, endpoint)
);

create index if not exists
  customer_push_subscriptions_appointment_active_idx
on public.customer_push_subscriptions (
  appointment_id,
  active
);

alter table public.customer_push_subscriptions
  enable row level security;

revoke all
  on table public.customer_push_subscriptions
  from anon;

revoke all
  on table public.customer_push_subscriptions
  from authenticated;