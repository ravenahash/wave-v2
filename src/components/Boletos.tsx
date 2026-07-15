import { toast } from 'sonner';
import { useState } from 'react';
import { Receipt, DollarSign, CheckCircle, Clock, AlertCircle, Plus, TrendingUp } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { IssueBoletoModal } from './IssueBoletoModal';
import { BoletoDetailsModal } from './BoletoDetailsModal';
import { PagamentoStellarModal } from './PagamentoStellarModal';
import { useBlockchainAutoRegistry } from '../hooks/useBlockchainAutoRegistry';
import { isManager, isPlatformAdmin, type Role } from '@/lib/rbac';

interface Boleto {
  id: string;
  unitNumber: string;
  unitOwner: string;
  referenceMonth: string; // formato: 'YYYY-MM'
  dueDate: string;        // formato: 'YYYY-MM-DD' (sem timezone/hora)
  amount: number;
  barcode: string;
  status: 'pending' | 'paid' | 'compensated' | 'blockchain_registered' | 'overdue';
  issuedAt: string;
  issuedBy: string;
  paidAt?: string;
  compensatedAt?: string;
  blockchainHash?: string;
  stellarExplorerUrl?: string;
  anchorTxHash?: string;
  contentHash?: string;
  blockchainRegisteredAt?: string;
  description: string;
  details: {
    condominiumFee: number;
    waterFee: number;
    reserveFund: number;
    otherFees: number;
  };
}

interface BoletosProps {
  userProfile: {
    name: string;
    role: Role;
    unit?: string;
  };
}

// ---------------------------------------------------------------------------
// FIX (bug de timezone / off-by-one na Data de Vencimento):
//
// `new Date('2026-07-10')` é interpretado pelo JS como meia-noite UTC, não
// meia-noite no horário local. No Brasil (UTC-3), isso equivale a
// 2026-07-09T21:00 no horário local. Duas consequências:
//
//  1) `.toLocaleDateString('pt-BR')` mostrava a data ERRADA (um dia antes).
//  2) O boleto virava "Vencido" a partir das 21h do dia anterior ao
//     vencimento real, em vez de virar à meia-noite local do dia seguinte.
//
// As funções abaixo tratam `dueDate` como texto puro ('YYYY-MM-DD'), sem
// nunca passar por `new Date(string)`, eliminando o problema de timezone.
// Também centralizam a lógica que antes estava duplicada em 3 lugares.
// ---------------------------------------------------------------------------

// Data de "hoje" no horário local, já no formato 'YYYY-MM-DD'
function getTodayLocalISO(): string {
  return new Date().toLocaleDateString('en-CA'); // en-CA => YYYY-MM-DD
}

// Compara datas como texto (funciona pois o formato ISO é lexicograficamente
// ordenável) — nunca usa new Date() sobre a string do boleto
function isPastDue(dueDate: string): boolean {
  return dueDate < getTodayLocalISO();
}

function isBoletoOverdue(boleto: Pick<Boleto, 'status' | 'dueDate'>): boolean {
  return boleto.status === 'pending' && isPastDue(boleto.dueDate);
}

