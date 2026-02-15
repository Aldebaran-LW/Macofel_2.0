# 🚀 Deploy na Vercel - Guia Completo

## 📋 Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto no GitHub (já configurado)
3. Supabase configurado e funcionando

## 🔧 Passo 1: Preparar o Projeto

### 1.1 Verificar Build Local

Antes de fazer deploy, teste o build localmente:

```powershell
cd nextjs_space
npm run build
```

Se o build funcionar localmente, está pronto para deploy!

## 🌐 Passo 2: Deploy na Vercel

### Opção A: Via Dashboard da Vercel (Recomendado)

1. **Acesse:** https://vercel.com
2. **Faça login** com sua conta GitHub
3. **Clique em:** "Add New Project"
4. **Importe o repositório:** `Aldebaran-LW/Materiais_de_Construcao`
5. **Configure o projeto:**
   - **Root Directory:** `nextjs_space`
   - **Framework Preset:** Next.js (detectado automaticamente)
   - **Build Command:** `npm run build` (padrão)
   - **Output Directory:** `.next` (padrão)
   - **Install Command:** `npm install` (padrão)

### Opção B: Via CLI da Vercel

```powershell
# Instalar Vercel CLI globalmente
npm i -g vercel

# No diretório do projeto
cd nextjs_space

# Fazer login
vercel login

# Deploy
vercel

# Para produção
vercel --prod
```

## 🔐 Passo 3: Configurar Variáveis de Ambiente

**IMPORTANTE:** Configure todas as variáveis de ambiente na Vercel!

### No Dashboard da Vercel:

1. Vá em **Settings** > **Environment Variables**
2. Adicione as seguintes variáveis:

#### Variáveis Obrigatórias:

```env
DATABASE_URL=postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

```env
NEXTAUTH_URL=https://seu-projeto.vercel.app
```

```env
NEXTAUTH_SECRET=HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://vedrmtowoosqxzqxgxpb.supabase.co
```

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

### ⚠️ IMPORTANTE:

1. **NEXTAUTH_URL:** Deve ser a URL do seu projeto na Vercel (ex: `https://macofel.vercel.app`)
2. **DATABASE_URL:** Use a connection string do Transaction Pooler (já configurada)
3. **Aplique para:** Production, Preview e Development

## 🔨 Passo 4: Build Settings

Na Vercel, configure:

- **Root Directory:** `nextjs_space`
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (padrão do Next.js)
- **Install Command:** `npm install`

## 📦 Passo 5: Prisma no Deploy

A Vercel precisa gerar o Prisma Client durante o build. Adicione ao `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## ✅ Passo 6: Verificar Deploy

Após o deploy:

1. Acesse a URL fornecida pela Vercel
2. Teste o login
3. Verifique se as páginas carregam corretamente
4. Teste funcionalidades do e-commerce

## 🔍 Troubleshooting

### Erro: "Prisma Client not generated"

**Solução:** Adicione `prisma generate` no script `postinstall` do `package.json`

### Erro: "Database connection failed"

**Solução:** 
- Verifique se `DATABASE_URL` está correta
- Use Transaction Pooler (porta 6543)
- Verifique se o Supabase permite conexões externas

### Erro: "NEXTAUTH_URL not set"

**Solução:** Configure `NEXTAUTH_URL` com a URL completa do seu projeto Vercel

### Build falha

**Solução:**
- Verifique os logs de build na Vercel
- Teste `npm run build` localmente primeiro
- Verifique se todas as dependências estão no `package.json`

## 📝 Checklist Final

- [ ] Build local funciona (`npm run build`)
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] NEXTAUTH_URL aponta para URL da Vercel
- [ ] DATABASE_URL configurada corretamente
- [ ] Prisma Client será gerado no build
- [ ] Projeto deployado com sucesso
- [ ] Site acessível e funcionando

---

**Após configurar tudo, o deploy será automático a cada push no GitHub!** 🎉
