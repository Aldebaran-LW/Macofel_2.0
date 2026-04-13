/**
 * Leitura de .xls BIFF com fallback quando o SheetJS falha (ex.: LABELSST 0xfd truncado
 * em exportações LW). Reutilizado pela API de import e por `scripts/split-xls-relatorio.ts`.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';
import { MACOFEL_LIBREOFFICE_HOME, MACOFEL_SOFFICE } from '@/env';

/** Assinatura OLE — ficheiros .xls clássicos em contentor composto. */
export function looksLikeOleXlsBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

/** xlOpenXMLWorkbook — grava .xlsx via COM (fallback quando o SheetJS falha em certos .xls). */
const XL_OPEN_XML_WORKBOOK = 51;

/** xlUpdateLinksNever — evita prompts ao abrir. */
const XL_UPDATE_LINKS_NEVER = 3;

/** msoAutomationSecurityForceDisable — reduz bloqueios de macros ao abrir por COM. */
const MSO_AUTOMATION_SECURITY_FORCE_DISABLE = 3;

/** xlRepairFile / xlExtractData — último parâmetro de Workbooks.Open (CorruptLoad). */
const XL_CORRUPT_REPAIR = 1;
const XL_CORRUPT_EXTRACT_DATA = 2;

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
  const envPath = MACOFEL_SOFFICE;
  if (envPath) {
    const resolved = resolveExplicitSofficePath(envPath);
    if (resolved) return resolved;
    console.warn(
      `[xls-legacy-convert] MACOFEL_SOFFICE aponta para um sítio onde não há LibreOffice:\n` +
        `  "${envPath}"\n` +
        `  Confirme: pasta típica é "C:\\Program Files\\LibreOffice\\program\\" com soffice.exe.`
    );
  }

  const loHome = MACOFEL_LIBREOFFICE_HOME;
  if (loHome) {
    const homeResolved = path.resolve(loHome);
    for (const name of ['soffice.com', 'soffice.exe'] as const) {
      const inProgram = path.join(homeResolved, 'program', name);
      if (fs.existsSync(inProgram) && !fs.statSync(inProgram).isDirectory()) return inProgram;
    }
    console.warn(
      `[xls-legacy-convert] MACOFEL_LIBREOFFICE_HOME="${loHome}" — não encontrei program\\soffice.exe nem soffice.com.`
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
    /* Linux/macOS: tentar PATH */
  }
  try {
    execFileSync('which', ['soffice'], { stdio: 'pipe' });
    return 'soffice';
  } catch {
    return null;
  }
}

function convertXlsViaLibreOffice(resolvedIn: string): Buffer {
  const soffice = findLibreOfficeSoffice();
  if (!soffice) {
    const hint = MACOFEL_SOFFICE
      ? ` O valor actual de MACOFEL_SOFFICE não corresponde a um ficheiro real.`
      : '';
    throw new Error(
      'LibreOffice não encontrado (soffice). Defina MACOFEL_SOFFICE ou MACOFEL_LIBREOFFICE_HOME, ou instale o LibreOffice.' +
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

function convertXlsViaExcelVbs(resolvedIn: string): Buffer {
  const outXlsx = path.join(
    os.tmpdir(),
    `macofel-xls-vbs-${process.pid}-${Date.now()}.xlsx`
  );
  const vbsPath = path.join(os.tmpdir(), `macofel-xls-${process.pid}.vbs`);
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
    `macofel-xls-ps-${process.pid}-${Date.now()}.xlsx`
  );
  const ps1 = path.join(os.tmpdir(), `macofel-xls-${process.pid}.ps1`);
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
        console.warn('[xls-legacy-convert] PowerShell COM falhou com:', pwsh);
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
 * Lê um ficheiro .xls/.xlsx no disco; se for .xls e o SheetJS falhar, tenta LibreOffice e (Windows) Excel COM.
 */
export function readWorkbookFromLegacyXlsPath(resolvedPath: string): XLSX.WorkBook {
  const buf = fs.readFileSync(resolvedPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  try {
    return XLSX.read(buf, { type: 'buffer' });
  } catch (first) {
    const isLegacyXls = ext === '.xls';
    if (!isLegacyXls) throw first;

    const msg = first instanceof Error ? first.message : String(first);
    console.warn('[xls-legacy-convert] Leitura directa do .xls falhou:', msg);

    console.warn('[xls-legacy-convert] A tentar conversão com LibreOffice (soffice)…');
    try {
      const converted = convertXlsViaLibreOffice(resolvedPath);
      return XLSX.read(converted, { type: 'buffer' });
    } catch (lo: unknown) {
      console.warn('[xls-legacy-convert] LibreOffice:', lo instanceof Error ? lo.message : lo);
    }

    if (process.platform === 'win32') {
      console.warn('[xls-legacy-convert] A tentar conversão com Microsoft Excel (COM via PowerShell)…');
      try {
        const converted = convertXlsViaExcelCom(resolvedPath);
        return XLSX.read(converted, { type: 'buffer' });
      } catch (com: unknown) {
        console.warn('[xls-legacy-convert] PowerShell/COM:', com instanceof Error ? com.message : com);
      }

      console.warn('[xls-legacy-convert] A tentar conversão com Microsoft Excel (COM via cscript + VBScript)…');
      try {
        const converted = convertXlsViaExcelVbs(resolvedPath);
        return XLSX.read(converted, { type: 'buffer' });
      } catch (vbs: unknown) {
        const extra = vbs instanceof Error ? vbs.message : String(vbs);
        throw new Error(
          `Não foi possível ler o .xls (SheetJS, LibreOffice, Excel COM PowerShell e Excel COM VBScript).\n` +
            `Último erro: ${extra}\n\n` +
            `Causas frequentes no Windows:\n` +
            `• Excel da Microsoft Store em geral não expõe automação COM — use Excel de secretária ou LibreOffice.\n` +
            `• Ficheiro BIFF inválido (ex.: LABELSST truncado) — converta para .xlsx no Excel/LibreOffice.\n\n` +
            `Opções: instale LibreOffice e defina MACOFEL_SOFFICE; ou «Guardar como» .xlsx e volte a importar.`
        );
      }
    }

    throw new Error(
      `${msg}\n\n` +
        `Conversão LibreOffice falhou. Em Linux/macOS instale LibreOffice; em Windows pode também usar Excel de secretária para guardar como .xlsx.`
    );
  }
}

function sanitizeTempBaseName(originalName?: string): string {
  const base = path.basename(originalName || 'upload');
  const stem = path.basename(base, path.extname(base)) || 'upload';
  const safe = stem.replace(/[^\w.\-]+/g, '_').slice(0, 60);
  return safe || 'upload';
}

/**
 * Após `XLSX.read` falhar no buffer: grava .xls temporário e aplica a mesma cadeia de fallback que o script CLI.
 */
export function readWorkbookWithLegacyXlsFallback(buffer: Buffer, originalName?: string): XLSX.WorkBook {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'macofel-xls-upload-'));
  const xlsPath = path.join(dir, `${sanitizeTempBaseName(originalName)}.xls`);
  try {
    fs.writeFileSync(xlsPath, buffer);
    return readWorkbookFromLegacyXlsPath(xlsPath);
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
