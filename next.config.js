const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  /** Evita reempacotar pdfjs no Webpack (corrige "Object.defineProperty called on non-object" em dev). */
  serverExternalPackages: ['pdfjs-dist'],
  // Removido outputFileTracingRoot experimental que causa erro routes-manifest.json na Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  /** Permite FormData/body maiores em Server Actions e alinha com importações grandes (VPS/self-hosted). */
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
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
