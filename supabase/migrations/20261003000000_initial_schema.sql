create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.salon_revision (
  id smallint primary key default 1 check (id = 1),
  revision bigint not null default 1
);

insert into public.salon_revision (id, revision) values (1, 1) on conflict (id) do nothing;

create table public.salon_settings (
  id boolean primary key default true check (id),
  business_name text not null,
  subtitle text not null,
  description text not null,
  whatsapp_display text not null,
  whatsapp_number text not null check (whatsapp_number ~ '^55[0-9]{10,11}$'),
  instagram text not null,
  street text not null,
  address text not null,
  opening_text text not null,
  logo_url text not null,
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null check (sort_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null unique,
  description text not null,
  estimated_duration_minutes integer not null check (estimated_duration_minutes between 5 and 600),
  active boolean not null default true,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now()
);

create index services_public_order_idx on public.services(category_id, sort_order) where active;

create table public.schedule_rules (
  weekday smallint primary key check (weekday between 0 and 6),
  enabled boolean not null default false,
  slot_interval_minutes integer not null check (slot_interval_minutes between 5 and 360)
);

create table public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null references public.schedule_rules(weekday) on delete cascade,
  period_order smallint not null check (period_order > 0),
  start_time time not null,
  end_time time not null,
  unique (weekday, period_order),
  check (start_time < end_time)
);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time not null,
  end_time time not null,
  whole_day boolean not null default false,
  reason text not null check (reason in ('Almoço', 'Compromisso', 'Folga', 'Horário pessoal', 'Outro')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index schedule_blocks_date_idx on public.schedule_blocks(block_date);

create table public.extra_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index extra_slots_date_idx on public.extra_slots(slot_date);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_whatsapp text not null check (customer_whatsapp ~ '^55[0-9]{10,11}$'),
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  occupied_range tsrange generated always as (
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)')
  ) stored,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  notes text not null default '',
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  check (start_time < end_time),
  constraint appointments_no_overlapping_active_slots
    exclude using gist (occupied_range with &&)
    where (status in ('PENDING', 'CONFIRMED'))
);

create index appointments_date_status_idx on public.appointments(appointment_date, status);

create table public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  duration_snapshot_minutes integer not null check (duration_snapshot_minutes >= 0),
  position smallint not null check (position > 0),
  primary key (appointment_id, position)
);

alter table public.salon_revision enable row level security;
alter table public.salon_settings enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.schedule_rules enable row level security;
alter table public.schedule_periods enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.extra_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;

revoke all on public.salon_revision from anon, authenticated;
revoke all on public.salon_settings from anon, authenticated;
revoke all on public.service_categories from anon, authenticated;
revoke all on public.services from anon, authenticated;
revoke all on public.schedule_rules from anon, authenticated;
revoke all on public.schedule_periods from anon, authenticated;
revoke all on public.schedule_blocks from anon, authenticated;
revoke all on public.extra_slots from anon, authenticated;
revoke all on public.appointments from anon, authenticated;
revoke all on public.appointment_services from anon, authenticated;

grant select on public.salon_settings, public.service_categories, public.services to anon, authenticated;
grant all on public.salon_revision, public.salon_settings, public.service_categories, public.services,
  public.schedule_rules, public.schedule_periods, public.schedule_blocks, public.extra_slots,
  public.appointments, public.appointment_services to service_role;

create policy salon_settings_public_read on public.salon_settings
  for select to anon, authenticated using (id = true);

create policy active_categories_public_read on public.service_categories
  for select to anon, authenticated using (active = true);

create policy active_services_public_read on public.services
  for select to anon, authenticated using (
    active = true and exists (
      select 1 from public.service_categories c
      where c.id = category_id and c.active = true
    )
  );

