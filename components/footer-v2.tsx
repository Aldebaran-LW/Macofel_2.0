import Link from 'next/link';
import {
  MapPin,
  Clock,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Send,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
} from 'lucide-react';

export default function FooterV2() {
  return (
    <footer className="bg-slate-950 text-white">
      {/* Trust Bar */}
      <div className="border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: <Truck className="w-6 h-6 text-red-500" />,
                title: 'Entrega Rápida',
                sub: 'Em 24h ou 48h na obra',
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-red-500" />,
                title: 'Compra Segura',
                sub: 'Dados protegidos e criptografados',
              },
              {
                icon: <RotateCcw className="w-6 h-6 text-red-500" />,
                title: 'Troca Garantida',
                sub: 'Até 30 dias após a entrega',
              },
              {
                icon: <CreditCard className="w-6 h-6 text-red-500" />,
                title: 'Pague como preferir',
                sub: 'Pix, cartão, boleto e mais',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
                <span className="text-white font-black text-lg italic">M</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-2xl font-black tracking-tighter italic text-white">
                  MACO<span className="text-red-500">FEL</span>
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                  Materiais para Construção
                </span>
              </div>
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
              Desde 1998 construindo relações de confiança com profissionais da construção civil em
              todo o Brasil. Qualidade e tradição em cada entrega.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-8">
              <a
                href="tel:+5518998145495"
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-white/5 group-hover:bg-red-600/20 rounded-lg flex items-center justify-center transition-colors">
                  <Phone className="w-4 h-4 text-red-500" />
                </div>
                (18) 99814-5495
              </a>
              <a
                href="mailto:contato@macofel.com.br"
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-white/5 group-hover:bg-red-600/20 rounded-lg flex items-center justify-center transition-colors">
                  <Mail className="w-4 h-4 text-red-500" />
                </div>
                contato@macofel.com.br
              </a>
              <div className="flex items-start gap-3 text-sm text-slate-400">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-red-500" />
                </div>
                <span>Av. São Paulo, 699 - Centro, Parapuã - SP, 17730-000</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                Seg–Sex: 08:00–18:00 | Sáb: 08:00–13:00
              </div>
            </div>

            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: <Instagram className="w-4 h-4" />, href: '#', label: 'Instagram' },
                { icon: <Facebook className="w-4 h-4" />, href: '#', label: 'Facebook' },
                { icon: <Linkedin className="w-4 h-4" />, href: '#', label: 'LinkedIn' },
                { icon: <Youtube className="w-4 h-4" />, href: '#', label: 'YouTube' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 bg-white/5 hover:bg-red-600 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links - E-Commerce */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-6">
              Minha Conta
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Fazer Login', href: '/login' },
                { label: 'Criar Conta', href: '/cadastro' },
                { label: 'Meu Carrinho', href: '/carrinho' },
                { label: 'Meus Pedidos', href: '/meus-pedidos' },
                { label: 'Meu Perfil', href: '/perfil' },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Empresa */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-6">
              Empresa
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Sobre a MACOFEL', href: '#' },
                { label: 'Catálogo Completo', href: '/catalogo' },
                { label: 'Orçamento Especial', href: '#' },
                { label: 'Trabalhe Conosco', href: '#' },
                { label: 'Portal do Fornecedor', href: '#' },
                { label: 'Política de Privacidade', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-6">
              Newsletter Pro
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Receba ofertas exclusivas, novos produtos e dicas técnicas diretamente no seu e-mail.
            </p>
            <form action="/api/newsletter" method="POST" className="space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Seu melhor e-mail"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all"
              />
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Quero Receber Ofertas
              </button>
            </form>
            <p className="text-[10px] text-slate-600 mt-3">
              🔒 Seus dados estão seguros. Cancele quando quiser.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
            © 2026 MACOFEL — MATERIAIS PARA CONSTRUÇÃO, LTDA. TODOS OS DIREITOS RESERVADOS.
          </p>
          <div className="flex items-center gap-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
              alt="Visa"
              className="h-4 opacity-25 brightness-0 invert"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
              alt="Mastercard"
              className="h-5 opacity-25"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
              alt="PayPal"
              className="h-4 opacity-25 brightness-0 invert"
            />
            <div className="text-[10px] font-black bg-green-500/20 text-green-400 px-2 py-1 rounded-md uppercase tracking-wider">
              Pix
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
