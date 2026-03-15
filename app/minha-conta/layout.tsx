import ClientSidebar from '@/components/client-sidebar';
import { Toaster } from 'sonner';

export default function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
