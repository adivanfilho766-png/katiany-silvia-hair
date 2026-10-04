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
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Preencha esses valores apenas no arquivo local `.env.local`. Nunca versione esse arquivo nem exponha credenciais no frontend.

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

## Persistência local

Como o Supabase ainda não está configurado, o sistema usa um repositório JSON local em `.data/salon-data.json`. O arquivo é criado no primeiro acesso com os dados de demonstração de `lib/mock-data.ts` e suas alterações são mantidas entre reinicializações locais. A pasta `.data/` é ignorada pelo Git.

As páginas e APIs usam o contrato em `lib/repositories/salon-repository.ts`; a implementação atual está em `lib/repositories/json-salon-repository.ts`. Para produção com múltiplas instâncias, substitua o adaptador JSON por PostgreSQL/Supabase: o sistema de arquivos local não é persistência durável em ambientes serverless.

## Estrutura principal

- `app/` — páginas públicas, admin e rotas da API
- `components/admin/` — formulários e ferramentas administrativas
- `lib/types.ts` — modelos compartilhados
- `lib/repositories/` — contrato e persistência
- `lib/services/salon-service.ts` — regras de negócio e disponibilidade
- `lib/mock-data.ts` — seed inicial para desenvolvimento
- `proxy.ts` — proteção server-side das rotas administrativas
- `.env.example` — variáveis de ambiente

## Observações

Agendamentos públicos são gravados como pendentes. O catálogo, horários, bloqueios e configurações vêm do mesmo repositório usado pelo painel administrativo.
