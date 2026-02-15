import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 border-t border-gray-700">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Sobre */}
          <div>
            <h3 className="text-white font-bold text-2xl mb-4 bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
              MACOFEL
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Sua loja completa de materiais para construção. Qualidade e confiança há anos no mercado.
              Transforme seus projetos em realidade com os melhores produtos.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Links Rápidos</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm hover:text-red-400 transition-colors flex items-center group">
                  <span className="w-0 group-hover:w-2 h-0.5 bg-red-500 mr-0 group-hover:mr-2 transition-all duration-300"></span>
                  Início
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className="text-sm hover:text-red-400 transition-colors flex items-center group">
                  <span className="w-0 group-hover:w-2 h-0.5 bg-red-500 mr-0 group-hover:mr-2 transition-all duration-300"></span>
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm hover:text-red-400 transition-colors flex items-center group">
                  <span className="w-0 group-hover:w-2 h-0.5 bg-red-500 mr-0 group-hover:mr-2 transition-all duration-300"></span>
                  Entrar
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 group">
                <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">São Paulo, SP - Brasil</span>
              </li>
              <li className="flex items-center space-x-3 group">
                <Phone className="h-5 w-5 text-red-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">(11) 3333-3333</span>
              </li>
              <li className="flex items-center space-x-3 group">
                <Mail className="h-5 w-5 text-red-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">contato@macofel.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MACOFEL. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
