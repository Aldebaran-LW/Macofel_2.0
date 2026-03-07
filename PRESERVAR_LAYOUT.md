# 🎨 Preservar Layout do Macofel

## 📋 Objetivo

Garantir que todo o layout do diretório Macofel seja preservado no branch decar, mantendo as variáveis atualizadas.

## 🚀 Como Executar

Execute no PowerShell a partir do diretório `nextjs_space`:

```powershell
cd "C:\Users\LUCAS_W\Downloads\Projeto - Site de Material de Construção\macofel_ecommerce\nextjs_space"
.\preservar-layout-macofel.ps1
```

## ✅ O que o script faz:

1. ✅ Verifica se está no branch `decar`
2. ✅ Faz backup das variáveis atualizadas (`env.example` e `vercel.json`)
3. ✅ Copia **TODOS** os arquivos do diretório Macofel (incluindo layout completo)
4. ✅ Restaura as variáveis atualizadas
5. ✅ Adiciona tudo ao git
6. ✅ Faz commit: "Preservar layout completo do Macofel no branch decar (mantendo variáveis atualizadas)"
7. ✅ Faz push forçado para `origin decar`

## 📁 Arquivos do Layout Preservados:

- ✅ `app/` - Todas as páginas e rotas
- ✅ `components/` - Todos os componentes (Header, Footer, etc.)
- ✅ `lib/` - Utilitários e configurações
- ✅ `public/` - Assets e imagens
- ✅ `app/globals.css` - Estilos globais
- ✅ `tailwind.config.ts` - Configuração do Tailwind
- ✅ `components.json` - Configuração do shadcn/ui
- ✅ Todos os outros arquivos de layout e estilo

## ⚠️ Importante:

- O layout completo do Macofel será preservado
- As variáveis atualizadas serão mantidas
- O push usa `--force` para substituir completamente o branch

## ✅ Após Executar:

Verifique se:
- ✅ Todos os componentes do layout estão presentes
- ✅ Estilos e configurações estão corretos
- ✅ `env.example` contém as variáveis atualizadas
- ✅ `vercel.json` está correto
- ✅ O commit foi realizado
- ✅ O push foi enviado para o repositório

---

**O layout do Macofel será completamente preservado!** 🎨
