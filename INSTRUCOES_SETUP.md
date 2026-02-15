# 🚀 Instruções de Setup - Passo a Passo

## ⚠️ IMPORTANTE: Configurar o arquivo .env primeiro!

Antes de executar os comandos, você **DEVE** editar o arquivo `.env` e substituir `[YOUR_PASSWORD]` pela senha real do seu banco Supabase.

### Como obter a senha do banco:

1. Acesse: https://app.supabase.com
2. Selecione o projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **Settings** > **Database**
4. Role até **Database password**
5. Copie a senha (ou resete se necessário)

### Editar o .env:

Abra o arquivo `nextjs_space/.env` e substitua:
```
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:[YOUR_PASSWORD]@..."
```

Por (com sua senha real):
```
DATABASE_URL="postgresql://postgres.vedrmtowoosqxzqxgxpb:SUA_SENHA_AQUI@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Também gere um `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

E substitua no `.env`:
```
NEXTAUTH_SECRET="sua-chave-gerada-aqui"
```

---

## 📋 Comandos para Executar

### 1. Criar arquivo .env (se ainda não existe)
```powershell
cd nextjs_space
Copy-Item env.example .env
```

### 2. Gerar Prisma Client
```powershell
npx prisma generate
```

### 3. Aplicar schema ao banco de dados
```powershell
npx prisma db push
```

**Nota:** Se pedir confirmação, digite `y` e pressione Enter.

### 4. Popular banco com dados de exemplo (Opcional)
```powershell
npx prisma db seed
```

Ou usando o script do package.json:
```powershell
npm run prisma:seed
```

**Nota:** O comando correto é `npx prisma db seed` (não `npm run prisma:seed`)

### 5. Executar o projeto
```powershell
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

---

## 🔍 Verificar se está funcionando

### Testar conexão com banco:
```powershell
npx prisma studio
```

Isso abrirá uma interface visual do banco. Se conseguir ver as tabelas, está tudo OK!

### Usuários padrão (após seed):

**Admin:**
- Email: `admin@macofel.com`
- Senha: `admin123`

**Cliente:**
- Email: `cliente@teste.com`
- Senha: `cliente123`

---

## ⚠️ Problemas Comuns

### Erro: "Can't reach database server"
- Verifique se a senha no `.env` está correta
- Verifique se o projeto Supabase está ativo
- Tente usar a connection string direta (porta 5432 em vez de 6543)

### Erro: "Authentication failed" (NextAuth)
- Verifique se `NEXTAUTH_SECRET` está configurado
- Certifique-se de que `NEXTAUTH_URL` está correto

### Erro ao executar prisma commands
- Certifique-se de estar no diretório `nextjs_space`
- Verifique se o Node.js está instalado: `node --version`
- Tente instalar as dependências: `npm install`

---

## 📝 Checklist Final

- [ ] Arquivo `.env` criado e configurado com senha do banco
- [ ] `NEXTAUTH_SECRET` gerado e configurado
- [ ] `npx prisma generate` executado com sucesso
- [ ] `npx prisma db push` executado com sucesso
- [ ] `npx prisma db seed` executado (opcional)
- [ ] `npm run dev` iniciado sem erros
- [ ] Acessou http://localhost:3000 e viu a página inicial

---

**Pronto! Seu projeto está configurado e rodando! 🎉**
