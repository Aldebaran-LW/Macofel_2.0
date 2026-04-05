'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Rocket, Loader2, FileText } from 'lucide-react';
import { upload } from '@vercel/blob/client';

/** Mesmo id em `stock-importer.tsx` no cartão da importação clássica. */
export const IMPORTACAO_ESTOQUE_CLASSICA_ID = 'importacao-estoque-classica';

export default function ImportacaoEstoqueModal() {
  const [uploading, setUploading] = useState(false);

  const handleImportWithBackgroundAI = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      toast.error('Selecione um arquivo Excel ou PDF');
      return;
    }

    setUploading(true);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'private',
        handleUploadUrl: '/api/admin/catalog/blob-client-upload',
        multipart: file.size > 4.5 * 1024 * 1024,
      });

      const response = await fetch('/api/admin/catalog/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileUrl: newBlob.url,
          fileName: file.name,
          importType: 'full-catalog-with-background-enrich',
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg =
          errBody && typeof errBody.error === 'string' ? errBody.error : 'Falha ao iniciar importação';
        throw new Error(msg);
      }

      toast.success(
        '✅ Importação rápida concluída! Enriquecimento IA iniciado em segundo plano.'
      );
      window.location.href = '/admin/estoque/produtos-pendentes';
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro no upload. Tente novamente.');
    } finally {
      setUploading(false);
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
    <form onSubmit={handleImportWithBackgroundAI} className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700">
          <Rocket className="h-5 w-5" />
          Importar com Enriquecimento IA em Background
        </h3>
        <p className="text-sm text-amber-600 mt-2">
          O ficheiro sobe para o Blob da Vercel; este servidor faz a extração (Excel/PDF) e grava no MongoDB.
          O Gemini enriquece em segundo plano. Produtos já cadastrados (mesmo código) são atualizados e
          enfileirados para IA — sem duplicar <code className="text-xs">codigo</code>.
          <br />
          <span className="text-xs">
            Não usa o agente Python no Render neste botão. Você pode continuar usando o sistema enquanto a IA
            roda.
          </span>
        </p>
      </div>

      <div>
        <label htmlFor="importacao-estoque-file" className="text-sm font-medium text-foreground">
          Ficheiro (Excel ou PDF)
        </label>
        <input
          id="importacao-estoque-file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.pdf"
          disabled={uploading}
          className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando e iniciando processamento...
          </>
        ) : (
          <>
            <Rocket className="mr-2 h-5 w-5" />
            Importar com Enriquecimento IA em Background
          </>
        )}
      </Button>

      <Button type="button" variant="outline" className="w-full" onClick={scrollToClassic}>
        <FileText className="mr-2 h-4 w-4" />
        Importar normalmente (sem IA)
      </Button>
    </form>
  );
}
