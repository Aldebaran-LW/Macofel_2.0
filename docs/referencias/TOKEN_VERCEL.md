# 🔐 Token da Vercel - Configuração

## Token Configurado

O token da Vercel está configurado e pronto para uso:

```
vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk
```

## 📋 Como Usar

### Opção 1: Script Automático (Recomendado)

Execute o script PowerShell:

```powershell
cd nextjs_space
.\deploy-vercel-decar.ps1
```

### Opção 2: CLI Manual

```powershell
# Fazer login
vercel login --token vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk

# Deploy
vercel --prod
```

### Opção 3: Variável de Ambiente

```powershell
# Definir token como variável de ambiente
$env:VERCEL_TOKEN = "vck_484rYySwGJvKi4RqkIvHxPLwzYzkeLfJH5iEFI0jUUpVL3pzWL2TJcLk"

# Agora pode usar vercel sem --token
vercel --prod
```

## ⚠️ Segurança

- ✅ Este token está no repositório para facilitar o deploy
- ⚠️ Se necessário, você pode revogar e criar um novo token em: https://vercel.com/account/tokens
- 🔒 O token tem permissões para fazer deploy no projeto

## 🔄 Renovar Token

Se precisar renovar o token:

1. Acesse: https://vercel.com/account/tokens
2. Revogue o token antigo
3. Crie um novo token
4. Atualize este arquivo e o script `deploy-vercel-decar.ps1`
