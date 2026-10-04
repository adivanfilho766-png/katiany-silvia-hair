# Katiany Silvia Hair

Projeto de site público, agendamento e painel administrativo para o salão de beleza Katiany Silvia Hair.

## Requisitos

- Node.js 20+
- npm
- Next.js 16

## Instalação

```bash
npm install
Copy-Item .env.example .env.local
```

## Variáveis de ambiente

Configure o arquivo `.env.local` com os valores do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Preencha esses valores apenas no arquivo local `.env.local`. Nunca versione esse arquivo nem exponha credenciais no frontend.

`SUPABASE_SECRET_KEY` é usada apenas por Route Handlers server-side; ela nunca deve receber o prefixo `NEXT_PUBLIC_`.

## Banco de dados

As migrations versionadas ficam em `supabase/migrations/`. A primeira migration cria o schema, índices, RLS, RPCs transacionais e os dados seed. Configure as variáveis do Supabase e aplique as migrations ao projeto antes de iniciar a aplicação. O servidor não usa mais persistência JSON como fallback: sem essas variáveis e uma migration aplicada, as rotas que acessam dados retornam erro de configuração.

O repositório Supabase em `lib/repositories/supabase-salon-repository.ts` usa `read_salon_state` e `replace_salon_state` para snapshots coerentes, revisão otimista e gravações em transação. Reservas usam `create_public_appointment`; a restrição `appointments_no_overlapping_active_slots` impede reservas pendentes/confirmadas sobrepostas no próprio PostgreSQL.

Para desenvolvimento com Supabase CLI, aplique as migrations com `supabase db reset` em um banco local ou `supabase db push` após vincular o projeto correto. Não execute comandos de publicação nesta etapa.

## Rodando localmente

```bash
npm run dev
```

O app fica disponível em:

- http://localhost:3108

## Build

```bash
npm run build
```

## Admin

Acesso ao painel:

- /admin/login

O painel inclui dashboard, agendamentos, agenda diária, serviços/categorias, horários e configurações do salão. As APIs administrativas são protegidas pela sessão `httpOnly` existente.

## Persistência

Os dados operacionais são persistidos no Supabase/PostgreSQL. Não existe fallback JSON; configure o banco e aplique `supabase/migrations/` antes de usar a aplicação.

## Estrutura principal

- `app/` — páginas públicas, admin e rotas da API
- `components/admin/` — formulários e ferramentas administrativas
- `lib/types.ts` — modelos compartilhados
- `lib/repositories/` — contrato e implementação Supabase
- `lib/services/salon-service.ts` — validação de entrada e regras de negócio
- `supabase/migrations/` — schema, RLS, RPCs e seed
- `lib/mock-data.ts` — dados de referência do seed
- `proxy.ts` — proteção server-side das rotas administrativas
- `.env.example` — variáveis de ambiente

## Observações

Agendamentos públicos são gravados como pendentes. O catálogo, horários, bloqueios e configurações vêm do mesmo banco usado pelo painel administrativo.
