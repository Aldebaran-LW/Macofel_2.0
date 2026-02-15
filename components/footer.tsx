import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, Instagram, Linkedin, Facebook, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white pt-24 pb-12 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative h-12 w-auto">
                <Image
                  src="/logo-macofel.jpeg"
                  alt="Logo MACOFEL"
                  width={48}
                  height={48}
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-3xl font-black font-title tracking-tighter text-slate-900 italic uppercase">
                  MACO<span className="text-red-600">FEL</span>
                </span>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Desde 1998 a construir relações de confiança com os profissionais da construção em todo o país.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-lg hover:bg-red-600 transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-lg hover:bg-red-600 transition-all">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-lg hover:bg-red-600 transition-all">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Departamentos</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <li><Link href="/catalogo" className="hover:text-red-600 transition-colors">Venda a Grosso</Link></li>
              <li><Link href="/catalogo" className="hover:text-red-600 transition-colors">Retalho Técnico</Link></li>
              <li><Link href="#orcamento" className="hover:text-red-600 transition-colors">Logística Integrada</Link></li>
              <li><Link href="#orcamento" className="hover:text-red-600 transition-colors">Consultoria Técnica</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Onde Estamos</h4>
            <ul className="space-y-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Armazém Central - Zona Industrial</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Seg-Sex: 08:00 - 19:00</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Newsletter Profissional</h4>
            <form className="flex gap-2" action="/api/newsletter" method="POST">
              <input 
                type="email" 
                name="email"
                placeholder="Email" 
                className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-4 text-xs focus:ring-1 focus:ring-red-600 outline-none"
                required
              />
              <button 
                type="submit"
                className="bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-tighter">Ofertas exclusivas para profissionais cadastrados.</p>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">
          <p>&copy; 2026 MACOFEL - MATERIAIS PARA CONSTRUÇÃO, LDA. DESENVOLVIDO PARA PERFORMANCE.</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-red-600">Privacidade</Link>
            <Link href="#" className="hover:text-red-600">Certificações</Link>
            <Link href="#" className="hover:text-red-600">Brasil</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
