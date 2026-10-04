begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

select ok(
  not has_table_privilege('anon', 'public.appointments', 'SELECT'),
  'anonymous clients cannot list appointments'
);

select ok(
  not has_table_privilege('anon', 'public.appointment_services', 'SELECT'),
  'anonymous clients cannot read appointment-service links'
);

select ok(
  not has_function_privilege(
    'anon',
    to_regprocedure('public.create_public_appointment(text,text,date,time,uuid[],text)'),
    'EXECUTE'
  ),
  'anonymous clients cannot execute the booking RPC directly'
);

select ok(
  has_table_privilege('anon', 'public.salon_settings', 'SELECT'),
  'anonymous clients can read public salon settings'
);

set local role service_role;

do $$
declare
  v_service_id uuid;
  v_date date;
  v_time time;
  v_booking jsonb;
  v_conflict boolean := false;
begin
  select id into v_service_id from public.services where name = 'Escova' and active;
  if v_service_id is null then raise exception 'Seed service Escova is missing'; end if;

  select dates.appointment_date, available.time_slot
  into v_date, v_time
  from generate_series(1, 21) days(day_offset)
  cross join lateral (select (current_date + days.day_offset)::date as appointment_date) dates
  cross join lateral public.get_available_times(dates.appointment_date, array[v_service_id]) available
  order by dates.appointment_date, available.time_slot
  limit 1;

  if v_date is null or v_time is null then raise exception 'No test availability found'; end if;

  v_booking := public.create_public_appointment(
    'Teste pgTAP', '5581999912345', v_date, v_time, array[v_service_id], 'Teste transacional'
  );

  if v_booking ->> 'status' <> 'PENDING' then raise exception 'New booking must be pending'; end if;

  begin
    perform public.create_public_appointment(
      'Teste Conflito', '5581999912346', v_date, v_time, array[v_service_id], ''
    );
  exception when sqlstate '23P01' then
    v_conflict := true;
  end;

  if not v_conflict then raise exception 'Overlapping booking was not rejected'; end if;

  update public.appointments
  set status = 'CANCELLED'
  where id = (v_booking ->> 'id')::uuid;

  if not exists (
    select 1 from public.get_available_times(v_date, array[v_service_id])
    where time_slot = v_time
  ) then raise exception 'Cancelled booking did not release its slot'; end if;
end;
$$;

reset role;

select * from finish();

rollback;