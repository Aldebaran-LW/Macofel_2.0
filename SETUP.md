# Guia de Configuração - MACOFEL E-commerce

## 🔧 Configuração do Banco de Dados Supabase

### Credenciais do Projeto

**Project Reference:** `vedrmtowoosqxzqxgxpb`

**URL do Projeto:** `https://vedrmtowoosqxzqxgxpb.supabase.co`

### Configuração do arquivo `.env`

Crie um arquivo `.env` na raiz do projeto `nextjs_space/` com o seguinte conteúdo:

```env
# Database - Supabase PostgreSQL
# IMPORTANTE: Substitua [YOUR_PASSWORD] pela senha do seu banco Supabase
# Você pode encontrar a senha no Supabase Dashboard > Settings > Database > Database password
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# NextAuth Configuration
# Gere uma chave secreta com: openssl rand -base64 32
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Supabase API Keys (opcional - para uso direto do cliente Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://vedrmtowoosqxzqxgxpb.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU"
```

### Passos para Configuração

1. **Obter a senha do banco de dados:**
   - Acesse [Supabase Dashboard](https://app.supabase.com)
   - Selecione o projeto `vedrmtowoosqxzqxgxpb`
   - Vá em **Settings > Database**
   - Role até **Database password** e copie a senha
   - Se não souber a senha, você pode resetá-la

2. **Criar o arquivo `.env`:**
   ```bash
   cp env.example .env
   ```

3. **Editar o arquivo `.env`:**
   - Substitua `[YOUR_PASSWORD]` pela senha do banco
   - Gere um `NEXTAUTH_SECRET` com:
     ```bash
     openssl rand -base64 32
     ```
   - Ou use um gerador online de chaves aleatórias

4. **Aplicar o schema do banco:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Popular o banco (opcional):**
   ```bash
   npm run prisma:seed
   ```

### Verificação

Após configurar, teste a conexão:

```bash
npx prisma studio
```

Isso abrirá uma interface visual do banco de dados. Se conseguir ver as tabelas, a conexão está funcionando!

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `.env` no Git
- O arquivo `.env` já está no `.gitignore`
- Mantenha suas credenciais seguras
- Use variáveis de ambiente diferentes para desenvolvimento e produção

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
- Verifique se a senha está correta
- Verifique se o projeto Supabase está ativo
- Tente usar a connection string direta (sem pgbouncer):
  ```
  postgresql://postgres.vedrmtowoosqxzqxgxpb:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
  ```

### Erro: "Authentication failed"
- Verifique se o `NEXTAUTH_SECRET` está configurado
- Certifique-se de que o `NEXTAUTH_URL` está correto

### Erro ao executar migrations
```bash
# Tente regenerar o Prisma Client
npx prisma generate
npx prisma db push --force-reset  # CUIDADO: Isso apaga todos os dados!
```

## 📞 Suporte

Se encontrar problemas, verifique:
1. Se todas as variáveis de ambiente estão configuradas
2. Se o Supabase está ativo e acessível
3. Se as credenciais estão corretas
4. Os logs do terminal para mensagens de erro específicas
