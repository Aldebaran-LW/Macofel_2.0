# 🚀 Configurar Deploy do Branch `novo-layout` no Vercel

## 📋 Objetivo

Configurar o branch `novo-layout` para fazer deploy apenas no projeto Vercel específico:
- **Project ID:** `prj_gCwDJ9vcpA34GW5os9E4krIas9LL`

---

## ✅ Configuração Aplicada

Foi criado o arquivo `.vercel/project.json` no branch `novo-layout` com o Project ID configurado.

---

## 🔧 Método 1: Via Dashboard da Vercel (Recomendado)

### Passo 1: Acessar o Projeto

1. Acesse: https://vercel.com
2. Faça login na sua conta
3. Vá para o projeto com ID: `prj_gCwDJ9vcpA34GW5os9E4krIas9LL`

### Passo 2: Configurar Git Integration

1. Vá em **Settings** > **Git**
2. Verifique se o repositório está conectado: `Aldebaran-LW/Materiais_de_Construcao`
3. Se não estiver, conecte o repositório

### Passo 3: Configurar Branch para Deploy

1. Vá em **Settings** > **Git** > **Production Branch**
2. Configure para usar apenas o branch `novo-layout`:
   - **Production Branch:** `novo-layout`
   - Ou deixe `main` e configure **Preview Branches** para incluir `novo-layout`

### Passo 4: Configurar Preview Branches (Opcional)

Se quiser que `novo-layout` faça deploy apenas como preview:

1. Vá em **Settings** > **Git**
2. Em **Ignored Build Step**, configure para ignorar outros branches:
   ```
   git diff HEAD^ HEAD --quiet . nextjs_space/
   ```
3. Ou use a opção **"Only build pull requests"** e crie PRs do `novo-layout`

---

## 🚀 Método 2: Via CLI da Vercel

### Passo 1: Vincular o Projeto

```powershell
# No diretório nextjs_space
cd nextjs_space

# Fazer login (se necessário)
vercel login

# Vincular ao projeto específico
vercel link --project prj_gCwDJ9vcpA34GW5os9E4krIas9LL
```

### Passo 2: Deploy do Branch

```powershell
# Garantir que está no branch novo-layout
git checkout novo-layout

# Fazer deploy
vercel --prod
```

---

## 📝 Configuração de Build

O arquivo `vercel.json` já está configurado com:

```json
{
  "buildCommand": "npm run vercel-build",
  "devCommand": "npm run dev",
  "installCommand": "npm install --legacy-peer-deps",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Root Directory:** `nextjs_space` (deve ser configurado no Dashboard da Vercel)

---

## 🔐 Variáveis de Ambiente

Certifique-se de que todas as variáveis estão configuradas no projeto Vercel:

1. Vá em **Settings** > **Environment Variables**
2. Configure para **Preview** (para branches de preview):
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ Verificação

Após configurar:

1. Faça um push para o branch `novo-layout`:
   ```powershell
   git push origin novo-layout
   ```

2. O Vercel deve detectar automaticamente e fazer deploy

3. Verifique o deployment em: https://vercel.com/dashboard

---

## 🆘 Troubleshooting

### O deploy não está acontecendo automaticamente?

1. Verifique se o Git Integration está ativo no projeto
2. Verifique se o branch `novo-layout` está na lista de branches monitorados
3. Faça um deploy manual via CLI: `vercel --prod`

### O projeto está vinculado ao projeto errado?

1. Remova o arquivo `.vercel/project.json` (se necessário)
2. Execute: `vercel link --project prj_gCwDJ9vcpA34GW5os9E4krIas9LL`
3. Ou configure manualmente no Dashboard

---

## 📚 Referências

- [Vercel - Git Integration](https://vercel.com/docs/concepts/git)
- [Vercel - Project Linking](https://vercel.com/docs/cli#project-linking)
- Arquivo local: `.vercel/project.json`

---

**✨ Dica:** O arquivo `.vercel/project.json` já está commitado no branch `novo-layout` e será usado automaticamente pelo Vercel CLI.
