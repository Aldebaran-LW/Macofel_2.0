'use client';

import { MessageCircle } from 'lucide-react';

export default function StoreWhatsAppFloat() {
  return (
    <a
      href="https://wa.me/5518998145495?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20MACOFEL%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="font-bold text-sm">Fale conosco</span>
    </a>
  );
}
