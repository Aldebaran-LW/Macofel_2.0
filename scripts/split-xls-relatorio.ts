/**
 * Divide um relatório .xls/.xlsx grande em vários .xlsx (cabeçalho repetido + blocos de linhas)
 * para importar no admin com limite de tamanho (browser / Vercel).
 *
 * Uso (na pasta do projeto):
 *   npx tsx scripts/split-xls-relatorio.ts "E:\Relatorio de Produtos Codigo de Barras.xls" 10 "E:\Produtos exel"
 *
 * - partes: número de ficheiros (predefinido 10)
 * - pasta_saída: opcional; predefinido = pasta do ficheiro de entrada
 *
 * Usa a primeira folha com cabeçalho «Relação de estoque» (Produto, Grupo, Marca, Estoque…),
 * igual ao import do painel. Importe cada `*_part01.xlsx` … em sequência (upsert).
 *
 * Saída em .xlsx (mesmo com entrada .xls). Se o .xls falhar no SheetJS, tenta-se (Windows):
 * 1) LibreOffice em modo headless (`soffice --convert-to xlsx`), se existir;
 * 2) Microsoft Excel (COM via PowerShell);
 * 3) Microsoft Excel (COM via cscript + VBScript).
 * Se tudo falhar: abra no Excel/LibreOffice, guarde como .xlsx e volte a correr o script com o .xlsx.
 *
 * Variáveis de ambiente opcionais (LibreOffice fora de Program Files):
 * - MACOFEL_SOFFICE — caminho completo de soffice.exe ou soffice.com
 * - MACOFEL_LIBREOFFICE_HOME — pasta raiz com subpastas program, share, help… (ex.: D:\\Programas → usa program\\soffice.exe)
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';
import { findRelatorioEstoqueHeaderRowIndex } from '../lib/relatorio-estoque-xls';

/** xlOpenXMLWorkbook — grava .xlsx via COM (fallback quando o SheetJS falha em certos .xls). */
const XL_OPEN_XML_WORKBOOK = 51;

/** xlUpdateLinksNever — evita prompts ao abrir. */
const XL_UPDATE_LINKS_NEVER = 3;

/**
 * Resolve MACOFEL_SOFFICE: ficheiro em falta, pasta `program`, ou só `soffice.exe` em vez de `.com`.
 */
function resolveExplicitSofficePath(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (fs.existsSync(t) && !fs.statSync(t).isDirectory()) return path.resolve(t);

  const asDir = fs.existsSync(t) && fs.statSync(t).isDirectory() ? path.resolve(t) : null;
  const dir = asDir ?? path.resolve(path.dirname(t));
  const candidates = [
    path.join(dir, 'soffice.com'),
    path.join(dir, 'soffice.exe'),
    asDir ? path.join(asDir, 'program', 'soffice.com') : '',
    asDir ? path.join(asDir, 'program', 'soffice.exe') : '',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(c) && !fs.statSync(c).isDirectory()) return c;
  }
  return null;
}

