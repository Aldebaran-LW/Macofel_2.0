/** HTML de impressão do orçamento — mesmo visual base do painel (detalhe admin). */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type OrcamentoPrintInput = {
  id?: string;
  clienteNome: string;
  clienteEmail?: string | null;
  clienteTelefone?: string | null;
  observacoes?: string | null;
  itens: Array<{
    produto: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  freteValor: number;
  descontoTipo: 'reais' | 'percentual';
  descontoRaw: number;
  descontoValor: number;
  total: number;
  createdAt?: string | Date | null;
};

export function buildOrcamentoPrintHtml(orcamento: OrcamentoPrintInput): string {
  const created = orcamento.createdAt
    ? new Date(orcamento.createdAt).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const rows = orcamento.itens
    .map(
      (item) => `
                  <tr>
                    <td>${esc(item.produto)}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.precoUnitario.toFixed(2)}</td>
                    <td>R$ ${item.subtotal.toFixed(2)}</td>
                  </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Orçamento - MACOFEL</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
      .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
      .header h1 { color: #dc2626; margin: 0; font-size: 32px; }
      .header p { margin: 5px 0; color: #666; }
      .info-section { margin-bottom: 30px; }
      .info-section h2 {
        color: #dc2626; font-size: 18px; margin-bottom: 10px;
        border-bottom: 2px solid #eee; padding-bottom: 5px;
      }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background-color: #dc2626; color: white; padding: 12px; text-align: left; font-weight: bold; }
      td { padding: 10px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: bold; }
      .total-value { color: #dc2626; font-size: 24px; }
      .totals { text-align: right; margin-top: 20px; }
      .total-line { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 6px; font-size: 14px; }
      .observacoes { margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #dc2626; }
      .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>MACOFEL</h1>
      <p>Materiais para Construção</p>
      <p>Av. São Paulo, 699 - Centro, Parapuã - SP</p>
      <p>Tel: (18) 99814-5495</p>
    </div>

    <div class="info-section">
      <h2>Dados do Cliente</h2>
      <p><strong>Nome:</strong> ${esc(orcamento.clienteNome)}</p>
      ${orcamento.clienteEmail ? `<p><strong>Email:</strong> ${esc(orcamento.clienteEmail)}</p>` : ''}
      ${orcamento.clienteTelefone ? `<p><strong>Telefone:</strong> ${esc(orcamento.clienteTelefone)}</p>` : ''}
      <p><strong>Data:</strong> ${esc(created)}</p>
    </div>

    <div class="info-section">
      <h2>Itens do Orçamento</h2>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Preço Unitário</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-line"><span>Subtotal:</span><span>R$ ${orcamento.subtotal.toFixed(2)}</span></div>
        ${
          orcamento.freteValor > 0
            ? `<div class="total-line"><span>Frete:</span><span>R$ ${orcamento.freteValor.toFixed(2)}</span></div>`
            : ''
        }
        ${
          orcamento.descontoValor > 0
            ? `<div class="total-line"><span>Desconto: ${
                orcamento.descontoTipo === 'percentual'
                  ? orcamento.descontoRaw + '%'
                  : 'R$ ' + orcamento.descontoRaw.toFixed(2)
              }</span><span>- R$ ${orcamento.descontoValor.toFixed(2)}</span></div>`
            : ''
        }
        <div class="total">
          <span>Total: <span class="total-value">R$ ${orcamento.total.toFixed(2)}</span></span>
        </div>
      </div>
    </div>

    ${
      orcamento.observacoes
        ? `
    <div class="observacoes">
      <strong>Observações:</strong>
      <p>${esc(orcamento.observacoes)}</p>
    </div>`
        : ''
    }

    <div class="footer">
      <p>Este orçamento é válido por 30 dias a partir da data de emissão.</p>
      <p>MACOFEL - Materiais para Construção | CNPJ: XX.XXX.XXX/XXXX-XX</p>
    </div>
  </body>
</html>`;
}
