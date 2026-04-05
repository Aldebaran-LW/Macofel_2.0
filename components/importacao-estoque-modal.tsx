'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

/** Mesmo id em `stock-importer.tsx` no cartão da importação clássica. */
export const IMPORTACAO_ESTOQUE_CLASSICA_ID = 'importacao-estoque-classica';

export default function ImportacaoEstoqueModal() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportWithAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/catalog/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);

      if (!data) {
        toast.error('Resposta inválida do servidor');
        return;
      }

      if (data.success) {
        toast.success(data.message || 'Arquivo enviado para o agente IA!');
        setTimeout(() => {
          window.location.href = '/admin/estoque/produtos-pendentes';
        }, 1200);
      } else {
        toast.error(data.error || 'Erro ao enviar');
      }
    } catch {
      toast.error('Erro de conexão com o servidor');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const scrollToClassic = () => {
    toast.info('Importação clássica: use o formulário abaixo (CSV, XLSX, XML ou PDF).');
    document.getElementById(IMPORTACAO_ESTOQUE_CLASSICA_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border-2 border-primary rounded-2xl p-8 bg-primary/5">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Importar com Agente IA</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Envia Excel ou PDF para o agente Python no Render.
          <br />
          Faz extração automática + enriquecimento com Gemini (descrições SEO, títulos, atributos técnicos).
          <br />
          <strong className="text-amber-600">
            Os produtos ficam como &quot;pending_review&quot; para aprovação humana.
          </strong>
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.pdf"
          onChange={handleImportWithAI}
          disabled={uploading}
          className="hidden"
          aria-hidden
        />
        <Button
          type="button"
          size="lg"
          className="w-full h-14 text-lg"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>Enviando para o agente IA...</>
          ) : (
            <>🚀 Importar com Enriquecimento IA</>
          )}
        </Button>
      </div>

      <div className="border border-gray-200 rounded-2xl p-6">
        <h3 className="font-medium mb-3">Importar normalmente (sem IA)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Usa o fluxo antigo: prévia e ajuste de estoque (somar ou definir) a partir do ficheiro.
        </p>
        <Button variant="outline" className="w-full" onClick={scrollToClassic}>
          Importar direto (sistema antigo)
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          Arquivos grandes são processados no Render (sem limite de 4 MB do Vercel).
        </AlertDescription>
      </Alert>
    </div>
  );
}
