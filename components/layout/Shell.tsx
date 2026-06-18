'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Shield, Trophy, BarChart3, Activity, Layout, ArrowRightLeft } from 'lucide-react';
import { LoginScreen } from './LoginScreen';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Plantilla', href: '/plantilla', icon: Users },
  { name: 'Pizarra Táctica', href: '/tactica', icon: Layout },
  { name: 'ABP', href: '/abp', icon: Shield },
  { name: 'Liga', href: '/liga', icon: Trophy },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'GPS', href: '/gps', icon: Activity },
  { name: 'Comparador', href: '/comparador', icon: ArrowRightLeft },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LoginScreen>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header fijo superior */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 shadow-lg shadow-green-500/5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block">indautxu_26_27</span>
            <span className="text-xs text-slate-400 block -mt-1">Gestión de Fútbol</span>
          </div>
        </div>

        {/* Navegación horizontal en Header para pantallas medianas/grandes */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 text-green-400 border border-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-green-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex flex-1">
        {/* Sidebar en Escritorio (Visible en md, colapsado/oculto en pantallas menores) */}
        <aside className="hidden md:flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/20 p-6 space-y-6">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Menú Principal
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-green-500/10 text-green-400 border border-green-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 transition-colors duration-200 ${
                        isActive ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Contenedor de Contenido Principal */}
        <main className="flex-1 px-4 py-8 md:p-8 pb-24 md:pb-8 transition-opacity duration-300">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      {/* Barra de pestañas inferior (Bottom Tab Bar) en móviles */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-around">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-colors duration-200 ${
                isActive ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
    </LoginScreen>
  );
}