create or replace function public.read_salon_state()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'revision', (select revision from public.salon_revision where id = 1),
    'settings', (
      select jsonb_build_object(
        'businessName', business_name,
        'subtitle', subtitle,
        'description', description,
        'whatsapp', whatsapp_display,
        'whatsappNumber', whatsapp_number,
        'instagram', instagram,
        'street', street,
        'address', address,
        'openingText', opening_text,
        'logoUrl', logo_url,
        'primaryColor', primary_color,
        'secondaryColor', secondary_color,
        'accentColor', accent_color
      ) from public.salon_settings where id = true
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id::text, 'name', name, 'slug', slug, 'sortOrder', sort_order, 'active', active
      ) order by sort_order) from public.service_categories
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id::text, 'categoryId', category_id::text, 'name', name, 'description', description,
        'estimatedDurationMinutes', estimated_duration_minutes, 'active', active, 'sortOrder', sort_order
      ) order by sort_order) from public.services
    ), '[]'::jsonb),
    'scheduleRules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', 'weekday-' || r.weekday,
        'weekday', r.weekday,
        'enabled', r.enabled,
        'startTime', coalesce((select min(p.start_time)::text from public.schedule_periods p where p.weekday = r.weekday), '09:00'),
        'endTime', coalesce((select max(p.end_time)::text from public.schedule_periods p where p.weekday = r.weekday), '17:00'),
        'slotIntervalMinutes', r.slot_interval_minutes,
        'periods', coalesce((
          select jsonb_agg(jsonb_build_object('startTime', p.start_time::text, 'endTime', p.end_time::text) order by p.period_order)
          from public.schedule_periods p where p.weekday = r.weekday
        ), '[]'::jsonb)
      ) order by r.weekday) from public.schedule_rules r
    ), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id::text,
        'customerName', a.customer_name,
        'customerWhatsapp', a.customer_whatsapp,
        'appointmentDate', a.appointment_date::text,
        'startTime', to_char(a.start_time, 'HH24:MI'),
        'endTime', to_char(a.end_time, 'HH24:MI'),
        'status', a.status,
        'notes', a.notes,
        'internalNotes', a.internal_notes,
        'createdAt', a.created_at,
        'serviceNames', coalesce((
          select jsonb_agg(s.service_name_snapshot order by s.position)
          from public.appointment_services s where s.appointment_id = a.id
        ), '[]'::jsonb),
        'serviceIds', coalesce((
          select jsonb_agg(s.service_id::text order by s.position)
          from public.appointment_services s where s.appointment_id = a.id
        ), '[]'::jsonb),
        'serviceDurations', coalesce((
          select jsonb_agg(s.duration_snapshot_minutes order by s.position)
          from public.appointment_services s where s.appointment_id = a.id
        ), '[]'::jsonb)
      ) order by a.appointment_date, a.start_time) from public.appointments a
    ), '[]'::jsonb),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id::text, 'date', block_date::text, 'startTime', to_char(start_time, 'HH24:MI'),
        'endTime', to_char(end_time, 'HH24:MI'), 'wholeDay', whole_day, 'reason', reason, 'notes', notes
      ) order by block_date, start_time) from public.schedule_blocks
    ), '[]'::jsonb),
    'extraSlots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id::text, 'date', slot_date::text, 'startTime', to_char(start_time, 'HH24:MI'),
        'endTime', to_char(end_time, 'HH24:MI'), 'notes', notes
      ) order by slot_date, start_time) from public.extra_slots
    ), '[]'::jsonb)
  );
$$;

create or replace function public.replace_salon_state(p_expected_revision bigint, p_state jsonb)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_revision bigint;
  v_settings jsonb;
