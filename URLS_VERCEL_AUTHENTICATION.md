# 🔐 URLs Permitidas - Vercel Authentication

## ✅ Status: URLs Configuradas!

Todas as URLs necessárias já estão configuradas no Supabase Authentication. Este documento serve como referência.

## ✅ URLs que DEVEM estar configuradas:

### URLs de Produção (macofel-dois.lwdigitalforge.com)

1. **URL Base (sem wildcard)** ✅ **CONFIGURADA**
   ```
   https://macofel-dois.lwdigitalforge.com
   ```

2. **URL Base com wildcard** ✅ **CONFIGURADA**
   ```
   https://macofel-dois.lwdigitalforge.com/**
   ```

3. **URL com wildcard simples** ✅ **CONFIGURADA**
   ```
   https://macofel-dois.lwdigitalforge.com/*
   ```

4. **Callback do NextAuth** ✅ **CONFIGURADA**
   ```
   https://macofel-dois.lwdigitalforge.com/api/auth/callback/*
   ```

### URLs do Vercel (materiais-de-construcao.vercel.app)

5. **URL Base do Vercel** ✅ (já configurada)
   ```
   https://materiais-de-construcao.vercel.app
   ```

6. **URL Base com wildcard** ✅ (já configurada)
   ```
   https://materiais-de-construcao.vercel.app/**
   ```

7. **URL com preview branches** ✅ (já configurada)
   ```
   https://materiais-de-construcao-*.vercel.app/**
   ```

8. **Callback do NextAuth** ✅ (já configurada)
   ```
   https://materiais-de-construcao.vercel.app/api/auth/callback/*
   ```

### URLs de Desenvolvimento Local

9. **Localhost 3000** ✅ (já configurada)
   ```
   http://localhost:3000
   ```

10. **Localhost 3000 com wildcard** ✅ (já configurada)
    ```
    http://localhost:3000/**
    ```

11. **Callback localhost** ✅ (já configurada)
    ```
    http://localhost:3000/api/auth/callback/*
    ```

12. **Localhost 3003** ✅ **CONFIGURADA**
    ```
    http://localhost:3003
    ```

13. **Localhost 3003 com wildcard** ✅ **CONFIGURADA**
    ```
    http://localhost:3003/**
    ```

14. **Callback localhost 3003** ✅ **CONFIGURADA**
    ```
    http://localhost:3003/api/auth/callback/*
    ```

## 📋 Como Adicionar URLs no Vercel

1. **Acesse:** https://vercel.com
2. **Selecione o projeto:** Materiais_de_Construção
3. **Vá em:** Settings > Authentication > URL Configuration
4. **Clique em:** "Add URL"
5. **Adicione as URLs faltantes:**
   - `https://macofel-dois.lwdigitalforge.com`
   - `https://macofel-dois.lwdigitalforge.com/api/auth/callback/*`
   - `http://localhost:3003`
   - `http://localhost:3003/**`
   - `http://localhost:3003/api/auth/callback/*`

## ⚠️ Importante

- A URL base **SEM wildcard** é necessária para redirecionamentos diretos
- O callback (`/api/auth/callback/*`) é **obrigatório** para o NextAuth funcionar
- Sem essas URLs, o login pode falhar em produção

## 🔍 Verificação

Após adicionar as URLs, teste:
1. Login cliente: `https://macofel-dois.lwdigitalforge.com/login`
2. Login admin: `https://macofel-dois.lwdigitalforge.com/admin/login`
3. Verifique se os redirecionamentos funcionam corretamente
