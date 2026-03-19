'use client';

import Link from 'next/link';

export default function StoreFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black">
                MACO<span className="text-red-500">FEL</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Materiais para Construção de qualidade em Parapuã e região.
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>📍 Av. São Paulo, 699 - Centro</p>
              <p>Parapuã - SP, 17730-000</p>
              <p>📞 (18) 99814-5495</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Institucional</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white">Sobre nós</Link></li>
              <li><Link href="#" className="hover:text-white">Política de Privacidade</Link></li>
              <li><Link href="#" className="hover:text-white">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-white">Fale Conosco</Link></li>
              <li><Link href="#" className="hover:text-white">Trocas e Devoluções</Link></li>
              <li><Link href="/meus-pedidos" className="hover:text-white">Meus Pedidos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Formas de Pagamento</h4>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Visa</span>
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Master</span>
              <span className="bg-green-600 px-3 py-1 rounded text-xs">Pix</span>
              <span className="bg-white/10 px-3 py-1 rounded text-xs">Boleto</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          <p>© 2026 MACOFEL - Materiais para Construção. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
