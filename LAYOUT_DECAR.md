# Layout Inspirado na Decar

Este documento descreve o novo layout inspirado no site da Decar (https://www.decar.com.br).

## 📁 Arquivos Criados

### Componentes
- `components/header-decar.tsx` - Header com banner de desconto PIX
- `components/layout-wrapper-decar.tsx` - Wrapper do layout Decar
- `app/page-decar.tsx` - Página principal com layout Decar

### Rotas
- `/decar` - Rota alternativa para testar o novo layout

## 🎨 Características do Layout

### 1. Banner de Desconto PIX
- Banner verde destacado no topo da página
- Promoção de 10% de desconto no PIX
- Botão de cadastro direto
- Pode ser fechado pelo usuário

### 2. Seções de Produtos Temáticas
O layout inclui várias seções inspiradas no site da Decar:

- **"Produtos para fazer bonito na obra com economia"** - Cimento e argamassa
- **"Encontre os melhores acabamentos elétricos"** - Produtos elétricos
- **"Seu banheiro merece essa novidade"** - Produtos para banheiro
- **"Os melhores rejuntes para pisos e porcelanatos"** - Acabamentos

### 3. Cards de Categoria Grandes
- Cards com imagens grandes e textos destacados
- Design mais visual e impactante
- Links diretos para categorias específicas

### 4. Hero Section Simplificado
- Design mais limpo e direto
- Foco em ofertas e economia
- CTAs claros e destacados

## 🚀 Como Usar

### Opção 1: Usar como Página Principal
Substitua o conteúdo de `app/page.tsx` pelo conteúdo de `app/page-decar.tsx`:

```typescript
// Em app/page.tsx
export { default, dynamic } from './page-decar';
```

### Opção 2: Usar como Rota Alternativa
Acesse `/decar` para ver o novo layout sem alterar a página principal.

### Opção 3: Criar um Branch Separado
O branch `decar-inspired-layout` já foi criado. Você pode fazer merge quando estiver satisfeito.

## 🎯 Diferenças do Layout Original

1. **Banner PIX**: Novo banner verde no topo (similar ao site da Decar)
2. **Seções Temáticas**: Seções específicas para diferentes categorias de produtos
3. **Cards Grandes**: Cards de categoria maiores e mais visuais
4. **Hero Simplificado**: Hero section mais direto ao ponto
5. **Menos Elementos**: Layout mais limpo, focado em conversão

## 📝 Personalização

Para personalizar o layout:

1. **Cores**: Ajuste as cores em `components/header-decar.tsx` (banner verde)
2. **Seções**: Modifique as seções em `app/page-decar.tsx`
3. **Banner PIX**: Personalize o texto e desconto em `components/header-decar.tsx`

## ✅ Status

- ✅ Banner de desconto PIX implementado
- ✅ Header customizado criado
- ✅ Seções temáticas de produtos criadas
- ✅ Cards de categoria grandes implementados
- ✅ Layout wrapper criado
- ✅ Rota alternativa `/decar` criada

## 🔄 Próximos Passos

1. Testar o layout em diferentes dispositivos
2. Ajustar cores e espaçamentos conforme necessário
3. Adicionar mais seções temáticas se necessário
4. Fazer merge com a branch principal quando aprovado