// Formata 'YYYY-MM-DD' para 'DD/MM/YYYY' sem passar por new Date()
function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function Boletos({ userProfile }: BoletosProps) {
  const [boletos, setBoletos] = useLocalStorage<Boleto[]>('wave_boletos', [
    {
      id: '1',
      unitNumber: '101',
      unitOwner: 'Maria Silva',
      referenceMonth: '2026-07',
      dueDate: '2026-07-10',
      amount: 850.00,
      barcode: '23793.38128 60000.123456 78901.234567 1 99990000085000',
      status: 'blockchain_registered',
      issuedAt: '2026-06-01',
      issuedBy: 'Síndico João',
      paidAt: '2026-06-20',
      compensatedAt: '2026-06-21',
      description: 'Taxa condominial - Julho 2026',
      details: {
        condominiumFee: 650.00,
        waterFee: 120.00,
        reserveFund: 50.00,
        otherFees: 30.00
      }
    },
    {
      id: '2',
      unitNumber: '101',
      unitOwner: 'Maria Silva',
      referenceMonth: '2026-08',
      dueDate: '2026-08-10',
      amount: 850.00,
      barcode: '23793.38128 60000.654321 78901.987654 2 99990000085000',
      status: 'pending',
      issuedAt: '2026-06-01',
      issuedBy: 'Síndico João',
      description: 'Taxa condominial - Agosto 2026',
      details: {
        condominiumFee: 650.00,
        waterFee: 120.00,
        reserveFund: 50.00,
        otherFees: 30.00
      }
    },
    {
      id: '3',
      unitNumber: '202',
      unitOwner: 'João Santos',
      referenceMonth: '2026-08',
      dueDate: '2026-08-10',
      amount: 920.00,
      barcode: '23793.38128 60000.111222 78901.333444 3 99990000092000',
      status: 'compensated',
      issuedAt: '2026-06-01',
      issuedBy: 'Síndico João',
      paidAt: '2026-07-05',
      compensatedAt: '2026-07-06',
      description: 'Taxa condominial - Agosto 2026',
      details: {
        condominiumFee: 720.00,
        waterFee: 130.00,
        reserveFund: 50.00,
        otherFees: 20.00
      }
    },
    {
      id: '4',
      unitNumber: '203',
      unitOwner: 'Maria Santos',
      referenceMonth: '2026-07',
      dueDate: '2026-07-10',
      amount: 780.00,
      barcode: '23793.38128 60000.203001 78901.203001 4 99990000078000',
      status: 'pending',
      issuedAt: '2026-06-01',
      issuedBy: 'Síndico João',
      description: 'Taxa condominial - Julho 2026',
      details: {
        condominiumFee: 580.00,
        waterFee: 110.00,
        reserveFund: 50.00,
        otherFees: 40.00
      }
    },
    {
      id: '5',
      unitNumber: '203',
      unitOwner: 'Maria Santos',
      referenceMonth: '2026-08',
      dueDate: '2026-08-10',
      amount: 780.00,
      barcode: '23793.38128 60000.203002 78901.203002 5 99990000078000',
      status: 'pending',
      issuedAt: '2026-06-15',
      issuedBy: 'Síndico João',
      description: 'Taxa condominial - Agosto 2026',
      details: {
        condominiumFee: 580.00,
        waterFee: 110.00,
        reserveFund: 50.00,
        otherFees: 40.00
      }
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [boletoParaPagar, setBoletoParaPagar] = useState<Boleto | null>(null);
  const { registerPayment } = useBlockchainAutoRegistry();

  const canIssueBoleto = isManager(userProfile.role);
  const isAdmin = isPlatformAdmin(userProfile.role);

  // Callback de sucesso do pagamento Stellar
  function handlePagamentoStellarSucesso(result: any) {
    if (!boletoParaPagar) return;

    // Salva o txHash REAL da transação Stellar (da liquidação ou da âncora)
    // Este hash é verificável publicamente em stellar.expert
    const stellarTxHash = result.settlement?.stellarTxHash ?? '';
    const anchorTxHash  = result.receipt?.anchorTxHash ?? '';
    const contentHash   = result.receipt?.contentHash ?? '';
    const explorerUrl   = result.settlement?.explorerUrl ?? result.receipt?.anchorExplorerUrl ?? '';

    setBoletos(prev => prev.map(b =>
      b.id === boletoParaPagar.id
        ? {
            ...b,
            status: 'blockchain_registered' as const,
            paidAt: new Date().toISOString().split('T')[0],
            compensatedAt: new Date().toISOString().split('T')[0],
            // Salva o txHash da liquidação Stellar — 64 chars hex, sem 0x
            blockchainHash: stellarTxHash,
            blockchainRegisteredAt: new Date().toISOString(),
            // Campos adicionais para auditoria
            stellarExplorerUrl: explorerUrl,
            anchorTxHash,
            contentHash,
          }
        : b
    ));

    toast.success('Pagamento registrado!', {
      description: 'Pagamento confirmado com sucesso.',
      action: explorerUrl ? {
        label: 'Verificar',
        onClick: () => window.open(explorerUrl, '_blank'),
      } : undefined,
      duration: 6000,
    });
  }

  const handleIssueBoleto = (data: Omit<Boleto, 'id' | 'issuedAt' | 'issuedBy' | 'status' | 'barcode'>) => {
    const newBoleto: Boleto = {
      ...data,
      id: Date.now().toString(),
      barcode: generateBarcode(),
      status: 'pending',
      issuedAt: new Date().toISOString().split('T')[0],
      issuedBy: userProfile.name
    };

    setBoletos([newBoleto, ...boletos]);
    setShowIssueModal(false);
    toast.success('Boleto emitido com sucesso!');
  };

  const generateBarcode = () => {
    const random1 = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const random2 = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const random3 = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const digit = Math.floor(Math.random() * 10);
    const value = Math.floor(Math.random() * 1000000).toString().padStart(10, '0');
    
    return `23793.38128 60000.${random1} ${random2}.${random3} ${digit} 9999${value}`;
  };

  const handleSimulatePayment = (boletoId: string) => {
    setBoletos(boletos.map(b => 
      b.id === boletoId
        ? {
            ...b,
            status: 'paid' as const,
            paidAt: new Date().toISOString().split('T')[0]
          }
        : b
    ));
    toast.success('Pagamento registrado!', { description: 'Aguardando compensação bancária (1-2 dias úteis).' });
  };

  const handleSimulateCompensation = async (boletoId: string) => {
    const boleto = boletos.find(b => b.id === boletoId);
    if (!boleto) return;

    // Atualizar status para compensado
    setBoletos(boletos.map(b => 
      b.id === boletoId
        ? {
            ...b,
            status: 'compensated' as const,
            compensatedAt: new Date().toISOString().split('T')[0]
          }
        : b
    ));
    
    toast.success('Compensação confirmada!', { description: 'Comprovante gerado com sucesso.' });
    
    // Registrar pagamento na blockchain automaticamente
    const record = await registerPayment({
      boletoId: boleto.id,
      unitNumber: boleto.unitNumber,
      amount: boleto.amount,
      referenceMonth: boleto.referenceMonth
    });

    // Atualizar boleto com dados da blockchain
    setBoletos(prevBoletos => prevBoletos.map(b => 
      b.id === boletoId
        ? {
            ...b,
            status: 'blockchain_registered' as const,
            blockchainHash: record.txHash,
            blockchainRegisteredAt: record.timestamp
          }
        : b
    ));
  };

  // Normaliza o número da unidade do usuário (ex: "Apto 203" → "203")
  const normalizedUserUnit = (userProfile.unit ?? '')
    .replace(/[^0-9]/g, '').trim();

  const filteredBoletos = boletos.filter(boleto => {
    // Filtro por unidade para moradores (não síndicos/admins)
    if (!canIssueBoleto && normalizedUserUnit && boleto.unitNumber !== normalizedUserUnit) {
      return false;
    }

    // Filtro por status
    if (filter === 'all') return true;
    if (filter === 'pending') return boleto.status === 'pending';
    if (filter === 'paid') return boleto.status === 'blockchain_registered';
    if (filter === 'overdue') return isBoletoOverdue(boleto);
    return true;
  });

  const totalPending = boletos.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = boletos.filter(b => b.status === 'blockchain_registered').reduce((sum, b) => sum + b.amount, 0);
  const totalOverdue = boletos.filter(isBoletoOverdue).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Pendente
          </span>
        );
      case 'paid':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-wave-100 text-wave-600 rounded-full text-sm">
            <DollarSign className="w-4 h-4" />
            Pago - Aguardando Compensação
          </span>
        );
      case 'compensated':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm animate-pulse">
            <TrendingUp className="w-4 h-4" />
            Processando
          </span>
        );
      case 'blockchain_registered':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Pago
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            <AlertCircle className="w-4 h-4" />
            Vencido
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-wave-700 to-wave-500 min-h-screen relative">
      

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-wave-800 text-3xl mb-2">Boletos de Condomínio</h1>
          <p className="text-wave-500">
            Gestão completa de cobranças e pagamentos do condomínio
          </p>
        </div>
        {canIssueBoleto && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Emitir Boleto
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-3xl text-wave-800">
              R$ {totalPending.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <h3 className="text-wave-800">A Receber</h3>
          <p className="text-wave-500 text-sm">Boletos pendentes</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-3xl text-wave-800">
              R$ {totalPaid.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <h3 className="text-wave-800">Recebido</h3>
          <p className="text-wave-500 text-sm">Pagos e verificados</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-3xl text-wave-800">{totalOverdue}</span>
          </div>
          <h3 className="text-wave-800">Vencidos</h3>
          <p className="text-wave-500 text-sm">Requer atenção</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-wave-100 rounded-xl">
              <Receipt className="w-6 h-6 text-wave-500" />
            </div>
            <span className="text-3xl text-wave-800">{boletos.length}</span>
          </div>
          <h3 className="text-wave-800">Total de Boletos</h3>
          <p className="text-wave-500 text-sm">Histórico completo</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-wave-100 mb-6 shadow-lg relative z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Todos ({boletos.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'pending'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Pendentes ({boletos.filter(b => b.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'paid'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Pagos ({boletos.filter(b => b.status === 'blockchain_registered').length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'overdue'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Vencidos ({totalOverdue})
          </button>
        </div>
      </div>

      {/* Boletos List */}
      {filteredBoletos.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-wave-100 shadow-lg text-center relative z-10">
          <Receipt className="w-16 h-16 text-wave-300 mx-auto mb-4" />
          <h3 className="text-wave-800 text-xl mb-2">Nenhum boleto encontrado</h3>
          <p className="text-wave-500 mb-4">
            {filter === 'all' 
              ? 'Não há boletos cadastrados' 
              : `Nenhum boleto ${filter === 'pending' ? 'pendente' : filter === 'paid' ? 'pago' : 'vencido'}`}
          </p>
          {canIssueBoleto && filter !== 'paid' && (
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg"
            >
              Emitir Primeiro Boleto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {filteredBoletos.map((boleto) => {
            const isOverdue = isBoletoOverdue(boleto);
            
            return (
              <div
                key={boleto.id}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl border p-6 shadow-lg hover:shadow-xl transition-all ${
                  isOverdue ? 'border-red-200 bg-red-50/50' : 'border-wave-100'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-wave-800 text-xl">{boleto.description}</h3>
                      {getStatusBadge(isOverdue ? 'overdue' : boleto.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-wave-500 text-sm">Unidade</p>
                        <p className="text-wave-800">{boleto.unitNumber}</p>
                      </div>
                      <div>
                        <p className="text-wave-500 text-sm">Proprietário</p>
                        <p className="text-wave-800">{boleto.unitOwner}</p>
                      </div>
                      <div>
                        <p className="text-wave-500 text-sm">Vencimento</p>
                        <p className="text-wave-800">
                          {formatDateBR(boleto.dueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-wave-500 text-sm">Valor</p>
                        <p className="text-wave-800 text-xl">
                          R$ {boleto.amount.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>

                    {boleto.blockchainHash && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-emerald-800 text-sm flex items-center gap-2 font-medium">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            Comprovante verificável registrado
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <p className="text-emerald-600 text-xs mb-0.5">ID da transação</p>
                            <p className="text-emerald-700 text-xs font-mono break-all">{boleto.blockchainHash}</p>
                          </div>
                          {boleto.blockchainRegisteredAt && (
                            <p className="text-emerald-600 text-xs">
                              Comprovante emitido em: {new Date(boleto.blockchainRegisteredAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                        {/* Link verificável — qualquer pessoa pode confirmar o registro */}
                        {(boleto.stellarExplorerUrl || (!boleto.blockchainHash.startsWith('0x') && boleto.blockchainHash.length === 64)) && (
                          <a
                            href={boleto.stellarExplorerUrl ?? `https://stellar.expert/explorer/testnet/tx/${boleto.blockchainHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all text-xs font-medium"
                          >
                            Verificar autenticidade do comprovante ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedBoleto(boleto)}
                    className="flex-1 py-3 bg-wave-100 text-wave-600 rounded-xl hover:bg-wave-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-5 h-5" />
                    Ver Detalhes
                  </button>
                  
                  {boleto.status === 'pending' && (
                    <button
                      onClick={() => setBoletoParaPagar(boleto)}
                      className="flex-1 py-3 bg-wave-800 text-white rounded-xl hover:bg-wave-700 transition-all flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Pagar
                    </button>
                  )}

                  {boleto.status === 'paid' && isAdmin && (
                    <button
                      onClick={() => handleSimulateCompensation(boleto.id)}
                      className="flex-1 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Simular Compensação
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-gradient-to-r from-wave-700 to-wave-500 rounded-2xl p-6 border border-wave-200 shadow-lg relative z-10">
        <div className="flex items-start gap-3">
          <Receipt className="w-6 h-6 text-wave-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-wave-800 mb-2">Como funciona o pagamento</h3>
            <div className="bg-white rounded-xl p-4">
              <ol className="list-decimal list-inside text-wave-600 text-sm space-y-2">
                <li><strong>Emissão:</strong> Síndico emite o boleto → Morador recebe notificação</li>
                <li><strong>Pagamento:</strong> Escolha Pix, Cartão ou Boleto Bancário</li>
                <li><strong>Confirmação:</strong> Pagamento processado em segundos</li>
                <li><strong>Comprovante:</strong> Gerado automaticamente com protocolo único</li>
                <li><strong>Transparência:</strong> Comprovante verificável por qualquer parte ✅</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showIssueModal && (
        <IssueBoletoModal
          onClose={() => setShowIssueModal(false)}
          onIssue={handleIssueBoleto}
        />
      )}

      {selectedBoleto && (
        <BoletoDetailsModal
          boleto={selectedBoleto}
          onClose={() => setSelectedBoleto(null)}
          onSimulatePayment={() => setBoletoParaPagar(selectedBoleto)}
          onSimulateCompensation={handleSimulateCompensation}
          canSimulatePayment={selectedBoleto.status === 'pending'}
          canSimulateCompensation={isAdmin && selectedBoleto.status === 'paid'}
        />
      )}

      {boletoParaPagar && (
        <PagamentoStellarModal
          boleto={boletoParaPagar}
          payerName={userProfile.name}
          onClose={() => setBoletoParaPagar(null)}
          onSuccess={(result) => {
            handlePagamentoStellarSucesso(result);
            setBoletoParaPagar(null);
          }}
        />
      )}
    </div>
  );
}
