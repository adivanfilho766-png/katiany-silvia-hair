delete from public.appointments
where (id = '20000000-0000-4000-8000-000000000001'::uuid and customer_name = 'Marina Costa')
  or (id = '20000000-0000-4000-8000-000000000002'::uuid and customer_name = 'Lívia Souza')
  or (id = '20000000-0000-4000-8000-000000000003'::uuid and customer_name = 'Ana Paula')
  or (id = 'a2ca3c40-39b6-49a9-b42c-fa35e92658b9'::uuid and customer_name = 'TESTE DEPLOY 20261004');
