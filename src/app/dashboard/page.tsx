'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  Clock,
  Wrench,
  Shield,
  DollarSign,
  Users,
  FileText,
  Vote,
  Calendar,
  Activity,
  Zap,
  Bell,
  MapPin,
  CheckCheck
} from 'lucide-react';

import Link from 'next/link';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useMaintenanceOrders } from '@/hooks/useMaintenanceOrders';
import { useNotifications } from '@/hooks/useNotifications';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useUser } from '@/contexts/UserContext';
import { isManager } from '@/lib/rbac';
import {
  CONDOMINIUM_SETTINGS_KEY,
  DEFAULT_CONDOMINIUM_SETTINGS,
  type CondominiumSettings,
} from '@/lib/condominiumSettings';

interface AvisoEvento {
  id: string;
  tipo: string;
  titulo: string;
  dataEvento?: string;
  horarioEvento?: string;
  localEvento?: string;
}

const MONTH_ABBR_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parseEventDate(dataEvento: string): { day: string; monthLabel: string } {
  const [, month, day] = dataEvento.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return { day, monthLabel: MONTH_ABBR_PT[monthIdx] ?? month };
}

function getTodayLocalISO(): string {
  return new Date().toLocaleDateString('en-CA');
}

function formatRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

function formatCurrentDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile } = useUser();
  const [currentDateLabel, setCurrentDateLabel] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    setCurrentDateLabel(formatCurrentDateBR(new Date()));
  }, []);

  const { saldoAtual, fundoReserva, percentualAdimplencia, percentualInadimplencia } = useFinancialSummary();
  // RBAC (regra permanente do projeto): Adimplência/Inadimplência são dados
  // financeiros sensíveis, restritos a Síndico e Admin — Morador não vê.
  // LIMITAÇÃO: sem backend real, o valor é calculado no cliente independente
  // do perfil; isto apenas oculta na interface. Bloqueio real do dado só
  // existe quando a API validar o perfil no servidor (ver rbac.ts).
  const canViewFinancialCompliance = isManager(userProfile.role);
  const { abertas, emAndamento, concluidas } = useMaintenanceOrders();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [avisos] = useLocalStorage<AvisoEvento[]>('wave_avisos', []);
  const [condominiumSettings] = useLocalStorage<CondominiumSettings>(
    CONDOMINIUM_SETTINGS_KEY,
    DEFAULT_CONDOMINIUM_SETTINGS
  );
  const todayISO = getTodayLocalISO();
  const upcomingEvents = avisos
    .filter((a) => a.tipo === 'evento' && a.dataEvento && a.dataEvento >= todayISO)
    .sort((a, b) => (a.dataEvento! < b.dataEvento! ? -1 : a.dataEvento! > b.dataEvento! ? 1 : 0))
    .slice(0, 5);

  function handleNotificationClick(notification: { id: string; actionUrl?: string }) {
    markAsRead(notification.id);
    setIsNotifOpen(false);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  }

  const criticalAlerts = [
    {
      id: '1',
      type: 'warning',
      title: 'Garantia da Bomba D\'água vence em 28 dias',
      action: 'Abrir OS de Vistoria',
      link: '/dashboard/maintenance',
      priority: 'high',
      date: '30 dias'
    },
    {
      id: '2',
      type: 'info',
      title: 'Assembleia: Instalação de Painéis Solares',
      action: 'Votar Agora',
      link: '/dashboard/governance',
      priority: 'medium',
      date: '5 dias restantes'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Uso de Fundo de Reserva detectado',
      action: 'Verificar Autorização',
      link: '/dashboard/treasury',
      priority: 'high',
      date: 'Hoje'
    }
  ];

  return (
    <div className="space-y-8 relative">
      
      
      <div className="flex items-center justify-between relative z-20">
        <div>
          <h1 className="text-3xl text-wave-800">Visão Geral</h1>
          <p className="text-wave-500">Bem-vindo ao painel de gestão do seu condomínio</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen((v) => !v)}
              className="p-2 bg-white rounded-xl shadow-sm border border-wave-100 text-wave-500 hover:bg-wave-50 transition-colors relative"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-wave-100 shadow-xl z-50">
                  <div className="p-4 border-b border-wave-100 flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-wave-800 font-medium text-sm">Notificações</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-wave-500 text-xs hover:text-wave-700 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-wave-400 text-sm">Nenhuma notificação</p>
                  ) : (
                    <div className="divide-y divide-wave-50">
                      {notifications.slice(0, 10).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left p-4 hover:bg-wave-50 transition-colors flex gap-3 ${!n.read ? 'bg-wave-50/60' : ''}`}
                        >
                          {!n.read && <span className="w-2 h-2 mt-1.5 rounded-full bg-wave-500 flex-shrink-0" />}
                          <div className={!n.read ? '' : 'ml-5'}>
                            <p className="text-wave-800 text-sm font-medium">{n.title}</p>
                            <p className="text-wave-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-wave-400 text-xs mt-1">{formatRelativeTime(n.timestamp)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button className="px-4 py-2 bg-white rounded-xl shadow-sm border border-wave-100 text-wave-500 hover:bg-wave-50 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{currentDateLabel}</span>
          </button>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Link
          href="/dashboard/treasury"
          className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-wave-100 shadow-sm hover:shadow-md hover:border-wave-300 transition-all group block cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-wave-800 font-medium mb-3">Saúde Financeira</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-wave-500">Saldo</span>
              <span className="text-wave-800 font-medium">{formatBRL(saldoAtual)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-wave-500">Fundo de Reserva</span>
              <span className="text-wave-800 font-medium">{formatBRL(fundoReserva)}</span>
            </div>
            {canViewFinancialCompliance && (
              <>
                <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-wave-50">
                  <span className="text-wave-500">Adimplência</span>
                  <span className="text-green-600 font-medium">{percentualAdimplencia}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-wave-500">Inadimplência</span>
                  <span className="text-orange-600 font-medium">{percentualInadimplencia}%</span>
                </div>
              </>
            )}
          </div>
        </Link>

        <Link
          href="/dashboard/maintenance"
          className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-wave-100 shadow-sm hover:shadow-md hover:border-wave-300 transition-all group block cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${abertas > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'} group-hover:scale-110 transition-transform`}>
              <Wrench className="w-6 h-6" />
            </div>
            <span className={`text-2xl font-bold ${abertas > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {abertas}
            </span>
          </div>
          <h3 className="text-wave-800 font-medium mb-1">Manutenção</h3>
          <p className="text-wave-500 text-sm mb-2">Ordens de serviço em aberto</p>
          <p className="text-wave-400 text-xs">{emAndamento} em andamento · {concluidas} concluídas</p>
        </Link>

        {[
          {
            title: 'Conformidade',
            value: '100%',
            icon: Shield,
            description: 'AVCB e Seguros',
            detail: 'Documentação em dia'
          },
          {
            title: 'Participação',
            value: '78%',
            icon: Users,
            description: 'Última assembleia',
            detail: 'Quórum atingido'
          }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-wave-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {metric.value}
                </span>
              </div>
              <h3 className="text-wave-800 font-medium mb-1">{metric.title}</h3>
              <p className="text-wave-500 text-sm mb-2">{metric.description}</p>
              <p className="text-wave-400 text-xs">{metric.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl text-wave-800">Atenção Necessária</h2>
            </div>
            
            <div className="space-y-4">
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-wave-50/50 rounded-xl border border-wave-100 hover:border-wave-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.priority === 'high' ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <h3 className="text-wave-800 font-medium">{alert.title}</h3>
                      <p className="text-wave-500 text-sm flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {alert.date}
                      </p>
                    </div>
                  </div>
                  <Link 
                    href={alert.link}
                    className="px-4 py-2 bg-white text-wave-500 text-sm rounded-lg border border-wave-200 hover:bg-wave-50 hover:border-wave-300 transition-all shadow-sm"
                  >
                    {alert.action}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade Recente — removida temporariamente a pedido da equipe (14/07/2026). Estrutura preservada para reimplementação futura.
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-wave-100 rounded-lg">
                  <Activity className="w-5 h-5 text-wave-500" />
                </div>
                <h2 className="text-xl text-wave-800">Atividade Recente</h2>
              </div>
              <select className="bg-wave-50 border border-wave-200 text-wave-800 text-sm rounded-lg px-3 py-1 outline-none">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
                <option>Este ano</option>
              </select>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2 px-4 pb-2">
              {[40, 70, 45, 90, 60, 80, 50].map((height, i) => (
                <div key={i} className="w-full bg-wave-100 rounded-t-lg relative group overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-wave-700 to-wave-500 transition-all duration-500 group-hover:opacity-80"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 mt-2 text-xs text-wave-400">
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>
          </div>
          */}
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-wave-700 to-wave-500 rounded-2xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/governance?filtro=ativas" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center backdrop-blur-sm">
                <Vote className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Votação</span>
              </Link>
              <Link href="/dashboard/maintenance" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center backdrop-blur-sm">
                <Wrench className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Abrir Chamado</span>
              </Link>
              <Link href="/dashboard/documents" className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center backdrop-blur-sm">
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Documentos</span>
              </Link>
              {condominiumSettings.whatsappGroupLink && (
                <a
                  href={condominiumSettings.whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center backdrop-blur-sm"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mx-auto mb-2" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                  </svg>
                  <span className="text-xs">Grupo do Condomínio</span>
                </a>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 shadow-sm p-6">
            <h2 className="text-xl text-wave-800 mb-6">Próximos Eventos</h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-wave-400 text-sm italic text-center py-6">Nenhum evento agendado</p>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map((event) => {
                  const { day, monthLabel } = parseEventDate(event.dataEvento!);
                  return (
                    <div key={event.id} className="flex gap-3 items-start py-2.5 border-b border-wave-50 last:border-0">
                      <div className="flex-shrink-0 w-11 text-center">
                        <span className="block text-[10px] text-wave-500 uppercase font-medium">{monthLabel}</span>
                        <span className="block text-xl text-wave-800 font-medium leading-tight">{day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-wave-800 font-medium text-sm mb-1 truncate">{event.titulo}</p>
                        {event.horarioEvento || event.localEvento ? (
                          <p className="text-wave-500 text-xs flex items-center gap-3 flex-wrap">
                            {event.horarioEvento && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {event.horarioEvento}
                              </span>
                            )}
                            {event.localEvento && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.localEvento}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-wave-400 text-xs italic">Sem horário informado</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
