# 🚀 Comandos Git - Layout Decar

## ⚠️ Situação Atual

O repositório Git está no diretório home (`C:\Users\LUCAS_W`), não no diretório do projeto. Além disso, há problemas de codificação de caracteres no caminho do projeto.

## ✅ Solução Recomendada

Execute estes comandos **manualmente no seu terminal** (PowerShell ou Git Bash), navegando primeiro para o diretório correto:

### Passo 1: Navegar para o Diretório do Projeto

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"
```

**OU** se o caminho acima não funcionar devido a codificação, tente:

```powershell
cd Downloads
cd "Projeto - Site de Material de Construção"
cd macofel_ecommerce
cd nextjs_space
```

### Passo 2: Verificar se há Git no Diretório

```powershell
git status
```

Se não houver Git aqui, inicialize:

```powershell
git init
git checkout -b decar-inspired-layout
```

### Passo 3: Adicionar os Arquivos

```powershell
git add app/page-decar.tsx
git add app/decar/page.tsx
git add components/header-decar.tsx
git add components/layout-wrapper-decar.tsx
git add app/globals.css
git add LAYOUT_DECAR.md
git add INSTRUCOES_GIT_PUSH.md
git add RESUMO_LAYOUT_DECAR.md
git add COMANDOS_GIT_FINAL.md
```

### Passo 4: Verificar Status

```powershell
git status --short
```

Você deve ver os arquivos listados como `A` (adicionados).

### Passo 5: Fazer Commit

```powershell
git commit -m "feat: Adiciona layout inspirado na Decar"
```

### Passo 6: Verificar Remote

```powershell
git remote -v
```

Se não houver remote, adicione um:

```powershell
git remote add origin <URL_DO_SEU_REPOSITORIO>
```

### Passo 7: Fazer Push

```powershell
git push -u origin decar-inspired-layout
```

## 📋 Arquivos que Devem Ser Adicionados

- ✅ `app/page-decar.tsx`
- ✅ `app/decar/page.tsx`
- ✅ `components/header-decar.tsx`
- ✅ `components/layout-wrapper-decar.tsx`
- ✅ `app/globals.css` (se foi modificado)
- ✅ `LAYOUT_DECAR.md`
- ✅ `INSTRUCOES_GIT_PUSH.md`
- ✅ `RESUMO_LAYOUT_DECAR.md`
- ✅ `COMANDOS_GIT_FINAL.md`

## 🎯 Verificação

Após o push, verifique:

1. O branch `decar-inspired-layout` foi criado no repositório remoto
2. Todos os arquivos foram enviados corretamente
3. O layout está acessível em `/decar` na aplicação

## 🆘 Problemas Comuns

### "fatal: pathspec did not match any files"
- Certifique-se de estar no diretório correto (`nextjs_space`)
- Verifique se os arquivos existem: `ls app/page-decar.tsx`

### "fatal: not a git repository"
- Execute `git init` no diretório `nextjs_space`

### "error: src refspec decar-inspired-layout does not match any"
- Faça o commit primeiro antes de fazer push
- Verifique se está no branch correto: `git branch`

### Problemas com codificação de caracteres
- Use aspas duplas no caminho: `cd "Projeto - Site de Material de Construção"`
- Ou navegue passo a passo como mostrado acima

---

**Nota:** Todos os arquivos foram criados com sucesso e estão prontos para commit. O problema é apenas de localização do repositório Git.
