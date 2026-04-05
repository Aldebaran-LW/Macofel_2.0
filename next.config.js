const path = require('path');

/**
 * `output: 'export'` (site estático) não funciona neste projeto (API routes, sessão, DB).
 * Com `NEXT_OUTPUT_MODE=export` o build falha: <Html> fora de _document em /404 e /500.
 * Na Render: não definas export — usa `npm start` após `npm run build`.
 */
function resolveOutputMode() {
  const v = (process.env.NEXT_OUTPUT_MODE || '').trim();
  if (v === 'standalone') return 'standalone';
  // 'export' e outros valores ignorados — ver comentário acima
  return undefined;
}

const resolvedOutput = resolveOutputMode();

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  ...(resolvedOutput ? { output: resolvedOutput } : {}),
  // Removido outputFileTracingRoot experimental que causa erro routes-manifest.json na Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  /** Next 14.2: use serverComponentsExternalPackages (serverExternalPackages é Next 15+). */
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
    /**
     * pdfjs-dist usa `import(workerSrc)` para o fake worker no Node; sem isto o ficheiro
     * não entra no bundle serverless (Vercel `/var/task`) e falha com ESM MODULE_NOT_FOUND.
     */
    outputFileTracingIncludes: {
      '/api/**': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      ],
    },
  },
  /** Defesa em profundidade (CHECKLIST_SEGURANCA Fase 4) — sem CSP estrita para não quebrar o app legacy. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
