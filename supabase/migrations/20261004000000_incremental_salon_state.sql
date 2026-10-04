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

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'Invalid salon state' using errcode = 'P0001';
  end if;

  v_settings := p_state -> 'settings';
  if v_settings is null or jsonb_typeof(v_settings) <> 'object' then
    raise exception 'Missing salon settings' using errcode = 'P0001';
  end if;

  if coalesce(jsonb_typeof(p_state -> 'categories'), '') <> 'array'
    or coalesce(jsonb_typeof(p_state -> 'services'), '') <> 'array'
    or coalesce(jsonb_typeof(p_state -> 'scheduleRules'), '') <> 'array'
    or coalesce(jsonb_typeof(p_state -> 'appointments'), '') <> 'array'
    or coalesce(jsonb_typeof(p_state -> 'blocks'), '') <> 'array'
    or coalesce(jsonb_typeof(p_state -> 'extraSlots'), '') <> 'array' then
    raise exception 'Incomplete salon state' using errcode = 'P0001';
  end if;

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
  )
  on conflict (id) do update set
    business_name = excluded.business_name,
    subtitle = excluded.subtitle,
    description = excluded.description,
    whatsapp_display = excluded.whatsapp_display,
    whatsapp_number = excluded.whatsapp_number,
    instagram = excluded.instagram,
    street = excluded.street,
    address = excluded.address,
    opening_text = excluded.opening_text,
    logo_url = excluded.logo_url,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    accent_color = excluded.accent_color,
    updated_at = excluded.updated_at;

  insert into public.service_categories (id, name, slug, sort_order, active)
  select (item ->> 'id')::uuid, item ->> 'name', item ->> 'slug', (item ->> 'sortOrder')::integer, (item ->> 'active')::boolean
  from jsonb_array_elements(p_state -> 'categories') item
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    active = excluded.active;

  insert into public.services (id, category_id, name, description, estimated_duration_minutes, active, sort_order)
  select (item ->> 'id')::uuid, (item ->> 'categoryId')::uuid, item ->> 'name', item ->> 'description',
    (item ->> 'estimatedDurationMinutes')::integer, (item ->> 'active')::boolean, (item ->> 'sortOrder')::integer
  from jsonb_array_elements(p_state -> 'services') item
  on conflict (id) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    estimated_duration_minutes = excluded.estimated_duration_minutes,
    active = excluded.active,
    sort_order = excluded.sort_order;

  delete from public.services existing_service
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'services') item
    where (item ->> 'id')::uuid = existing_service.id
  );

  delete from public.service_categories existing_category
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'categories') item
    where (item ->> 'id')::uuid = existing_category.id
  );

  insert into public.schedule_rules (weekday, enabled, slot_interval_minutes)
  select (item ->> 'weekday')::smallint, (item ->> 'enabled')::boolean, (item ->> 'slotIntervalMinutes')::integer
  from jsonb_array_elements(p_state -> 'scheduleRules') item
  on conflict (weekday) do update set
    enabled = excluded.enabled,
    slot_interval_minutes = excluded.slot_interval_minutes;

  delete from public.schedule_periods existing_period
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'scheduleRules') as payload_rule(item)
    cross join lateral jsonb_array_elements(coalesce(payload_rule.item -> 'periods', '[]'::jsonb)) with ordinality as payload_period(item, ordinality)
    where (payload_rule.item ->> 'weekday')::smallint = existing_period.weekday
      and payload_period.ordinality::smallint = existing_period.period_order
  );

  insert into public.schedule_periods (weekday, period_order, start_time, end_time)
  select (payload_rule.item ->> 'weekday')::smallint, payload_period.ordinality::smallint,
    (payload_period.item ->> 'startTime')::time, (payload_period.item ->> 'endTime')::time
  from jsonb_array_elements(p_state -> 'scheduleRules') as payload_rule(item)
  cross join lateral jsonb_array_elements(coalesce(payload_rule.item -> 'periods', '[]'::jsonb)) with ordinality as payload_period(item, ordinality)
  on conflict (weekday, period_order) do update set
    start_time = excluded.start_time,
    end_time = excluded.end_time;

  delete from public.schedule_rules existing_rule
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'scheduleRules') item
    where (item ->> 'weekday')::smallint = existing_rule.weekday
  );

  insert into public.schedule_blocks (id, block_date, start_time, end_time, whole_day, reason, notes)
  select (item ->> 'id')::uuid, (item ->> 'date')::date, (item ->> 'startTime')::time, (item ->> 'endTime')::time,
    (item ->> 'wholeDay')::boolean, item ->> 'reason', coalesce(item ->> 'notes', '')
  from jsonb_array_elements(p_state -> 'blocks') item
  on conflict (id) do update set
    block_date = excluded.block_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    whole_day = excluded.whole_day,
    reason = excluded.reason,
    notes = excluded.notes;

  delete from public.schedule_blocks existing_block
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'blocks') item
    where (item ->> 'id')::uuid = existing_block.id
  );

  insert into public.extra_slots (id, slot_date, start_time, end_time, notes)
  select (item ->> 'id')::uuid, (item ->> 'date')::date, (item ->> 'startTime')::time,
    (item ->> 'endTime')::time, coalesce(item ->> 'notes', '')
  from jsonb_array_elements(p_state -> 'extraSlots') item
  on conflict (id) do update set
    slot_date = excluded.slot_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    notes = excluded.notes;

  delete from public.extra_slots existing_slot
  where not exists (
    select 1
    from jsonb_array_elements(p_state -> 'extraSlots') item
    where (item ->> 'id')::uuid = existing_slot.id
  );

  insert into public.appointments (
    id, customer_name, customer_whatsapp, appointment_date, start_time, end_time,
    status, notes, internal_notes, created_at
  )
  select (item ->> 'id')::uuid, item ->> 'customerName', item ->> 'customerWhatsapp',
    (item ->> 'appointmentDate')::date, (item ->> 'startTime')::time, (item ->> 'endTime')::time,
    item ->> 'status', coalesce(item ->> 'notes', ''), coalesce(item ->> 'internalNotes', ''),
    coalesce((item ->> 'createdAt')::timestamptz, now())
  from jsonb_array_elements(p_state -> 'appointments') item
  on conflict (id) do update set
    customer_name = excluded.customer_name,
    customer_whatsapp = excluded.customer_whatsapp,
    appointment_date = excluded.appointment_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    status = excluded.status,
    notes = excluded.notes,
    internal_notes = excluded.internal_notes,
    created_at = excluded.created_at;

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
  from jsonb_array_elements(p_state -> 'appointments') appointment(item)
  cross join lateral jsonb_array_elements_text(coalesce(appointment.item -> 'serviceNames', '[]'::jsonb)) with ordinality service_name(name, ordinality)
  left join public.services service_by_id
    on service_by_id.id = nullif(appointment.item -> 'serviceIds' ->> (service_name.ordinality - 1)::integer, '')::uuid
  left join public.services service_by_name
    on service_by_id.id is null and service_by_name.name = service_name.name
  on conflict (appointment_id, position) do update set
    service_id = excluded.service_id,
    service_name_snapshot = excluded.service_name_snapshot,
    duration_snapshot_minutes = excluded.duration_snapshot_minutes;

  update public.salon_revision set revision = revision + 1 where id = 1 returning revision into v_revision;
  return v_revision;
end;
$$;
