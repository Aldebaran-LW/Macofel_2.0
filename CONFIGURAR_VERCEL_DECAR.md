# 🚀 Configuração para Deploy na Vercel - Branch DECAR

## 📋 Visão Geral

Este guia contém todas as instruções para configurar o deploy do projeto na Vercel usando as chaves do branch **main**.

## ✅ Pré-requisitos

- ✅ Repositório GitHub: `https://github.com/Aldebaran-LW/Materiais_de_Construcao`
- ✅ Branch: `decar`
- ✅ Conta na Vercel (gratuita)
- ✅ Todas as chaves e variáveis de ambiente do main

---

## 🔐 Variáveis de Ambiente - Chaves do Main

Todas as variáveis abaixo devem ser configuradas no Dashboard da Vercel.

### 📍 Onde Configurar

1. Acesse: https://vercel.com
2. Selecione seu projeto
3. Vá em: **Settings** > **Environment Variables**
4. Adicione cada variável abaixo
5. **Aplique para:** ✅ Production, ✅ Preview, ✅ Development

---

### 1. DATABASE_URL (Supabase PostgreSQL)

```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Descrição:** Connection string do Supabase usando Transaction Pooler para conexões eficientes.

---

### 2. DIRECT_URL (Supabase - Conexão Direta)

```
postgresql://postgres.vedrmtowoosqxzqxgxpb:LW_Digital_Forge%2F123@db.vedrmtowoosqxzqxgxpb.supabase.co:5432/postgres
```

**Descrição:** Connection string direta para migrations e operações administrativas.

---

### 3. NEXTAUTH_URL

```
https://seu-projeto.vercel.app
```

⚠️ **IMPORTANTE:** 
- Deixe assim inicialmente
- Após o primeiro deploy, a Vercel fornecerá uma URL (ex: `https://materiais-de-construcao-abc123.vercel.app`)
- **Volte aqui e atualize com a URL real!**

---

### 4. NEXTAUTH_SECRET

```
HED6F6715Emf+xOoK+JVpChsa0WaodxP0tlNmn5/G+Y=
```

**Descrição:** Chave secreta para criptografia do NextAuth.

---

### 5. NEXT_PUBLIC_SUPABASE_URL

```
https://vedrmtowoosqxzqxgxpb.supabase.co
```

**Descrição:** URL pública do projeto Supabase.

---

### 6. NEXT_PUBLIC_SUPABASE_ANON_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzM0MjAsImV4cCI6MjA3NjkwOTQyMH0.RGJPOOJE2Vk9k6dyy19rE_PJhWyT94OIT8B1LkRPspk
```

**Descrição:** Chave anônima do Supabase (pública, segura para uso no cliente).

---

### 7. SUPABASE_SERVICE_ROLE_KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJtdG93b29zcXh6cXhneHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTMzMzQyMCwiZXhwIjoyMDc2OTA5NDIwfQ.TMCwtHPH6opxModb5Lx3vIesGcX5gKS8CVJP8s6IOEU
```

⚠️ **IMPORTANTE:** Esta é uma chave privada. Nunca exponha no cliente!

**Descrição:** Chave de serviço do Supabase para operações administrativas no servidor.

---

### 8. NODE_ENV

```
production
```

**Descrição:** Ambiente de execução (já configurado no `vercel.json`).

---

## 🚀 Passo a Passo - Deploy na Vercel

### Opção A: Deploy via CLI (Recomendado - Mais Rápido)

#### Pré-requisitos:
- Node.js instalado
- Token da Vercel: `vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk`

#### Executar Script Automático:

```powershell
# No diretório nextjs_space
cd nextjs_space
.\deploy-vercel-decar.ps1
```

O script irá:
1. ✅ Verificar/instalar Vercel CLI
2. ✅ Fazer login com o token
3. ✅ Vincular o projeto (se necessário)
4. ✅ Fazer deploy para preview
5. ✅ Perguntar se deseja deploy para produção

#### Ou Manualmente:

