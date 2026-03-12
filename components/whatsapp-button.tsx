'use client';

import { useState } from 'react';
import { X, MessageCircle, Send } from 'lucide-react';

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false);

  const whatsappNumber = '5518998145495';
  const defaultMessage = encodeURIComponent(
    'Olá! Vim pelo site da MACOFEL e gostaria de mais informações.'
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${defaultMessage}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat bubble */}
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-slate-100 w-[280px] overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">MACOFEL</p>
                <p className="text-white/80 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
                  Online agora
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat preview */}
          <div className="p-4 bg-[#e5ddd5] min-h-[100px]">
            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[85%]">
              <p className="text-sm text-slate-700 leading-relaxed">
                👋 Olá! Seja bem-vindo à <strong>MACOFEL</strong>. Em que posso ajudar você hoje?
              </p>
              <p className="text-[10px] text-slate-400 text-right mt-1">Agora</p>
            </div>
          </div>

          {/* CTA */}
          <div className="p-4 bg-white">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-sm py-3 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              Iniciar Conversa
            </a>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-[#25D366] hover:bg-[#20b858] text-white rounded-full shadow-xl shadow-[#25D366]/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="WhatsApp"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