function findLibreOfficeSoffice(): string | null {
  const envPath = process.env['MACOFEL_SOFFICE']?.trim();
  if (envPath) {
    const resolved = resolveExplicitSofficePath(envPath);
    if (resolved) return resolved;
    console.warn(
      `[split-xls-relatorio] MACOFEL_SOFFICE aponta para um sítio onde não há LibreOffice:\n` +
        `  "${envPath}"\n` +
        `  Confirme no Explorador: pasta típica é "C:\\Program Files\\LibreOffice\\program\\" com soffice.exe.\n` +
        `  (Às vezes está em "Program Files (x86)" ou "LibreOffice 25.x".) A procurar noutros sítios…`
    );
  }

  const loHome = process.env['MACOFEL_LIBREOFFICE_HOME']?.trim();
  if (loHome) {
    const homeResolved = path.resolve(loHome);
    for (const name of ['soffice.com', 'soffice.exe'] as const) {
      const inProgram = path.join(homeResolved, 'program', name);
      if (fs.existsSync(inProgram) && !fs.statSync(inProgram).isDirectory()) return inProgram;
    }
    console.warn(
      `[split-xls-relatorio] MACOFEL_LIBREOFFICE_HOME="${loHome}" — não encontrei program\\soffice.exe nem soffice.com nessa pasta.`
    );
  }

  const roots = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean) as string[];
  for (const root of roots) {
    const fixed = path.join(root, 'LibreOffice', 'program', 'soffice.com');
    if (fs.existsSync(fixed)) return fixed;
    const fixedExe = path.join(root, 'LibreOffice', 'program', 'soffice.exe');
    if (fs.existsSync(fixedExe)) return fixedExe;
    try {
      for (const name of fs.readdirSync(root)) {
        if (!/^LibreOffice/i.test(name)) continue;
        const com = path.join(root, name, 'program', 'soffice.com');
        if (fs.existsSync(com)) return com;
        const exe = path.join(root, name, 'program', 'soffice.exe');
        if (fs.existsSync(exe)) return exe;
      }
    } catch {
      /* ignore */
    }
  }
  try {
    execFileSync('where.exe', ['soffice'], { stdio: 'ignore' });
    return 'soffice';
  } catch {
    return null;
  }
}

