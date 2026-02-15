# 🔗 URLs para Configurar no Supabase

## 📋 URLs do Projeto

### Produção (Vercel)
```
https://materiais-de-construcao.vercel.app
```

### Preview (Vercel)
```
https://materiais-de-construcao-euuqb3586.vercel.app
```

### Desenvolvimento Local
```
http://localhost:3000
```

## ⚙️ Configuração no Supabase Dashboard

### 1. Acessar Configurações

1. Acesse: https://app.supabase.com
2. Projeto: `vedrmtowoosqxzqxgxpb`
3. Vá em **Authentication** > **URL Configuration**

### 2. Site URL

**Site URL:**
```
https://materiais-de-construcao.vercel.app
```

### 3. Redirect URLs

Adicione estas URLs na lista de **Redirect URLs**:

#### Produção:
```
https://materiais-de-construcao.vercel.app/**
```

#### Preview:
```
https://materiais-de-construcao-*.vercel.app/**
```

#### Desenvolvimento:
```
http://localhost:3000/**
```

#### NextAuth Callback:
```
https://materiais-de-construcao.vercel.app/api/auth/callback/*
http://localhost:3000/api/auth/callback/*
```

### 4. URLs Completas para Adicionar:

```
https://materiais-de-construcao.vercel.app
https://materiais-de-construcao.vercel.app/**
https://materiais-de-construcao.vercel.app/api/auth/callback/*
https://materiais-de-construcao-*.vercel.app/**
http://localhost:3000
http://localhost:3000/**
http://localhost:3000/api/auth/callback/*
```

## 🔐 Onde Configurar

### Supabase Dashboard:

1. **Authentication** > **URL Configuration**
   - **Site URL:** `https://materiais-de-construcao.vercel.app`
   - **Redirect URLs:** Adicione todas as URLs acima

2. **Settings** > **API**
   - Verifique se as chaves estão corretas
   - `NEXT_PUBLIC_SUPABASE_URL` já está configurada
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` já está configurada

## ⚠️ Importante

- Use `**` para permitir todas as rotas
- Use `*` para wildcards em subdomínios da Vercel
- Adicione tanto HTTP (localhost) quanto HTTPS (produção)

## ✅ Após Configurar

1. Salve as alterações no Supabase
2. Teste o login no site
3. Verifique se os redirects funcionam

---

**Configure essas URLs no Supabase para autenticação funcionar corretamente!**