```powershell
# Instalar Vercel CLI (se necessário)
npm install -g vercel

# Fazer login com token
vercel login --token vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk

# Vincular projeto (primeira vez)
vercel link
# Quando perguntar:
# - Root Directory: nextjs_space
# - Framework: Next.js

# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

---

### Opção B: Deploy via Dashboard (Interface Gráfica)

### Passo 1: Acessar Vercel

1. Acesse: https://vercel.com
2. Faça login com sua conta GitHub
3. Se não tiver conta, crie uma (gratuito)

---

### Passo 2: Importar Projeto

1. Clique em: **"Add New Project"** ou **"Import Project"**
2. Selecione o repositório: `Aldebaran-LW/Materiais_de_Construcao`
3. Selecione o branch: **`decar`**
4. Clique em: **"Import"**

---

### Passo 3: Configurar Projeto

Na tela de configuração, defina:

#### Configurações Básicas:

- **Project Name:** `materiais-de-construcao-decar` (ou o nome que preferir)
- **Framework Preset:** Next.js (deve detectar automaticamente)
- **Root Directory:** `nextjs_space` ⚠️ **MUITO IMPORTANTE!**
- **Build Command:** `npm run build` (já configurado no `vercel.json`)
- **Output Directory:** `.next` (padrão do Next.js)
- **Install Command:** `npm install --legacy-peer-deps` (já configurado)

#### ⚠️ ATENÇÃO: Root Directory

**CRÍTICO:** Configure o **Root Directory** como `nextjs_space`

Se não configurar, a Vercel vai procurar o `package.json` na raiz e não vai encontrar!

---

### Passo 4: Configurar Variáveis de Ambiente

**ANTES de clicar em "Deploy"**, configure todas as variáveis:

1. Clique em: **"Environment Variables"**
2. Adicione cada uma das 8 variáveis listadas acima
3. Para cada variável, marque: ✅ Production, ✅ Preview, ✅ Development
4. Clique em **"Save"** após adicionar cada variável

---

### Passo 5: Deploy!

1. Revise todas as configurações
2. Verifique se todas as variáveis foram adicionadas
3. Verifique se o **Root Directory** está como `nextjs_space`
4. Clique em: **"Deploy"**

#### O que acontece:

1. ✅ Vercel clona o repositório do branch `decar`
2. ✅ Instala dependências: `npm install --legacy-peer-deps`
3. ✅ Gera clientes Prisma: `npm run prisma:generate` (via postinstall)
4. ✅ Build do Next.js: `npm run build`
5. ✅ Deploy automático!

---

### Passo 6: Após o Deploy

#### 1. Anotar a URL

Você receberá uma URL como:
```
https://materiais-de-construcao-decar-abc123.vercel.app
```

#### 2. Atualizar NEXTAUTH_URL

1. Vá em **Settings** > **Environment Variables**
2. Encontre `NEXTAUTH_URL`
3. Edite e coloque a URL real que você recebeu
4. Salve
5. **Redeploy automático** vai acontecer

#### 3. Testar a Aplicação

1. Acesse a URL fornecida pela Vercel
2. Teste:
   - ✅ Página inicial carrega?
   - ✅ Catálogo mostra produtos?
   - ✅ Login funciona?
   - ✅ Admin funciona?

---

## 🔍 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

**Solução:** Verifique se `postinstall` está no `package.json`:
```json
{
  "scripts": {
    "postinstall": "npm run prisma:generate"
  }
}
```
✅ Já está configurado!

---

### Erro: "Database connection failed"

**Solução:**
1. Verifique se `DATABASE_URL` está correto
2. Verifique se o Supabase permite conexões externas
3. Verifique se a senha está codificada corretamente (`%2F` para `/`)

---

### Erro: "NEXTAUTH_URL not set"

**Solução:** 
1. Configure `NEXTAUTH_URL` com a URL real do Vercel
2. Faça redeploy

---

### Build falha

**Solução:**
1. Veja os logs de build na Vercel
2. Verifique se `Root Directory` está como `nextjs_space`
3. Teste `npm run build` localmente primeiro

---

## 📊 Verificar Deploy

### Logs de Build:

1. Vá em **Deployments**
2. Clique no deploy mais recente
3. Veja os logs completos

### Verificar Variáveis:

1. Vá em **Settings** > **Environment Variables**
2. Verifique se todas estão lá
3. Verifique se estão aplicadas para Production

---

## 🔄 Deploy Automático

Após o primeiro deploy:

- ✅ **A cada push no GitHub** → Deploy automático
- ✅ **Preview deployments** para cada PR
- ✅ **Production deployment** para push na `decar`

---

## ✅ Checklist Final

Antes de fazer deploy, verifique:

- [x] Repositório conectado no GitHub
- [ ] Branch `decar` selecionado
- [ ] Root Directory configurado: `nextjs_space`
- [ ] Todas as 8 variáveis de ambiente adicionadas
- [ ] `DATABASE_URL` configurado
- [ ] `DIRECT_URL` configurado
- [ ] `NEXTAUTH_SECRET` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `NEXTAUTH_URL` será atualizado após deploy
- [ ] Todas aplicadas para Production, Preview e Development

---

## 🎉 Pronto!

Após seguir estes passos, seu site estará online e funcionando!

**URL do site:** `https://seu-projeto.vercel.app`

**Tudo 100% GRATUITO!** ✅

---

## 📝 Arquivos de Referência

- `env.example` - Contém todas as variáveis de ambiente
- `vercel.json` - Configuração do projeto na Vercel
- `package.json` - Scripts de build e dependências

---

**Boa sorte com o deploy!** 🚀
