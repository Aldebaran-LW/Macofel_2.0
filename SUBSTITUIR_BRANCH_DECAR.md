# 🔄 Substituir Branch DECAR pelo Diretório Macofel

## 📋 Objetivo

Substituir todo o conteúdo do branch `decar` pelo conteúdo do diretório `Macofel`, mantendo as chaves/variáveis atualizadas.

## 🚀 Script para Executar

Execute este script no PowerShell a partir do diretório `nextjs_space`:

```powershell
# Navegar para o diretório nextjs_space
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"

# Executar o script
.\substituir-branch-decar.ps1
```

## 📝 Ou Execute Manualmente

Se preferir fazer manualmente:

```powershell
# 1. Navegar para nextjs_space
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"

# 2. Verificar branch
git checkout decar

# 3. Fazer backup das variáveis atualizadas
Copy-Item env.example env.example.backup
Copy-Item vercel.json vercel.json.backup

# 4. Copiar tudo do Macofel (exceto node_modules, .next, .git)
$macofel = "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\Macofel"
robocopy $macofel . /E /XD node_modules .next .git .vercel test_reports /XF *.tsbuildinfo

# 5. Restaurar variáveis atualizadas
Copy-Item env.example.backup env.example -Force
Copy-Item vercel.json.backup vercel.json -Force

# 6. Adicionar tudo ao git
git add -A

# 7. Commit
git commit -m "Substituir branch decar pelo conteúdo do diretório Macofel (mantendo variáveis atualizadas)"

# 8. Push
git push origin decar --force
```

## ⚠️ Importante

- O script mantém as variáveis atualizadas do `env.example` e `vercel.json`
- Todos os outros arquivos serão substituídos pelo conteúdo do diretório Macofel
- O push usa `--force` para substituir completamente o branch

## ✅ Após Executar

Verifique se:
- ✅ `env.example` contém as variáveis atualizadas
- ✅ `vercel.json` está correto (sem `rootDirectory`)
- ✅ Todos os arquivos do Macofel foram copiados
- ✅ O commit foi realizado
- ✅ O push foi enviado para o repositório
