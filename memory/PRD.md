# PRD - MACOFEL E-commerce

## Problema Original
Criar um layout inspirado no site decar.com.br com as informações da MACOFEL - Materiais para Construção.

## Informações da Empresa
- **Nome:** MACOFEL - Materiais para Construção
- **Endereço:** Av. São Paulo, 699 - Centro, Parapuã - SP, 17730-000
- **Telefone/WhatsApp:** (18) 99814-5495
- **Horário:** Seg-Sex: 08:00-18:00 | Sáb: 08:00-13:00

## Arquitetura
- **Framework:** Next.js 15 (App Router)
- **Banco de Dados:** MongoDB (Prisma ORM)
- **Autenticação:** NextAuth.js
- **Estilo:** Tailwind CSS
- **Ícones:** Lucide React

## O que foi implementado (07/03/2026)

### Layout estilo Decar.com.br ✅
- [x] Barra azul promocional no topo ("Compre com 10% OFF no PIX!")
- [x] Header branco com logo, busca, login/cadastre-se, carrinho
- [x] Menu horizontal de categorias
- [x] Banner amarelo com cupom PRIMEIRACOMPRA
- [x] Badges de serviço (Entrega rápida, Desconto Pix, WhatsApp)
- [x] Cards de produto com preço PIX e parcelamento 12x
- [x] Botão azul "Comprar"
- [x] Seção "Compre por Categorias" com imagens circulares
- [x] Footer escuro com informações de contato
- [x] Formas de pagamento (Visa, Master, Pix, Boleto)
- [x] Botão WhatsApp flutuante "Fale conosco"

### Páginas funcionando
- [x] Homepage (/)
- [x] Catálogo (/catalogo) com filtros
- [x] Login (/login)
- [x] Carrinho (/carrinho)
- [x] Meus Pedidos (/meus-pedidos)
- [x] Admin Dashboard (/admin)

### Funcionalidades E-commerce
- [x] Listagem de produtos
- [x] Filtros por categoria
- [x] Busca de produtos
- [x] Adicionar ao carrinho
- [x] Sistema de autenticação
- [x] Gerenciamento de pedidos

## User Personas
1. **Cliente Final:** Pessoa física ou pequeno construtor buscando materiais de construção
2. **Profissional da Construção:** Pedreiros, eletricistas, encanadores que compram em volume
3. **Administrador:** Gerente da loja que administra produtos e pedidos

## Requisitos Core
- Layout visualmente idêntico ao decar.com.br
- E-commerce completo com carrinho de compras
- Integração com WhatsApp para orçamentos
- Todas categorias de materiais de construção

## Backlog Futuro

### P0 (Crítico)
- Nenhum item pendente crítico

### P1 (Alta Prioridade)
- [ ] Integração com gateway de pagamento (Stripe/PagSeguro)
- [ ] Sistema de frete com cálculo por CEP

### P2 (Média Prioridade)
- [ ] Sistema de avaliações/reviews de produtos
- [ ] Cupons de desconto
- [ ] Newsletter

### P3 (Baixa Prioridade)
- [ ] Blog com dicas de construção
- [ ] Chat ao vivo
- [ ] Programa de fidelidade

## Próximos Passos
1. Configurar gateway de pagamento
2. Implementar cálculo de frete
3. Adicionar mais produtos ao catálogo
