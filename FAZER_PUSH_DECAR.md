# 🚀 Como Fazer Push para o Branch DECAR

## 📋 Informações do Repositório

- **Repositório:** https://github.com/Aldebaran-LW/Materiais_de_Construcao
- **Branch:** `decar`
- **Token GitHub:** Configurado no remote

## ✅ Passo a Passo

### 1. Navegar para o Diretório do Projeto

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce"
```

### 2. Verificar Status do Git

```powershell
git status
```

### 3. Mudar para o Branch DECAR

```powershell
# Se o branch já existe
git checkout decar

# Se o branch não existe, criar
git checkout -b decar
```

### 4. Adicionar Arquivos Modificados

```powershell
git add nextjs_space/env.example
git add nextjs_space/vercel.json
git add nextjs_space/CONFIGURAR_VERCEL_DECAR.md
git add nextjs_space/deploy-vercel-decar.ps1
git add nextjs_space/TOKEN_VERCEL.md
git add nextjs_space/git-push-decar.ps1
```

### 5. Fazer Commit

```powershell
git commit -m "Adicionar chaves do main e configurar para deploy Vercel no branch decar

- Atualizado env.example com todas as variáveis de ambiente do main
- Atualizado vercel.json com rootDirectory
- Criado CONFIGURAR_VERCEL_DECAR.md com guia completo de deploy
- Criado deploy-vercel-decar.ps1 para deploy automático
- Criado TOKEN_VERCEL.md com documentação do token
- Criado git-push-decar.ps1 para facilitar commits futuros"
```

### 6. Fazer Push

```powershell
git push origin decar
```

## 🔄 Script Automático

Ou execute o script que criei:

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"
.\git-push-decar.ps1
```

## 📝 Arquivos que Serão Commitados

1. ✅ `nextjs_space/env.example` - Todas as variáveis de ambiente do main
2. ✅ `nextjs_space/vercel.json` - Configuração atualizada
3. ✅ `nextjs_space/CONFIGURAR_VERCEL_DECAR.md` - Guia de deploy
4. ✅ `nextjs_space/deploy-vercel-decar.ps1` - Script de deploy
5. ✅ `nextjs_space/TOKEN_VERCEL.md` - Documentação do token
6. ✅ `nextjs_space/git-push-decar.ps1` - Script de push

## ⚠️ Nota Importante

O repositório remoto já está configurado com o token GitHub:
```
origin: https://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@github.com/Aldebaran-LW/Materiais_de_Construcao.git
```

Você pode fazer push diretamente sem precisar inserir credenciais.
