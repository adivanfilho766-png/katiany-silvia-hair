create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),

  endpoint text not null unique,

  p256dh text not null,
  auth text not null,

  role text not null default 'ADMIN'
    check (role in ('ADMIN', 'CUSTOMER')),

  device_name text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  last_success_at timestamptz,
  last_failure_at timestamptz
);

create index if not exists push_subscriptions_role_active_idx
  on public.push_subscriptions (role, active);

alter table public.push_subscriptions
  enable row level security;

/*
 * Não criar policy pública.
 *
 * O navegador não deve consultar esta tabela diretamente.
 * O acesso será feito exclusivamente pelas APIs server-side.
 */

revoke all
  on table public.push_subscriptions
  from anon;

revoke all
  on table public.push_subscriptions
  from authenticated;