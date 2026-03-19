'use client';

import { Truck, MessageCircle, CreditCard, ShieldCheck } from 'lucide-react';

export default function StoreServiceBadges() {
  return (
    <div className="bg-white py-4 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <Truck className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-gray-700">Entrega rápida</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">Envie sua lista de materiais</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-gray-700">Desconto no Pix</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">Fale pelo WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
}
