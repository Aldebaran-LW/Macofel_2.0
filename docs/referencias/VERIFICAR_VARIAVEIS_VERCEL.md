# ✅ Verificar Variáveis de Ambiente no Vercel

## ⚠️ Erro 401 (Unauthorized) - Checklist Final

O erro 401 pode ocorrer por várias razões. Siga este checklist:

## 🔴 Variáveis OBRIGATÓRIAS no Vercel

### 1. NEXTAUTH_URL ⚠️ **CRÍTICO**
```
https://materiais-de-construcao.vercel.app
```
**DEVE SER EXATAMENTE A URL DE PRODUÇÃO!**
- ✅ Deve começar com `https://`
- ✅ Deve ser a URL completa do seu projeto Vercel
- ❌ NÃO use `http://localhost:3000` em produção

### 2. NEXTAUTH_SECRET ⚠️ **CRÍTICO**
```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```
**DEVE SER O MESMO VALOR USADO LOCALMENTE!**
- Se você gerou um novo secret localmente, atualize também no Vercel
- Para gerar um novo: `openssl rand -base64 32`

### 3. DATABASE_URL ⚠️ **CRÍTICO**
```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
**DEVE APONTAR PARA O SUPABASE DE PRODUÇÃO!**
- Verifique se a senha está correta
- Use Session Pooler (porta 6543) para IPv4

### 4. MONGODB_URI (se estiver usando)
```
mongodb+srv://Vercel-Admin-materiais_de_construcao:O8ooXYIy89sb5cfR@materiais-de-construcao.zhnnw7g.mongodb.net/test?retryWrites=true&w=majority
```

## 📋 Como Verificar no Vercel

1. **Acesse:** https://vercel.com
2. **Selecione o projeto:** `materiais-de-construcao`
3. **Vá em:** Settings > Environment Variables
4. **Verifique cada variável:**
   - ✅ Está configurada?
   - ✅ Valor está correto?
   - ✅ Está marcada para **Production**, **Preview** e **Development**?

## 🔍 Verificar se Usuários Existem

Execute localmente para criar usuários no Supabase:

```powershell
cd nextjs_space
npm run seed-users
```

Ou verifique no Supabase Dashboard:
1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em: **Table Editor** > **users**
4. Verifique se existem usuários com:
   - Email: `admin@macofel.com`
   - Email: `cliente@teste.com`

## 🛠️ Passos para Resolver

### Passo 1: Verificar Variáveis no Vercel
- [ ] `NEXTAUTH_URL` = `https://materiais-de-construcao.vercel.app`
- [ ] `NEXTAUTH_SECRET` está configurado
- [ ] `DATABASE_URL` aponta para Supabase correto
- [ ] Todas marcadas para Production, Preview e Development

### Passo 2: Criar Usuários no Banco
- [ ] Execute `npm run seed-users` localmente
- [ ] Ou verifique no Supabase Dashboard

### Passo 3: Fazer Redeploy
- [ ] Vá em **Deployments** no Vercel
- [ ] Clique nos **3 pontos** do último deploy
- [ ] Selecione **Redeploy**
- [ ] Aguarde o deploy concluir

### Passo 4: Testar Login
- [ ] Acesse: https://materiais-de-construcao.vercel.app/login
- [ ] Use: `admin@macofel.com` / `admin123`
- [ ] Verifique se o erro 401 desapareceu

## 🎯 Credenciais de Teste

**Admin:**
- Email: `admin@macofel.com`
- Senha: `admin123`

**Cliente:**
- Email: `cliente@teste.com`
- Senha: `cliente123`

## ⚠️ Problemas Comuns

### Erro 401 ainda persiste após configurar variáveis?

1. **Verifique os logs do Vercel:**
   - Vá em **Deployments** > **Último deploy** > **Functions**
   - Procure por erros em `api/auth/[...nextauth]`

2. **Verifique se o usuário existe:**
   - Execute `npm run seed-users` novamente
   - Ou verifique no Supabase Dashboard

3. **Verifique NEXTAUTH_URL:**
   - Deve ser EXATAMENTE: `https://materiais-de-construcao.vercel.app`
   - Sem barra no final
   - Sem `http://` (deve ser `https://`)

4. **Verifique NEXTAUTH_SECRET:**
   - Deve ser o mesmo valor usado localmente
   - Se não souber, gere um novo e atualize em ambos os lugares

5. **Limpe o cache do navegador:**
   - Tente em uma janela anônima
   - Ou limpe cookies e cache

## 📝 Após Corrigir

Após configurar todas as variáveis e fazer redeploy:

1. Teste o login novamente
2. Se ainda houver erro, verifique os logs do Vercel
3. Confirme que os usuários existem no banco Supabase

---

**O erro 401 deve ser resolvido após configurar corretamente todas as variáveis de ambiente no Vercel!**
