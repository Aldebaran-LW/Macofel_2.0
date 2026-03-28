/**
 * Limite de upload para importações admin (Excel/PDF de catálogo, extração de PDF no estoque).
 *
 * Em hospedagem Vercel (plano Hobby), o corpo do pedido para Serverless costuma ficar ~4.5 MB;
 * ficheiros maiores normalmente exigem VPS, upload direto a storage (Blob/S3) ou plano superior.
 */
export const MAX_IMPORT_FILE_BYTES = 100 * 1024 * 1024;

export const MAX_IMPORT_FILE_DESC = '100 MB';

export function importFileTooLarge(file: Blob): boolean {
  return file.size > MAX_IMPORT_FILE_BYTES;
}
