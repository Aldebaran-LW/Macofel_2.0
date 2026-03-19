'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // next-auth já deve ter feito o logout; aqui só redirecionamos para a homepage.
    router.replace('/');
  }, [router]);

  return null;
}

