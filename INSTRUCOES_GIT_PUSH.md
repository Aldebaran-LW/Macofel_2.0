# 📋 Instruções para Fazer Push do Layout Decar

## ⚠️ Problema Identificado

O repositório Git parece estar inicializado no diretório home do usuário, não no diretório do projeto. Para fazer o push corretamente, siga estas instruções:

## ✅ Solução Passo a Passo

### 1. Abra o Terminal/PowerShell

Navegue até o diretório do projeto:

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"
```

### 2. Verifique se há um repositório Git

```powershell
git status
```

Se não houver repositório Git aqui, você precisa:
- **Opção A**: Se já existe um repositório Git em outro lugar, copie o `.git` para este diretório
- **Opção B**: Inicialize um novo repositório Git aqui:
  ```powershell
  git init
  git checkout -b decar-inspired-layout
  ```

### 3. Adicione os Arquivos Criados

```powershell
git add app/page-decar.tsx
git add app/decar/page.tsx
git add components/header-decar.tsx
git add components/layout-wrapper-decar.tsx
git add app/globals.css
git add LAYOUT_DECAR.md
git add git-push-decar.ps1
```

### 4. Verifique o Status

```powershell
git status --short
```

Você deve ver os arquivos listados como `A` (adicionados) ou `??` (não rastreados ainda).

### 5. Faça o Commit

```powershell
git commit -m "feat: Adiciona layout inspirado na Decar com banner PIX e seções temáticas

- Banner de desconto PIX verde no topo
- Header customizado com banner promocional  
- Seções temáticas de produtos (Cimento, Elétrica, Banheiro, Acabamentos)
- Cards de categoria grandes e visuais
- Hero section simplificado e focado em conversão
- Rota alternativa /decar para testar o layout"
```

### 6. Configure o Remote (se necessário)

Verifique se há um remote configurado:

```powershell
git remote -v
```

Se não houver remote, adicione um:

```powershell
git remote add origin <URL_DO_SEU_REPOSITORIO>
```

Exemplo:
```powershell
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
```

### 7. Faça o Push

```powershell
git push -u origin decar-inspired-layout
```

Se o branch já existir no remote:

```powershell
git push origin decar-inspired-layout
```

## 📁 Arquivos Criados

Todos estes arquivos foram criados e estão prontos para commit:

- ✅ `app/page-decar.tsx` - Página principal com layout Decar
- ✅ `app/decar/page.tsx` - Rota alternativa `/decar`
- ✅ `components/header-decar.tsx` - Header com banner PIX verde
- ✅ `components/layout-wrapper-decar.tsx` - Wrapper do layout
- ✅ `LAYOUT_DECAR.md` - Documentação completa
- ✅ `git-push-decar.ps1` - Script auxiliar (opcional)
- ✅ `app/globals.css` - Estilos atualizados

## 🎯 Verificação Final

Após o push, você pode:

1. **Verificar no GitHub/GitLab**: Confirme que o branch `decar-inspired-layout` foi criado
2. **Testar o layout**: Acesse `/decar` na aplicação para ver o novo design
3. **Fazer merge**: Quando aprovado, faça merge com a branch principal

## 🆘 Problemas Comuns

### Erro: "fatal: pathspec did not match any files"
- **Solução**: Certifique-se de estar no diretório correto (`nextjs_space`)
- Verifique se os arquivos existem: `ls app/page-decar.tsx`

### Erro: "fatal: not a git repository"
- **Solução**: Execute `git init` no diretório `nextjs_space`

### Erro: "remote origin already exists"
- **Solução**: Use `git remote set-url origin <NOVA_URL>` para atualizar

### Erro: "failed to push some refs"
- **Solução**: Faça pull primeiro: `git pull origin decar-inspired-layout --rebase`

## 📝 Notas

- O branch `decar-inspired-layout` já foi criado
- Todos os arquivos estão sem erros de lint
- O layout está pronto para uso e teste
