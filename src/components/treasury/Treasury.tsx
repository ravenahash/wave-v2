import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Download, ExternalLink, Filter, CreditCard, Smartphone, X, AlertCircle, Users, Receipt, FileText, Send } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useFinancialSummary, PAID_STATUS } from '../../hooks/useFinancialSummary';

import { GenerateBoletoModal } from './GenerateBoletoModal';
import { isManager, type Role } from '@/lib/rbac';

interface TreasuryProps {
  userProfile?: {
    role: Role;
  };
}

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthLabel(monthKey: string): string {
  const [, month] = monthKey.split('-');
  const idx = parseInt(month, 10) - 1;
  return MONTH_LABELS_PT[idx] ?? monthKey;
}

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Treasury({ userProfile }: TreasuryProps) {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [showGenerateBoletoModal, setShowGenerateBoletoModal] = useState(false);
  const [view, setView] = useState<'overview' | 'boletos'>('overview');

  // Extraído para src/hooks/useFinancialSummary.ts — mesmo cálculo que o
  // Dashboard usa, garantindo que os dois lugares nunca divirjam.
  const {
    boletos,
    saldoAtual,
    fundoReserva,
    currentMonthKey,
    boletosDoMes,
    boletosPagosDoMes,
    receitasDoMes,
    percentualAdimplencia,
    percentualInadimplencia,
    boletosVencidos,
    totalInadimplencia,
    unidadesInadimplentes,
    totalUnidadesConhecidas,
  } = useFinancialSummary();

  const isManagerRole = isManager(userProfile?.role);

  const metaFundoReserva = 100000; // meta ainda fixa — não há de onde derivar isso dos boletos
  const percentualMeta = metaFundoReserva > 0 ? Math.min(100, Math.round((fundoReserva / metaFundoReserva) * 100)) : 0;

  // Boletos pendentes (e ainda não vencidos) — para o card "Boletos Pendentes"
  const boletosPendentesNaoVencidos = boletos.filter(b => b.status === 'pending' && !boletosVencidos.includes(b));
  const totalPendenteNaoVencido = boletosPendentesNaoVencidos.reduce((sum, b) => sum + b.amount, 0);

  // Boletos pagos no ano corrente — para o card "Boletos Pagos (ano)"
  const anoAtual = String(new Date().getFullYear());
  const boletosPagosNoAno = boletos.filter(b => b.status === PAID_STATUS && b.referenceMonth.startsWith(anoAtual));
  const totalEmitidosNoAno = boletos.filter(b => b.referenceMonth.startsWith(anoAtual)).length;
  const taxaAdimplenciaAno = totalEmitidosNoAno > 0
    ? Math.round((boletosPagosNoAno.length / totalEmitidosNoAno) * 100)
    : 0;

  // Evolução Financeira (últimos 6 meses com dados reais de receita)
  const monthsWithData = Array.from(new Set(boletos.map(b => b.referenceMonth))).sort();
  const last6Months = monthsWithData.slice(-6);
  const balanceData = last6Months.length > 0
    ? last6Months.map(monthKey => {
        const receitas = boletos
          .filter(b => b.referenceMonth === monthKey && b.status === PAID_STATUS)
          .reduce((sum, b) => sum + b.amount, 0);
        return {
          month: formatMonthLabel(monthKey),
          receitas,
          despesas: 0, // aguardando módulo de despesas
        };
      })
    : [];

  const handleExport = () => {
    toast.success('Exportação iniciada!', {
      description: 'O relatório será baixado em breve.'
    });
  };

  const handleFilter = () => {
    toast.info('Filtros avançados', {
      description: 'Funcionalidade de filtros em desenvolvimento.'
    });
  };

  const handleGenerateBoletos = (data: any) => {
    console.log('Gerando boletos:', data);
    const count = data.units.length;
    toast.success(`${count} boleto${count !== 1 ? 's' : ''} gerado${count !== 1 ? 's' : ''} com sucesso!`, {
      description: `Os moradores receberão notificações por e-mail e SMS.`
    });
    setShowGenerateBoletoModal(false);
  };

  const handleSendBoletoReminder = () => {
    toast.success('Lembretes enviados!', {
      description: `Notificações enviadas para ${unidadesInadimplentes.size} unidade${unidadesInadimplentes.size !== 1 ? 's' : ''} em atraso.`
    });
  };

  // NOTA: "Despesas por Categoria" continua mock — não há, hoje, nenhuma
  // fonte de dados de despesas no projeto (só existe o modelo de Boleto,
  // que é receita). Quando existir um módulo de despesas, troca este array
  // fixo pelos dados reais agrupados por categoria.
  const expensesByCategory = [
    { name: 'Limpeza', value: 8500, color: '#3b82f6' },
    { name: 'Portaria', value: 12000, color: '#8b5cf6' },
    { name: 'Manutenção', value: 6500, color: '#22c55e' },
    { name: 'Energia', value: 4200, color: '#f59e0b' },
    { name: 'Água', value: 1800, color: '#06b6d4' }
  ];

  // NOTA: "Histórico de Transações" também continua mock por enquanto — a
  // parte de "despesa" não tem fonte de dados real ainda. Fora do escopo
  // pedido nesta rodada; fica marcado aqui para não esquecer.
  const transactions = [
    {
      id: '1',
      type: 'receita',
      description: 'Taxa Condominial - Novembro',
      value: 'R$ 48.000,00',
      date: '05/11/2025',
      category: 'Receita',
      status: 'Confirmado',
      hash: '0x742d...8f2a',
      proposal: null
    },
    {
      id: '2',
      type: 'despesa',
      description: 'Pagamento - Empresa de Limpeza',
      value: 'R$ 8.500,00',
      date: '03/11/2025',
      category: 'Limpeza',
      status: 'Confirmado',
      hash: '0x8a3c...5b1d',
      proposal: 'Proposta #004'
    },
    {
      id: '3',
      type: 'despesa',
      description: 'Salário - Portaria',
      value: 'R$ 12.000,00',
      date: '01/11/2025',
      category: 'Portaria',
      status: 'Confirmado',
      hash: '0x1f5e...9c7a',
      proposal: null
    },
    {
      id: '4',
      type: 'despesa',
      description: 'Manutenção - Elevador',
      value: 'R$ 3.200,00',
      date: '28/10/2025',
      category: 'Manutenção',
      status: 'Confirmado',
      hash: '0x6d2b...4e8f',
      proposal: 'Proposta #012'
    },
    {
      id: '5',
      type: 'receita',
      description: 'Taxa Condominial - Outubro',
      value: 'R$ 45.500,00',
      date: '05/10/2025',
      category: 'Receita',
      status: 'Confirmado',
      hash: '0x9a7c...2d3e',
      proposal: null
    }
  ];

  return (
    <div className="p-8 bg-gradient-to-br from-wave-700 to-wave-500 min-h-screen relative">
      

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-wave-800 text-3xl mb-2">Gestão Financeira</h1>
          <p className="text-wave-500">Transparência total com registros auditáveis</p>
        </div>
        <button 
          onClick={() => window.location.href = '/dashboard/boletos'}
          className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          Ir para Boletos
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="bg-gradient-to-br from-wave-700 to-wave-500 rounded-2xl p-6 text-white shadow-lg border border-wave-400">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-wave-100" />
            <p className="text-wave-100 text-sm">Saldo Atual</p>
          </div>
          <p className="text-3xl mb-1">{formatBRL(saldoAtual)}</p>
          <p className="text-wave-100 text-sm">Caixa disponível</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-wave-500 text-sm">Fundo de Reserva</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-wave-800 text-2xl mb-1">{formatBRL(fundoReserva)}</p>
          <div className="w-full bg-wave-100 rounded-full h-2 mt-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: `${percentualMeta}%` }} />
          </div>
          <p className="text-green-600 text-sm mt-2">{percentualMeta}% da meta ({formatBRL(metaFundoReserva)})</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-wave-500 text-sm">Receitas ({formatMonthLabel(currentMonthKey)})</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-wave-800 text-2xl mb-1">{formatBRL(receitasDoMes)}</p>
          <p className="text-wave-500 text-sm">
            {percentualAdimplencia}% arrecadado ({boletosPagosDoMes.length}/{boletosDoMes.length || totalUnidadesConhecidas} unidades)
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-wave-500 text-sm">Inadimplência</p>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-orange-600 text-2xl mb-1">{formatBRL(totalInadimplencia)}</p>
          <p className="text-wave-500 text-sm">
            {percentualInadimplencia}% · {unidadesInadimplentes.size} unidade{unidadesInadimplentes.size !== 1 ? 's' : ''} em atraso
          </p>
        </div>
      </div>

      {/* Admin: Gestão de Boletos */}
      {isManagerRole && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 shadow-lg mb-8 relative z-10">
          <div className="p-6 border-b border-wave-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-wave-700 to-wave-500 rounded-xl">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-wave-800 text-lg">Gestão de Boletos</h3>
                  <p className="text-wave-500 text-sm">Emita e gerencie boletos de condomínio</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateBoletoModal(true)}
                className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
              >
                <Receipt className="w-5 h-5" />
                Gerar Boletos
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Resumo de Boletos */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-200 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-700" />
                  </div>
                  <span className="text-2xl text-orange-900">{boletosPendentesNaoVencidos.length}</span>
                </div>
                <h4 className="text-orange-900">Boletos Pendentes</h4>
                <p className="text-orange-700 text-sm">{formatBRL(totalPendenteNaoVencido)} a receber</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-700" />
                  </div>
                  <span className="text-2xl text-red-900">{boletosVencidos.length}</span>
                </div>
                <h4 className="text-red-900">Boletos Vencidos</h4>
                <p className="text-red-700 text-sm">{formatBRL(totalInadimplencia)} em atraso</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <Receipt className="w-5 h-5 text-green-700" />
                  </div>
                  <span className="text-2xl text-green-900">{boletosPagosNoAno.length}</span>
                </div>
                <h4 className="text-green-900">Boletos Pagos ({anoAtual})</h4>
                <p className="text-green-700 text-sm">Taxa de adimplência: {taxaAdimplenciaAno}%</p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-wave-50 rounded-xl border border-wave-100 hover:bg-wave-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-wave-500" />
                  <div>
                    <p className="text-wave-800">Gerar Boletos do Próximo Mês</p>
                    <p className="text-wave-500 text-sm">Emita boletos para todas as unidades de uma vez</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowGenerateBoletoModal(true)}
                  className="bg-wave-500 hover:bg-wave-500 text-white"
                >
                  Gerar em Lote
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-orange-900">Enviar Lembrete de Vencimento</p>
                    <p className="text-orange-600 text-sm">Notificar {unidadesInadimplentes.size} unidade{unidadesInadimplentes.size !== 1 ? 's' : ''} com boletos em atraso</p>
                  </div>
                </div>
                <Button
                  onClick={handleSendBoletoReminder}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-200"
                >
                  Enviar Lembretes
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-wave-100 rounded-xl border border-wave-200 hover:bg-wave-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-wave-400" />
                  <div>
                    <p className="text-wave-400">Exportar Relatório de Boletos</p>
                    <p className="text-wave-400 text-sm">Baixe planilha completa com todos os boletos</p>
                  </div>
                </div>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="border-wave-200 text-wave-400 hover:bg-wave-100"
                >
                  Exportar Excel
                </Button>
              </div>
            </div>

            {/* Info sobre processo */}
            <div className="mt-6 p-4 bg-gradient-to-r from-wave-700 to-wave-500 rounded-xl border border-wave-200">
              <div className="flex gap-3">
                <Receipt className="w-5 h-5 text-wave-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-wave-800 mb-2">Como funciona a geração de boletos</h4>
                  <ul className="text-wave-600 text-sm space-y-1 list-disc list-inside">
                    <li>Gere boletos individuais ou em lote para múltiplas unidades</li>
                    <li>Defina valores personalizados (condomínio, água, taxas extras)</li>
                    <li>Moradores recebem notificação automática por e-mail e SMS</li>
                    <li>Após compensação bancária, pagamentos são registrados automaticamente na blockchain</li>
                    <li>Acesse o módulo "Boletos" no menu para gerenciamento detalhado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* Balance Evolution */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 shadow-lg">
          <h3 className="text-wave-800 text-lg mb-6">Evolução Financeira (Últimos 6 Meses)</h3>
          {balanceData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-wave-400 text-sm italic">Ainda não há boletos suficientes para montar o gráfico.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                <XAxis dataKey="month" stroke="#60a5fa" />
                <YAxis stroke="#60a5fa" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #3b82f6',
                    borderRadius: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorReceitas)"
                  name="Receitas"
                />
                <Area 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fill="url(#colorDespesas)"
                  name="Despesas"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="text-wave-400 text-xs italic mt-2">
            * Despesas ainda não têm fonte de dados real neste projeto — aparecem zeradas até existir um módulo de despesas.
          </p>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-wave-500" />
            <h3 className="text-wave-800 text-lg">Despesas por Categoria</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {expensesByCategory.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-wave-500">{item.name}</span>
                </div>
                <span className="text-sm text-wave-800">
                  R$ {item.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
          <p className="text-wave-400 text-xs italic mt-3">
            * Ainda mock — não há módulo de despesas por categoria implementado.
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 shadow-lg relative z-10">
        <div className="p-6 border-b border-wave-100">
          <div className="flex items-center justify-between">
            <h3 className="text-wave-800 text-lg">Histórico de Transações</h3>
            <div className="flex gap-2">
              <button
                onClick={handleFilter}
                className="px-3 py-2 bg-wave-50 text-wave-500 rounded-lg hover:bg-wave-100 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-2 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-lg hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-wave-50 border-b border-wave-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Data</th>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Descrição</th>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Categoria</th>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Valor</th>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Status</th>
                <th className="px-6 py-4 text-left text-sm text-wave-500">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-wave-50/50 transition-colors">
                  <td className="px-6 py-4 text-wave-500 text-sm">{tx.date}</td>
                  <td className="px-6 py-4">
                    <p className="text-wave-800">{tx.description}</p>
                    {tx.proposal && (
                      <p className="text-wave-500 text-sm">{tx.proposal}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tx.type === 'receita'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-wave-100 text-wave-600'
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`${
                      tx.type === 'receita' ? 'text-green-600' : 'text-wave-800'
                    }`}>
                      {tx.value}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs">
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-wave-500 hover:text-wave-500 font-mono text-sm flex items-center gap-1">
                      {tx.hash}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-wave-400 text-xs italic px-6 pb-4">
          * Esta tabela ainda é mock (mistura receita/despesa) — fora do escopo desta rodada de correção.
        </p>
      </div>

      {/* Blockchain Info */}
      <div className="mt-8 bg-gradient-to-r from-wave-700 to-wave-500 rounded-2xl p-6 border border-wave-200 shadow-lg relative z-10">
        <div className="flex items-start gap-3">
          <Wallet className="w-6 h-6 text-wave-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-wave-800 mb-2">Auditoria Automática</h3>
            <p className="text-wave-600 text-sm">
              Todas as movimentações financeiras acima de R$ 5.000 são automaticamente registradas na rede Stellar, 
              criando uma trilha de auditoria imutável e transparente para prestação de contas.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
            {showGenerateBoletoModal && (
        <GenerateBoletoModal
          onClose={() => setShowGenerateBoletoModal(false)}
          onGenerate={handleGenerateBoletos}
        />
      )}
    </div>
  );
}
