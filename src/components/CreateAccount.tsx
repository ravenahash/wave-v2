'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, UserCog, Home, Users, Wrench } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { isManager } from '@/lib/rbac';
import { AdministradorForm } from './create-account/AdministradorForm';
import { SindicoForm } from './create-account/SindicoForm';
import { MoradorForm } from './create-account/MoradorForm';
import { PrestadorForm } from './create-account/PrestadorForm';

type Aba = 'administrador' | 'sindico' | 'morador' | 'prestador';

const TABS: { id: Aba; label: string; icon: typeof UserCog }[] = [
  { id: 'morador', label: 'Moradores', icon: Home },
  { id: 'sindico', label: 'Síndicos', icon: Users },
  { id: 'administrador', label: 'Administradores', icon: UserCog },
  { id: 'prestador', label: 'Prestadores de Serviços', icon: Wrench },
];

export function CreateAccount() {
  const { userProfile } = useUser();
  const [aba, setAba] = useState<Aba>('morador');

  // ---------------------------------------------------------------------
  // Guarda RBAC (regra permanente do projeto): "Criar Nova Conta" é
  // restrito a Síndico e Administrador. Bloqueia tanto quem chegou aqui
  // pelo menu (que já está oculto para Morador) quanto quem tentar acessar
  // a URL diretamente.
  // ---------------------------------------------------------------------
  const podeAcessar = isManager(userProfile.role);

  if (!podeAcessar) {
    return (
      <div className="p-8 bg-wave-50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-wave-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-wave-800 text-xl font-medium mb-2">Acesso negado</h1>
          <p className="text-wave-500 text-sm mb-6">
            Esta área é restrita a Síndicos e Administradores. Seu perfil atual ({userProfile.role}) não tem permissão para criar novas contas.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-wave-500 text-white rounded-xl hover:bg-wave-600 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-wave-50 min-h-screen">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-wave-500 hover:text-wave-700 text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <h1 className="font-serif text-3xl text-wave-800 font-normal mb-1">Criar Nova Conta</h1>
          <p className="text-wave-500 text-sm">
            Cadastre um novo usuário na plataforma Wave Condominium.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-wave-100 mb-6 shadow-sm flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = aba === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAba(tab.id)}
                className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm ${
                  isActive
                    ? 'bg-wave-500 text-white shadow-sm'
                    : 'bg-transparent text-wave-500 hover:bg-wave-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-wave-100 shadow-sm p-6 md:p-8">
          {aba === 'morador' && <MoradorForm />}
          {aba === 'sindico' && <SindicoForm />}
          {aba === 'administrador' && <AdministradorForm />}
          {aba === 'prestador' && <PrestadorForm />}
        </div>
      </div>
    </div>
  );
}
