create table if not exists public.appointment_reminder_logs (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid not null
    references public.appointments(id)
    on delete cascade,

  reminder_type text not null,

  sent_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint appointment_reminder_logs_unique
    unique (appointment_id, reminder_type),

  constraint appointment_reminder_logs_type_check
    check (
      reminder_type in (
        'CUSTOMER_24H'
      )
    )
);

create index if not exists
  appointment_reminder_logs_appointment_idx
on public.appointment_reminder_logs (
  appointment_id
);

create index if not exists
  appointment_reminder_logs_sent_at_idx
on public.appointment_reminder_logs (
  sent_at
);

alter table public.appointment_reminder_logs
  enable row level security;

revoke all
  on table public.appointment_reminder_logs
  from anon;

revoke all
  on table public.appointment_reminder_logs
  from authenticated;