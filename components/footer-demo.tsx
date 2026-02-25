import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, Instagram, Linkedin, Facebook, Send } from 'lucide-react';

export default function FooterDemo() {
  return (
    <footer className="bg-white pt-20 border-t border-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-20">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-8">
              <span className="text-2xl font-bold tracking-tighter italic">
                Macofel<span className="text-red-600">.</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Especialistas em materiais de construção e engenharia desde 1998. Tradição em servir bem quem constrói o país.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full hover:bg-red-600 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full hover:bg-red-600 hover:text-white transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full hover:bg-red-600 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-slate-900">E-Commerce</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <li><Link href="/perfil" className="hover:text-red-600 transition-colors">Conta Cliente</Link></li>
              <li><Link href="/carrinho" className="hover:text-red-600 transition-colors">Carrinho de Compras</Link></li>
              <li><Link href="/meus-pedidos" className="hover:text-red-600 transition-colors">Histórico de Pedidos</Link></li>
              <li><Link href="#" className="hover:text-red-600 transition-colors">Termos de Venda</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-slate-900">Empresa</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <li><Link href="#" className="hover:text-red-600 transition-colors">Sobre Nós</Link></li>
              <li><Link href="#" className="hover:text-red-600 transition-colors">Contatos em Loja</Link></li>
              <li><Link href="#" className="hover:text-red-600 transition-colors">Trabalhe Conosco</Link></li>
              <li><Link href="#" className="hover:text-red-600 transition-colors">Portal do Fornecedor</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-slate-900">Newsletter</h4>
            <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-widest">Receba ofertas exclusivas para profissionais.</p>
            <form className="flex gap-2" action="/api/newsletter" method="POST">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 text-xs rounded-lg focus:ring-1 focus:ring-red-600 outline-none"
                required
              />
              <button
                type="submit"
                className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
        
        <div className="py-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            © 2026 MACOFEL - MATERIAIS PARA CONSTRUÇÃO, LDA. DESENVOLVIDO POR ALDEBARAN.
          </p>
          <div className="flex items-center gap-6">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 opacity-30" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 opacity-30" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-3 opacity-30" />
          </div>
        </div>
      </div>
    </footer>
  );
}