/** Converte .xls → .xlsx com LibreOffice (muitas exportações LW abrem aqui quando o SheetJS falha). */
function convertXlsViaLibreOffice(resolvedIn: string): Buffer {
  const soffice = findLibreOfficeSoffice();
  if (!soffice) {
    const hint = process.env['MACOFEL_SOFFICE']?.trim()
      ? ` O valor actual de MACOFEL_SOFFICE não corresponde a um ficheiro real — corrija o caminho ou instale o LibreOffice.`
      : '';
    throw new Error(
      'LibreOffice não encontrado (soffice.exe / soffice.com). Defina um destes:\n' +
        '  MACOFEL_SOFFICE=C:\\…\\program\\soffice.exe\n' +
        '  MACOFEL_LIBREOFFICE_HOME=D:\\Programas   (se tiver pastas program, share, help na raiz)\n' +
        'Exemplo clássico: C:\\Program Files\\LibreOffice\\program\\soffice.exe' +
        hint
    );
  }
  const outDir = path.join(os.tmpdir(), `macofel-lo-${process.pid}-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync(
      soffice,
      ['--headless', '--nologo', '--nofirststartwizard', '--convert-to', 'xlsx', '--outdir', outDir, resolvedIn],
      { stdio: 'inherit' }
    );
    const base = path.basename(resolvedIn, path.extname(resolvedIn));
    const outXlsx = path.join(outDir, `${base}.xlsx`);
    if (!fs.existsSync(outXlsx)) {
      throw new Error(`Esperado: ${outXlsx}`);
    }
    return fs.readFileSync(outXlsx);
  } finally {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function rowAsArray(row: unknown): string[] {
  if (!row || !Array.isArray(row)) return [];
  return row.map((c) => String(c ?? '').trim());
}

/** Em Windows, `mkdir` na raiz da unidade (ex.: `E:\`) dá EPERM — a pasta já “existe”. */
function ensureOutputDir(dir: string): void {
  const resolved = path.resolve(dir);
  if (process.platform === 'win32') {
    const norm = resolved.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\/?$/i.test(norm)) return;
  }
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

function pickSheetWithHeader(wb: XLSX.WorkBook): {
  sheetName: string;
  rows: string[][];
  headerIdx: number;
} | null {
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
    const rows = matrix.map((r) => rowAsArray(r));
    const headerIdx = findRelatorioEstoqueHeaderRowIndex(rows);
    if (headerIdx >= 0) return { sheetName, rows, headerIdx };
  }
  return null;
}

/** msoAutomationSecurityForceDisable — reduz bloqueios de macros ao abrir por COM. */
const MSO_AUTOMATION_SECURITY_FORCE_DISABLE = 3;

/** xlRepairFile / xlExtractData — último parâmetro de Workbooks.Open (CorruptLoad). */
const XL_CORRUPT_REPAIR = 1;
const XL_CORRUPT_EXTRACT_DATA = 2;

function powershellExeCandidates(): string[] {
  const root = process.env['SystemRoot'] || process.env['windir'];
  const list: string[] = [];
  if (root) {
    const wow = path.join(root, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const sys = path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    if (fs.existsSync(wow)) list.push(wow);
    if (fs.existsSync(sys)) list.push(sys);
  }
  list.push('powershell.exe');
  return [...new Set(list)];
}

/**
 * Fallback quando PowerShell falha: VBScript + cscript usa o mesmo COM mas com menos «magia»
 * nos parâmetros de Workbooks.Open (útil em alguns Excel PT-BR / Click-to-Run).
 */
function convertXlsViaExcelVbs(resolvedIn: string): Buffer {
  const outXlsx = path.join(
    os.tmpdir(),
    `macofel-split-xls-vbs-${process.pid}-${Date.now()}.xlsx`
  );
  const vbsPath = path.join(os.tmpdir(), `macofel-split-xls-${process.pid}.vbs`);
  const vbsBody = `Option Explicit
Dim excelApp, wb
Dim pathIn, pathOut
pathIn = WScript.Arguments(0)
pathOut = WScript.Arguments(1)
Set excelApp = CreateObject("Excel.Application")
excelApp.Visible = False
excelApp.DisplayAlerts = False
Set wb = excelApp.Workbooks.Open(pathIn)
wb.SaveAs pathOut, 51
wb.Close False
excelApp.Quit
`;
  fs.writeFileSync(vbsPath, vbsBody, 'utf8');
  const systemRoot = process.env['SystemRoot'] || process.env['windir'] || 'C:\\Windows';
  const cscript = path.join(systemRoot, 'System32', 'cscript.exe');
  try {
    if (!fs.existsSync(cscript)) {
      throw new Error(`cscript.exe não encontrado em ${cscript}`);
    }
    execFileSync(cscript, ['//NoLogo', '//B', vbsPath, resolvedIn, outXlsx], {
      stdio: 'inherit',
    });
  } finally {
    try {
      fs.unlinkSync(vbsPath);
    } catch {
      /* ignore */
    }
  }
  if (!fs.existsSync(outXlsx)) {
    throw new Error('VBScript não criou o .xlsx temporário.');
  }
  const converted = fs.readFileSync(outXlsx);
  try {
    fs.unlinkSync(outXlsx);
  } catch {
    /* ignore */
  }
  return converted;
}

function convertXlsViaExcelCom(resolvedIn: string): Buffer {
  const outXlsx = path.join(
    os.tmpdir(),
    `macofel-split-xls-${process.pid}-${Date.now()}.xlsx`
  );
  const ps1 = path.join(os.tmpdir(), `macofel-split-xls-${process.pid}.ps1`);
  const inEsc = resolvedIn.replace(/'/g, "''");
  const outEsc = outXlsx.replace(/'/g, "''");
  const psBody = `$ErrorActionPreference = 'Stop'
$excel = $null
$wb = $null
try {
  $pathIn = (Get-Item -LiteralPath '${inEsc}').FullName
  $pathOut = '${outEsc}'
  $dir = [System.IO.Path]::GetDirectoryName($pathIn)
  if ($dir) { Set-Location -LiteralPath $dir }

  $excel = New-Object -ComObject Excel.Application
  $excel.DisplayAlerts = $false
  $excel.Visible = $false
  try { $excel.AutomationSecurity = ${MSO_AUTOMATION_SECURITY_FORCE_DISABLE} } catch {}
  Start-Sleep -Milliseconds 500

  $m = [Type]::Missing
  $lastErr = $null
  $openAttempts = @(
    { $excel.Workbooks.Open($pathIn) },
    { $excel.Workbooks.Open($pathIn, ${XL_UPDATE_LINKS_NEVER}, $true) },
    { $excel.Workbooks.Open($pathIn, 0, $true) },
    { $excel.Workbooks.Open($pathIn, $m, $true) },
    { $excel.Workbooks.Open($pathIn, ${XL_UPDATE_LINKS_NEVER}, $true, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, ${XL_CORRUPT_REPAIR}) },
    { $excel.Workbooks.Open($pathIn, ${XL_UPDATE_LINKS_NEVER}, $true, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, ${XL_CORRUPT_EXTRACT_DATA}) }
  )
  foreach ($op in $openAttempts) {
    try {
      $wb = & $op
      if ($null -ne $wb) { break }
    } catch {
      $lastErr = $_
      $wb = $null
    }
  }

  if ($null -eq $wb) {
    if ($null -ne $lastErr) { throw $lastErr }
    throw 'Workbooks.Open devolveu vazio.'
  }

  $wb.SaveAs($pathOut, ${XL_OPEN_XML_WORKBOOK})
  $wb.Close($false)
  $wb = $null
} finally {
  if ($null -ne $wb) { try { $wb.Close($false) } catch {} }
  if ($null -ne $excel) {
    $excel.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
}
`;
  fs.writeFileSync(ps1, psBody, 'utf8');
  try {
    let lastShellErr: unknown;
    for (const pwsh of powershellExeCandidates()) {
      if (pwsh !== 'powershell.exe' && !fs.existsSync(pwsh)) continue;
      try {
        execFileSync(pwsh, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
          stdio: 'inherit',
        });
        lastShellErr = undefined;
        break;
      } catch (e) {
        lastShellErr = e;
        console.warn('PowerShell COM falhou com:', pwsh);
      }
    }
    if (lastShellErr) throw lastShellErr;
  } finally {
    try {
      fs.unlinkSync(ps1);
    } catch {
      /* ignore */
    }
  }
  if (!fs.existsSync(outXlsx)) {
    throw new Error('Excel COM não criou o .xlsx temporário.');
  }
  const converted = fs.readFileSync(outXlsx);
  try {
    fs.unlinkSync(outXlsx);
  } catch {
    /* ignore */
  }
  return converted;
}

/**
 * Alguns .xls (ex.: exportações LW) geram registo BIFF LabelSst truncado e o `xlsx` falha.
 * No Windows tenta LibreOffice e depois Excel COM.
 */
function readWorkbookFromPath(resolvedIn: string): XLSX.WorkBook {
  const buf = fs.readFileSync(resolvedIn);
  const ext = path.extname(resolvedIn).toLowerCase();
  try {
    return XLSX.read(buf, { type: 'buffer' });
  } catch (first) {
    const isLegacyXls = process.platform === 'win32' && ext === '.xls';
    if (!isLegacyXls) throw first;

    const msg = first instanceof Error ? first.message : String(first);
    console.warn('Leitura directa do .xls falhou:', msg);

    console.warn('A tentar conversão com LibreOffice (soffice)…');
    try {
      const converted = convertXlsViaLibreOffice(resolvedIn);
      return XLSX.read(converted, { type: 'buffer' });
    } catch (lo: unknown) {
      console.warn('LibreOffice:', lo instanceof Error ? lo.message : lo);
    }

    console.warn('A tentar conversão com Microsoft Excel (COM via PowerShell)…');
    try {
      const converted = convertXlsViaExcelCom(resolvedIn);
      return XLSX.read(converted, { type: 'buffer' });
    } catch (com: unknown) {
      console.warn('PowerShell/COM:', com instanceof Error ? com.message : com);
    }

    console.warn('A tentar conversão com Microsoft Excel (COM via cscript + VBScript)…');
    try {
      const converted = convertXlsViaExcelVbs(resolvedIn);
      return XLSX.read(converted, { type: 'buffer' });
    } catch (vbs: unknown) {
      const extra = vbs instanceof Error ? vbs.message : String(vbs);
      throw new Error(
        `Não foi possível ler o .xls automaticamente (SheetJS, LibreOffice, Excel COM PowerShell e Excel COM VBScript).\n` +
          `Último erro: ${extra}\n\n` +
          `Causas frequentes no Windows:\n` +
          `• Excel da Microsoft Store em geral não expõe automação COM — instale o Excel «de secretária» (Microsoft 365 / Office clássico).\n` +
          `• «Não é possível obter a propriedade Open» com Excel instalado: feche todas as instâncias do Excel, ou repare a instalação do Office.\n` +
          `• O ficheiro pode estar corrompido ou num BIFF que só o LW abre — tente abrir no Excel/LibreOffice manualmente.\n\n` +
          `Opções práticas:\n` +
          `(1) Instale o LibreOffice e defina MACOFEL_SOFFICE (ex.: C:\\Program Files\\LibreOffice\\program\\soffice.com), ou winget install TheDocumentFoundation.LibreOffice\n` +
          `(2) Abra o .xls no Excel de secretária, «Guardar como» .xlsx, e corra este script com o .xlsx.\n` +
          `(3) Exporte de novo no LW ou use RTF → split-rtf-relatorio → .txt para importar no painel.`
      );
    }
  }
}

function main() {
  const inputPath = process.argv[2];
  const partsArg = process.argv[3];
  const outDirArg = process.argv[4];

  if (!inputPath) {
    console.error(
      'Uso: npx tsx scripts/split-xls-relatorio.ts "E:\\Relatorio.xls" [partes=10] [pasta_saída]'
    );
    process.exit(1);
  }

  const resolvedIn = path.resolve(inputPath);
  if (!fs.existsSync(resolvedIn)) {
    console.error('Ficheiro não encontrado:', resolvedIn);
    process.exit(1);
  }

  const parts = Math.max(2, Math.min(100, parseInt(partsArg || '10', 10) || 10));
  const outDir = outDirArg ? path.resolve(outDirArg) : path.dirname(resolvedIn);
  ensureOutputDir(outDir);

  let wb: XLSX.WorkBook;
  try {
    wb = readWorkbookFromPath(resolvedIn);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
  const picked = pickSheetWithHeader(wb);
  if (!picked) {
    console.error('Nenhuma folha com cabeçalho esperado (Produto, Grupo, Marca, Estoque).');
    process.exit(1);
  }

  const { sheetName, rows, headerIdx } = picked;
  const preamble = rows.slice(0, headerIdx + 1);
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.some((c) => String(c ?? '').trim()));

  if (dataRows.length === 0) {
    console.error('Nenhuma linha de dados após o cabeçalho na folha:', sheetName);
    process.exit(1);
  }

  const chunkSize = Math.ceil(dataRows.length / parts);
  const base = path.basename(resolvedIn, path.extname(resolvedIn));
  const safeSheet = sheetName.slice(0, 31) || 'Dados';

  console.log(
    'Folha:',
    sheetName,
    '| Linhas de dados:',
    dataRows.length,
    '→',
    parts,
    'partes (~',
    chunkSize,
    'linhas cada)'
  );

  let written = 0;
  for (let p = 0; p < parts; p++) {
    const start = p * chunkSize;
    const chunk = dataRows.slice(start, start + chunkSize);
    if (chunk.length === 0) break;

    const aoa = [...preamble, ...chunk];
    const newSheet = XLSX.utils.aoa_to_sheet(aoa);
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newSheet, safeSheet);
    const name = `${base}_part${String(p + 1).padStart(2, '0')}.xlsx`;
    const outPath = path.join(outDir, name);
    XLSX.writeFile(newWb, outPath, { bookType: 'xlsx' });
    console.log(outPath, '→', aoa.length, 'linhas');
    written += 1;
  }

  console.log('Concluído:', written, 'ficheiro(s) em', outDir);
}

main();