begin
  select revision into v_revision from public.salon_revision where id = 1 for update;
  if v_revision <> p_expected_revision then
    raise exception 'Salon data changed concurrently' using errcode = '40001';
  end if;

  v_settings := p_state -> 'settings';
  if v_settings is null then raise exception 'Missing salon settings' using errcode = 'P0001'; end if;

  delete from public.appointment_services;
  delete from public.appointments;
  delete from public.schedule_blocks;
  delete from public.extra_slots;
  delete from public.schedule_periods;
  delete from public.schedule_rules;
  delete from public.services;
  delete from public.service_categories;
  delete from public.salon_settings;

  insert into public.salon_settings (
    id, business_name, subtitle, description, whatsapp_display, whatsapp_number,
    instagram, street, address, opening_text, logo_url, primary_color, secondary_color, accent_color, updated_at
  ) values (
    true,
    v_settings ->> 'businessName', v_settings ->> 'subtitle', v_settings ->> 'description',
    v_settings ->> 'whatsapp', v_settings ->> 'whatsappNumber', v_settings ->> 'instagram',
    v_settings ->> 'street', v_settings ->> 'address', v_settings ->> 'openingText',
    v_settings ->> 'logoUrl', v_settings ->> 'primaryColor', v_settings ->> 'secondaryColor',
    v_settings ->> 'accentColor', now()
  );

  insert into public.service_categories (id, name, slug, sort_order, active)
  select (item ->> 'id')::uuid, item ->> 'name', item ->> 'slug', (item ->> 'sortOrder')::integer, (item ->> 'active')::boolean
  from jsonb_array_elements(coalesce(p_state -> 'categories', '[]'::jsonb)) item;

  insert into public.services (id, category_id, name, description, estimated_duration_minutes, active, sort_order)
  select (item ->> 'id')::uuid, (item ->> 'categoryId')::uuid, item ->> 'name', item ->> 'description',
    (item ->> 'estimatedDurationMinutes')::integer, (item ->> 'active')::boolean, (item ->> 'sortOrder')::integer
  from jsonb_array_elements(coalesce(p_state -> 'services', '[]'::jsonb)) item;

  insert into public.schedule_rules (weekday, enabled, slot_interval_minutes)
  select (item ->> 'weekday')::smallint, (item ->> 'enabled')::boolean, (item ->> 'slotIntervalMinutes')::integer
  from jsonb_array_elements(coalesce(p_state -> 'scheduleRules', '[]'::jsonb)) item;

  insert into public.schedule_periods (weekday, period_order, start_time, end_time)
  select (rule.item ->> 'weekday')::smallint, period.ordinality::smallint,
    (period.item ->> 'startTime')::time, (period.item ->> 'endTime')::time
  from jsonb_array_elements(coalesce(p_state -> 'scheduleRules', '[]'::jsonb)) rule(item)
  cross join lateral jsonb_array_elements(coalesce(rule.item -> 'periods', '[]'::jsonb)) with ordinality period(item, ordinality);

  insert into public.schedule_blocks (id, block_date, start_time, end_time, whole_day, reason, notes)
  select (item ->> 'id')::uuid, (item ->> 'date')::date, (item ->> 'startTime')::time, (item ->> 'endTime')::time,
    (item ->> 'wholeDay')::boolean, item ->> 'reason', coalesce(item ->> 'notes', '')
  from jsonb_array_elements(coalesce(p_state -> 'blocks', '[]'::jsonb)) item;

  insert into public.extra_slots (id, slot_date, start_time, end_time, notes)
  select (item ->> 'id')::uuid, (item ->> 'date')::date, (item ->> 'startTime')::time,
    (item ->> 'endTime')::time, coalesce(item ->> 'notes', '')
  from jsonb_array_elements(coalesce(p_state -> 'extraSlots', '[]'::jsonb)) item;

  insert into public.appointments (
    id, customer_name, customer_whatsapp, appointment_date, start_time, end_time,
    status, notes, internal_notes, created_at
  )
  select (item ->> 'id')::uuid, item ->> 'customerName', item ->> 'customerWhatsapp',
    (item ->> 'appointmentDate')::date, (item ->> 'startTime')::time, (item ->> 'endTime')::time,
    item ->> 'status', coalesce(item ->> 'notes', ''), coalesce(item ->> 'internalNotes', ''),
    coalesce((item ->> 'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_state -> 'appointments', '[]'::jsonb)) item;

  insert into public.appointment_services (appointment_id, service_id, service_name_snapshot, duration_snapshot_minutes, position)
  select (appointment.item ->> 'id')::uuid,
    coalesce(service_by_id.id, service_by_name.id),
    service_name.name,
    coalesce(
      (appointment.item -> 'serviceDurations' ->> (service_name.ordinality - 1)::integer)::integer,
      service_by_id.estimated_duration_minutes,
      service_by_name.estimated_duration_minutes,
      0
    ),
    service_name.ordinality::smallint
  from jsonb_array_elements(coalesce(p_state -> 'appointments', '[]'::jsonb)) appointment(item)
  cross join lateral jsonb_array_elements_text(coalesce(appointment.item -> 'serviceNames', '[]'::jsonb)) with ordinality service_name(name, ordinality)
  left join public.services service_by_id
    on service_by_id.id = nullif(appointment.item -> 'serviceIds' ->> (service_name.ordinality - 1)::integer, '')::uuid
  left join public.services service_by_name
    on service_by_id.id is null and service_by_name.name = service_name.name;

  update public.salon_revision set revision = revision + 1 where id = 1 returning revision into v_revision;
  return v_revision;
end;
$$;

create or replace function public.get_available_times(p_date date, p_service_ids uuid[])
returns table(time_slot time)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_duration integer;
  v_count integer;
  v_interval integer;
  v_weekday smallint;
begin
  if p_date is null or p_date < (now() at time zone 'America/Recife')::date then
    raise exception 'Invalid appointment date' using errcode = 'P0001';
  end if;

  if coalesce(cardinality(p_service_ids), 0) = 0
    or cardinality(p_service_ids) <> (select count(distinct selected.service_id) from unnest(p_service_ids) as selected(service_id)) then
    raise exception 'Select valid services' using errcode = 'P0001';
  end if;

  select count(*)::integer, coalesce(sum(s.estimated_duration_minutes), 0)::integer
  into v_count, v_duration
  from public.services s
  join public.service_categories c on c.id = s.category_id and c.active
  where s.id = any(p_service_ids) and s.active;

  if v_count <> cardinality(p_service_ids) then
    raise exception 'One or more services are unavailable' using errcode = 'P0001';
  end if;

  v_weekday := extract(dow from p_date)::smallint;
  select slot_interval_minutes into v_interval
  from public.schedule_rules where weekday = v_weekday and enabled;

  return query
  with candidates as (
    select generated.slot::time as slot
    from public.schedule_periods period
    join public.schedule_rules rule on rule.weekday = period.weekday and rule.enabled
    cross join lateral generate_series(
      0,
      floor((extract(epoch from (period.end_time - period.start_time)) / 60 - v_duration) / rule.slot_interval_minutes)::integer
    ) step(slot_index)
    cross join lateral (select period.start_time + make_interval(mins => step.slot_index * rule.slot_interval_minutes) as slot) generated
    where period.weekday = v_weekday
    union
    select extra.start_time
    from public.extra_slots extra
    where extra.slot_date = p_date
      and extra.start_time + make_interval(mins => v_duration) <= extra.end_time
  )
  select distinct candidates.slot
  from candidates
  where not exists (
      select 1 from public.schedule_blocks block
      where block.block_date = p_date
        and tsrange(p_date + candidates.slot, p_date + candidates.slot + make_interval(mins => v_duration), '[)')
          && tsrange(p_date + block.start_time, p_date + block.end_time, '[)')
    )
    and not exists (
      select 1 from public.appointments appointment
      where appointment.appointment_date = p_date
        and appointment.status in ('PENDING', 'CONFIRMED')
        and appointment.occupied_range
          && tsrange(p_date + candidates.slot, p_date + candidates.slot + make_interval(mins => v_duration), '[)')
    )
  order by candidates.slot;
end;
$$;

create or replace function public.create_public_appointment(
  p_customer_name text,
  p_customer_whatsapp text,
  p_appointment_date date,
  p_start_time time,
  p_service_ids uuid[],
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_duration integer;
  v_id uuid;
  v_revision bigint;
  v_names jsonb;
begin
  select revision into v_revision from public.salon_revision where id = 1 for update;

  if length(trim(coalesce(p_customer_name, ''))) not between 1 and 120 then
    raise exception 'Informe um nome válido' using errcode = 'P0001';
  end if;
  if coalesce(p_customer_whatsapp, '') !~ '^55[0-9]{10,11}$' then
    raise exception 'Informe um WhatsApp válido com DDD' using errcode = 'P0001';
  end if;
  if length(coalesce(p_notes, '')) > 1000 then
    raise exception 'Observação muito longa' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.get_available_times(p_appointment_date, p_service_ids) available
    where available.time_slot = p_start_time
  ) then
    raise exception 'Esse horário não está mais disponível. Escolha outro.' using errcode = '23P01';
  end if;

  select sum(s.estimated_duration_minutes)::integer, jsonb_agg(s.name order by array_position(p_service_ids, s.id))
  into v_duration, v_names
  from public.services s
  join public.service_categories c on c.id = s.category_id and c.active
  where s.id = any(p_service_ids) and s.active;

  insert into public.appointments (
    customer_name, customer_whatsapp, appointment_date, start_time, end_time, status, notes
  ) values (
    trim(p_customer_name), p_customer_whatsapp, p_appointment_date, p_start_time,
    p_start_time + make_interval(mins => v_duration), 'PENDING', left(coalesce(p_notes, ''), 1000)
  ) returning id into v_id;

  insert into public.appointment_services (appointment_id, service_id, service_name_snapshot, duration_snapshot_minutes, position)
  select v_id, s.id, s.name, s.estimated_duration_minutes, array_position(p_service_ids, s.id)::smallint
  from public.services s where s.id = any(p_service_ids);

  update public.salon_revision set revision = revision + 1 where id = 1;

  return jsonb_build_object(
    'id', v_id::text,
    'customerName', trim(p_customer_name),
    'customerWhatsapp', p_customer_whatsapp,
    'appointmentDate', p_appointment_date::text,
    'startTime', to_char(p_start_time, 'HH24:MI'),
    'endTime', to_char(p_start_time + make_interval(mins => v_duration), 'HH24:MI'),
    'status', 'PENDING',
    'notes', left(coalesce(p_notes, ''), 1000),
    'internalNotes', '',
    'createdAt', now(),
    'serviceNames', v_names,
    'serviceIds', to_jsonb(p_service_ids)
  );
exception
  when exclusion_violation then
    raise exception 'Esse horário não está mais disponível. Escolha outro.' using errcode = '23P01';
end;
$$;

revoke all on function public.read_salon_state() from public, anon, authenticated;
revoke all on function public.replace_salon_state(bigint, jsonb) from public, anon, authenticated;
revoke all on function public.get_available_times(date, uuid[]) from public, anon, authenticated;
revoke all on function public.create_public_appointment(text, text, date, time, uuid[], text) from public, anon, authenticated;
grant execute on function public.read_salon_state() to service_role;
grant execute on function public.replace_salon_state(bigint, jsonb) to service_role;
grant execute on function public.get_available_times(date, uuid[]) to service_role;
grant execute on function public.create_public_appointment(text, text, date, time, uuid[], text) to service_role;

insert into public.salon_settings (
  id, business_name, subtitle, description, whatsapp_display, whatsapp_number,
  instagram, street, address, opening_text, logo_url, primary_color, secondary_color, accent_color
) values (
  true, 'Katiany Silvia Hair', 'Espaço da Beleza',
  'Atendimento personalizado para cabelos, cílios e sobrancelhas.',
  '+55 81 99905-3120', '5581999053120', '@katianysilviahairr',
  'Rua José Carlos de Paula', 'Aver-o-Mar', 'Realçando sua beleza e sua autoestima.',
  '/logo-katiany-silvia.png', '#f6dfe6', '#f7eef2', '#c5787e'
) on conflict (id) do nothing;

insert into public.service_categories (id, name, slug, sort_order, active) values
  ('00000000-0000-4000-8000-000000000001', 'Progressivas e alinhamento', 'progressivas-e-alinhamento', 1, true),
  ('00000000-0000-4000-8000-000000000002', 'Tratamentos capilares', 'tratamentos-capilares', 2, true),
  ('00000000-0000-4000-8000-000000000003', 'Escova e finalização', 'escova-e-finalizacao', 3, true),
  ('00000000-0000-4000-8000-000000000004', 'Beleza', 'beleza', 4, true)
on conflict (id) do nothing;

insert into public.services (id, category_id, name, description, estimated_duration_minutes, active, sort_order) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Progressiva sem formol NB Absolus', 'Alinhamento suave e cuidado com os fios.', 180, true, 1),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Progressiva sem formol Pro Liss My Phios', 'Ideal para quem busca redução de volume e efeito liso mais eficiente.', 180, true, 2),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Progressiva sem formol Prohall Select One', 'Cuidado com os fios em uma fórmula pensada para manter o cabelo saudável.', 180, true, 3),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Selagem Prohall', 'Finalização com brilho e maciez.', 120, true, 4),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Botox capilar', 'Hidratação profunda e reconstrução para fios danificados.', 120, true, 5),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 'Mirra Profissional', 'Tratamento com foco em brilho e maciez.', 60, true, 6),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000002', 'My Phios S.O.S', 'Cuidado intenso para fios fragilizados.', 60, true, 7),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000002', 'NB Nutrição', 'Nutrição capilar para cabelos ressecados.', 60, true, 8),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000002', 'Prohall Mask', 'Máscara de tratamento para recuperar a estrutura dos fios.', 60, true, 9),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', 'Prohall Blond', 'Cuidado específico para cabelos com luzes e processos químicos.', 60, true, 10),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'Pro Hair Banana e Mel', 'Tratamento hidratante com foco em brilho e suavidade.', 60, true, 11),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 'Cauterização', 'Tratamento profissional para fios com necessidade de reconstrução.', 60, true, 12),
  ('10000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 'Escova', 'Finalização leve e prática para o dia a dia.', 60, true, 13),
  ('10000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000003', 'Escova e chapinha', 'Resultado mais definido com acabamento sofisticado.', 60, true, 14),
  ('10000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000003', 'Finalização para cabelo no ombro', 'Atendimento com foco em acabamento e movimento.', 60, true, 15),
  ('10000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000003', 'Finalização para cabelo abaixo do ombro', 'Finalização adaptada ao comprimento e ao tipo de fio.', 60, true, 16),
  ('10000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000003', 'Finalização para cabelo na cintura', 'Atendimento mais detalhado para cabelos longos.', 60, true, 17),
  ('10000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000003', 'Finalização para cabelo abaixo da cintura', 'Finalização para cabelos longuíssimos com atenção ao acabamento.', 60, true, 18),
  ('10000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000004', 'Cílios', 'Cuidados e destaque para a área dos olhos.', 60, true, 19),
  ('10000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000004', 'Sobrancelhas', 'Design e finalização para harmonizar o olhar.', 30, true, 20)
on conflict (id) do nothing;

insert into public.schedule_rules (weekday, enabled, slot_interval_minutes) values
  (0, false, 60), (1, true, 60), (2, true, 60), (3, true, 60),
  (4, true, 60), (5, true, 60), (6, true, 60)
on conflict (weekday) do nothing;

insert into public.schedule_periods (weekday, period_order, start_time, end_time) values
  (1, 1, '09:00', '18:00'), (2, 1, '09:00', '18:00'),
  (3, 1, '09:00', '18:00'), (4, 1, '09:00', '18:00'),
  (5, 1, '09:00', '18:00'), (6, 1, '09:00', '14:00')
on conflict (weekday, period_order) do nothing;

insert into public.appointments (
  id, customer_name, customer_whatsapp, appointment_date, start_time, end_time, status, notes, internal_notes, created_at
) values
  ('20000000-0000-4000-8000-000000000001', 'Marina Costa', '5581999991234', current_date + 2, '10:00', '11:00', 'PENDING', 'Queria manter o comprimento e dar brilho.', '', now()),
  ('20000000-0000-4000-8000-000000000002', 'Lívia Souza', '5581981234567', current_date + 3, '14:00', '16:00', 'CONFIRMED', 'Cabelo com volume, precisa de hidratação profissional.', '', now()),
  ('20000000-0000-4000-8000-000000000003', 'Ana Paula', '5581998765432', current_date + 4, '09:00', '11:30', 'PENDING', 'Quero uma progressiva sem formol.', '', now())
on conflict (id) do nothing;

insert into public.appointment_services (appointment_id, service_id, service_name_snapshot, duration_snapshot_minutes, position) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000013', 'Escova', 60, 1),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000020', 'Sobrancelhas', 30, 2),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'Botox capilar', 120, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'Mirra Profissional', 60, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Progressiva sem formol Prohall Select One', 180, 1)
on conflict (appointment_id, position) do nothing;