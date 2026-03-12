# 🚀 Deploy na Vercel - Token Atualizado

## ⚠️ Token Inválido

O token fornecido não é válido ou expirou. Siga as instruções abaixo.

## 🔐 Gerar Novo Token

1. Acesse: https://vercel.com/account/tokens
2. Faça login na sua conta
3. Clique em **"Create Token"**
4. Dê um nome ao token (ex: "deploy-macofel")
5. Copie o token gerado

## 🚀 Deploy com Novo Token

### Opção 1: Via CLI (Recomendado)

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"

# Definir token como variável de ambiente
$env:VERCEL_TOKEN = "seu-novo-token-aqui"

# Deploy para produção
vercel --prod --yes
```

### Opção 2: Login Interativo

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"

# Fazer login interativo
vercel login

# Deploy
vercel --prod --yes
```

## ⚙️ Configuração do Projeto

Quando a Vercel perguntar:
- **Root Directory:** `nextjs_space`
- **Framework:** Next.js (detectado automaticamente)

## 🔐 Variáveis de Ambiente

Configure no Dashboard da Vercel (Settings > Environment Variables):

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## ✅ Status Atual

- ✅ `vercel.json` corrigido e válido
- ✅ Layout do Macofel preservado
- ✅ Variáveis atualizadas mantidas
- ✅ Branch decar atualizado no GitHub
- ⚠️ Token precisa ser atualizado

---

**Gere um novo token e execute o deploy!** 🚀
