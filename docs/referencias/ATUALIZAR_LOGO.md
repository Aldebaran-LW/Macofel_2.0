# 🖼️ Atualizar Logo MACOFEL

## 📋 Arquivos Atualizados

Todos os arquivos foram atualizados para usar a nova logo: `/logo-macofel.png`

### Arquivos Modificados:

1. ✅ `components/header.tsx` - Logo no cabeçalho
2. ✅ `components/footer.tsx` - Logo no rodapé
3. ✅ `app/login/page.tsx` - Logo na página de login
4. ✅ `app/cadastro/page.tsx` - Logo na página de cadastro

## 📁 Próximo Passo: Adicionar a Imagem

Você precisa adicionar a nova imagem da logo no diretório `public`:

1. **Salve a imagem** como: `logo-macofel.png`
2. **Coloque no diretório:** `nextjs_space/public/logo-macofel.png`
3. **Formato recomendado:** PNG (com fundo transparente se possível)

### Tamanhos Recomendados:

- **Header:** 64x64px (ou proporcional)
- **Footer:** 48x48px (ou proporcional)
- **Login/Cadastro:** 256x80px (ou proporcional)

## ✅ Após Adicionar a Imagem

1. A imagem será exibida automaticamente em todas as páginas
2. Se a imagem não aparecer, verifique:
   - Se o arquivo está em `public/logo-macofel.png`
   - Se o nome do arquivo está correto (case-sensitive)
   - Se o formato é suportado (PNG, JPEG, SVG)

## 🔄 Alternativa: Usar Outro Nome

Se você quiser usar outro nome de arquivo, atualize todas as referências:

- `components/header.tsx` - linha 68
- `components/footer.tsx` - linha 14
- `app/login/page.tsx` - linha 52
- `app/cadastro/page.tsx` - linha 94

---

**Após adicionar a imagem em `public/logo-macofel.png`, ela será exibida automaticamente!**
