import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { PdvLojaShell } from './pdv-loja-shell';

export const metadata = {
  title: 'PDV — Loja | Macofel',
  robots: { index: false, follow: false },
};

export default async function LojaPdvPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== 'ADMIN') {
    redirect('/');
  }

  const apiKey = process.env.PDV_API_KEY;
  if (!apiKey) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-neutral-700">
        <p className="text-sm">
          A variável de ambiente <code className="rounded bg-neutral-100 px-1">PDV_API_KEY</code> não
          está definida no servidor.
        </p>
      </div>
    );
  }

  return <PdvLojaShell apiKey={apiKey} />;
}
