# MACOFEL E-commerce - Site de Materiais de Construção

E-commerce completo para venda de materiais de construção, desenvolvido com Next.js 14, TypeScript, Prisma e PostgreSQL (Supabase).

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **Supabase** - Banco de dados PostgreSQL gerenciado
- **NextAuth.js** - Autenticação e autorização
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **Radix UI** - Componentes acessíveis

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase (para banco de dados)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Aldebaran-LW/Materiais_de_Construcao.git
cd Materiais_de_Construcao/nextjs_space
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example .env
```

Edite o arquivo `.env` e configure:
- `DATABASE_URL` - Supabase em modo **pooler** (ex. `*.pooler.supabase.com:6543` com `pgbouncer=true`) para a aplicação
- `DIRECT_URL` - Conexão **direta** ao Postgres (ex. `db.<ref>.supabase.co:5432`) — usada pelo Prisma em **`prisma migrate`** com `schema-postgres.prisma`. No painel: *Settings → Database → URI* na secção **direct**. Se não usares pooler, podes repetir o mesmo valor em `DATABASE_URL` e `DIRECT_URL`.
- `NEXTAUTH_SECRET` - Chave secreta (gere com: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - URL da aplicação (ex: `http://localhost:3000`)

**E-mails de orçamento (opcional, não usa Supabase):** notifica o admin em novas solicitações / aceite ou recusa, e o cliente quando a proposta é enviada. Configure `EMAIL_FROM` e **um** dos envios abaixo:

- **Resend** (recomendado em produção): `RESEND_API_KEY` — crie em [resend.com](https://resend.com), verifique o domínio e use `EMAIL_FROM` como `Nome <noreply@seudominio.com>`.
- **SMTP** (Gmail, Hostinger, etc.): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`; opcionais `SMTP_PORT` (padrão 587), `SMTP_SECURE=true` se usar porta 465.

Para o admin receber alertas: `ADMIN_NOTIFICATION_EMAIL` (vários separados por vírgula). Sem essas variáveis, o site continua a funcionar — só não envia e-mail.

### PDV desktop (PDV-Macofel)

- Chave compartilhada com o app de loja física: `PDV_API_KEY` no **site** (`.env` / Vercel). O script `atualizar-env-local.ps1` já inclui um valor só para desenvolvimento.
- **`MACOFEL_BASE_URL` não entra no `.env` do Next.js** — é variável **só do PDV**, com a URL pública do site (ex.: `https://www.macofelparapua.com`), sem barra no final. Em local: `http://localhost:3003` com `npm run dev:3003`.
- No **PDV-Macofel**: `MACOFEL_API_KEY` = mesmo valor que `PDV_API_KEY`.
- **Vendas do PDV:** `POST /api/pdv/sale` (implementado em `app/api/pdv/sale/route.ts`) grava em MongoDB na coleção `pdv_sales` e decrementa `stock` nos documentos de `products` quando o `produto_id` é um ObjectId válido.
- **PDV no site (`/loja`):** utilizadores com PDV completo — `MASTER_ADMIN`, `ADMIN`, `STORE_MANAGER`, `SELLER` (ver `lib/permissions.ts`, função `hasPdvFullWebAccess`). A UI estática do PDV fica em `public/loja/` (build com base `/loja/`). Para regenerar a partir do repo **PDV-Macofel** ao lado deste: `npm run pdv:embed` na raiz do Macofel. A chave `PDV_API_KEY` **não** vai no bundle do Vite: a página Next envia-a ao iframe via `postMessage` após login.
- Referência: **`PDV.env.example`** na raiz deste projeto.

### Configuração do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto ou use um existente
3. Vá em **Settings > Database** e copie a **Connection String**
4. Use o formato:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Credenciais do projeto atual:**
- Project Ref: `vedrmtowoosqxzqxgxpb`
- URL: `https://vedrmtowoosqxzqxgxpb.supabase.co`
- Anon Key: (ver `env.example`)
- Service Role Key: (ver `env.example`)

4. Execute as migrações do Prisma:
```bash
npx prisma generate
npx prisma db push
```

5. (Opcional) Popule o banco com dados de exemplo:
```bash
npm run prisma:seed
# ou
npx prisma db seed
```

## 🏃 Executando o Projeto

### Desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### Produção
```bash
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
nextjs_space/
├── app/                    # App Router (Next.js 14)
│   ├── admin/             # Painel administrativo
│   ├── api/               # API Routes
│   ├── cadastro/          # Página de cadastro
│   ├── carrinho/          # Carrinho de compras
│   ├── catalogo/          # Catálogo de produtos
│   ├── checkout/          # Finalização de compra
│   ├── login/             # Página de login
│   ├── meus-pedidos/      # Histórico de pedidos
│   └── perfil/            # Perfil do usuário
├── components/            # Componentes React
│   ├── ui/               # Componentes UI (shadcn)
│   └── *.tsx             # Componentes customizados
├── lib/                   # Utilitários e configurações
├── prisma/                # Schema do banco de dados
└── scripts/               # Scripts auxiliares
```

## 🔐 Autenticação

O sistema possui dois tipos de usuários:
- **CLIENT** - Clientes que podem comprar produtos
- **ADMIN** - Administradores com acesso ao painel

### Usuários padrão (seed)

Após executar o seed, você pode fazer login com:

**Admin:**
- Email: `admin@macofel.com`
- Senha: `admin123`

**Cliente:**
- Email: `cliente@teste.com`
- Senha: `cliente123`

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Lint
npm run lint

# Prisma
npx prisma studio          # Interface visual do banco
npx prisma generate        # Gerar Prisma Client
npx prisma db push         # Aplicar schema ao banco
npx prisma migrate dev     # Criar migração
npx prisma db seed         # Popular banco com dados
```

## 📝 Funcionalidades

### Cliente
- ✅ Autenticação (login/cadastro)
- ✅ Catálogo de produtos com busca e filtros
- ✅ Carrinho de compras
- ✅ Checkout e finalização de pedidos
- ✅ Histórico de pedidos
- ✅ Perfil do usuário

### Administrador
- ✅ Dashboard com estatísticas
- ✅ CRUD de produtos
- ✅ CRUD de categorias
- ✅ Gerenciamento de pedidos
- ✅ Gerenciamento de clientes

## 🔒 Segurança

- Senhas são hasheadas com bcrypt
- Rotas protegidas com middleware
- Controle de acesso baseado em roles
- Validação de dados nas APIs

## 📦 Variáveis de Ambiente

Veja o arquivo `env.example` para todas as variáveis necessárias.

## 🐛 Troubleshooting

### Erro de conexão com banco
- Verifique se a `DATABASE_URL` está correta
- Certifique-se de que o Supabase está ativo
- Verifique se a senha do banco está correta

### Erro de autenticação
- Verifique se `NEXTAUTH_SECRET` está configurado
- Certifique-se de que `NEXTAUTH_URL` está correto

### Erro ao gerar Prisma Client
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

## 📄 Licença

Este projeto é privado.

## 👥 Contribuindo

Este é um projeto privado. Para contribuições, entre em contato com os mantenedores.

---

Desenvolvido com ❤️ para MACOFEL
