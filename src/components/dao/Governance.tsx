'use client';

import { useState } from 'react';
import { Vote, Clock, CheckCircle, XCircle, Plus, Filter, Waves, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useUser } from '../../contexts/UserContext';
import { registerVoteOnChain, createProposalOnChain } from '@/app/actions/blockchain';
import { CreateProposalModal } from './CreateProposalModal';
import { ProjectPriorities } from './ProjectPriorities';


interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'approved' | 'rejected';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  quorum: number;
  daysLeft: number;
  created: string;
  creator: string;
  userVoted?: 'for' | 'against' | null;
}

interface GovernanceProps {
  onViewProposal: (proposalId: string) => void;
}

export function Governance({ onViewProposal }: GovernanceProps) {
  const { userProfile: user, isAuthenticated } = useUser();
  const [filter, setFilter] = useState<'all' | 'active' | 'approved' | 'rejected'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('filtro') === 'ativas'
      ? 'active'
      : 'all'
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'voting' | 'priorities'>('voting');
  const [proposals, setProposals] = useLocalStorage<Proposal[]>('wave_proposals', [
    {
      id: '1',
      title: 'Instalação de Painéis Solares',
      description: 'Proposta para instalação de sistema de energia solar fotovoltaica nas áreas comuns',
      category: 'Sustentabilidade',
      status: 'active',
      votesFor: 156,
      votesAgainst: 44,
      totalVotes: 200,
      quorum: 78,
      daysLeft: 5,
      created: '25/11/2025',
      creator: 'João Silva - Apto 504',
      userVoted: null
    },
    {
      id: '2',
      title: 'Renovação do Sistema de Segurança',
      description: 'Upgrade completo do sistema de câmeras e controle de acesso',
      category: 'Segurança',
      status: 'active',
      votesFor: 130,
      votesAgainst: 70,
      totalVotes: 200,
      quorum: 65,
      daysLeft: 12,
      created: '20/11/2025',
      creator: 'Maria Santos - Apto 302',
      userVoted: null
    }
  ]);

  // Fila de propostas aguardando aprovação do síndico/admin
  const [, setPendingProposals] = useLocalStorage<any[]>('wave_pending_proposals', []);

  const handleVote = async (proposalId: string, voteType: 'for' | 'against') => {
    if (!isAuthenticated || !user) {
      toast.error('Você precisa estar logado para votar');
      return;
    }

    // Optimistic update
    setProposals(prevProposals => 
      prevProposals.map(proposal => {
        if (proposal.id === proposalId) {
          // Remove previous vote if exists
          let votesFor = proposal.votesFor;
          let votesAgainst = proposal.votesAgainst;
          
          if (proposal.userVoted === 'for') votesFor--;
          if (proposal.userVoted === 'against') votesAgainst--;
          
          // Add new vote
          if (voteType === 'for') votesFor++;
          if (voteType === 'against') votesAgainst++;
          
          const totalVotes = votesFor + votesAgainst;
          const quorum = Math.round((totalVotes / 200) * 100);
          
          return {
            ...proposal,
            votesFor,
            votesAgainst,
            totalVotes,
            quorum,
            userVoted: voteType
          };
        }
        return proposal;
      })
    );
    
    try {
      toast.loading('Registrando voto na Stellar...', { id: 'vote-toast' });
      const result = await registerVoteOnChain(proposalId, voteType === 'for' ? 'yes' : 'no', user.id);
      
      if (result.success) {
        toast.success('Voto registrado com sucesso!', { 
          id: 'vote-toast',
          description: `Hash: ${result.txHash.slice(0, 10)}...`
        });
      } else {
        throw new Error('Falha ao registrar voto');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar voto na Stellar', { id: 'vote-toast' });
      // TODO: Revert optimistic update here if needed
    }
  };

  const handleCreateProposal = async (data: {
    title: string;
    description: string;
    category: string;
    type: string;
    duration: number;
  }) => {
    if (!isAuthenticated || !user) {
      toast.error('Você precisa estar logado para criar uma proposta');
      return;
    }

    const tempId = Date.now().toString();

    // Proposta vai para a fila de aprovação do síndico/admin — não entra em votação diretamente
    const pendingProposal = {
      id: tempId,
      title: data.title,
      description: data.description,
      category: data.category,
      type: data.type,
      duration: data.duration,
      createdBy: user.name || 'Você',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'pending' as const,
    };

    setPendingProposals(prev => [pendingProposal, ...prev]);
    setShowCreateModal(false);

    toast.success('Proposta enviada para aprovação!', {
      description: 'O síndico será notificado para revisar e aprovar antes de entrar em votação.',
      duration: 5000,
    });
  };

  const filteredProposals = proposals.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-wave-100 text-wave-500 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Em Votação
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Aprovada
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm">
            <XCircle className="w-4 h-4" />
            Rejeitada
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Sustentabilidade':
        return 'bg-green-100 text-green-700';
      case 'Segurança':
        return 'bg-red-100 text-red-700';
      case 'Infraestrutura':
        return 'bg-wave-100 text-wave-600';
      case 'Prestadores':
        return 'bg-purple-100 text-purple-700';
      case 'Financeiro':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-wave-700 to-wave-500 min-h-screen relative">
      
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-wave-800 text-3xl mb-2">Governança DAO</h1>
          <p className="text-wave-500">Participe das decisões do condomínio de forma transparente</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Proposta
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-wave-100 mb-6 shadow-lg relative z-10 inline-flex">
        <button
          onClick={() => setView('voting')}
          className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${
            view === 'voting'
              ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
              : 'text-wave-500 hover:bg-wave-50'
          }`}
        >
          <Vote className="w-5 h-5" />
          Votações Abertas
        </button>
        <button
          onClick={() => setView('priorities')}
          className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 ${
            view === 'priorities'
              ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
              : 'text-wave-500 hover:bg-wave-50'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Fila de Prioridades
        </button>
      </div>

      {view === 'priorities' ? (
        <ProjectPriorities />
      ) : (
        <>
          {/* Voting Power Card */}
          <div className="bg-gradient-to-br from-wave-700 to-wave-500 rounded-2xl p-6 text-white mb-8 shadow-xl border border-wave-300 relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-wave-100 mb-2">Seu Poder de Voto</p>
                <p className="text-4xl mb-4">1 voto</p>
                <p className="text-wave-100">
                Baseado na sua unidade • {user?.unit || 'N/A'}
              </p>
              </div>
              <Vote className="w-16 h-16 text-wave-200 opacity-50" />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-wave-100 mb-6 shadow-lg relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                      : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                  }`}
                >
                  Todas ({proposals.length})
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === 'active'
                      ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                      : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                  }`}
                >
                  Em Votação ({proposals.filter(p => p.status === 'active').length})
                </button>
                <button
                  onClick={() => setFilter('approved')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === 'approved'
                      ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                      : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                  }`}
                >
                  Aprovadas ({proposals.filter(p => p.status === 'approved').length})
                </button>
                <button
                  onClick={() => setFilter('rejected')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === 'rejected'
                      ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                      : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                  }`}
                >
                  Rejeitadas ({proposals.filter(p => p.status === 'rejected').length})
                </button>
              </div>
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4 relative z-10">
            {filteredProposals.map((proposal) => {
              const votePercentage = proposal.totalVotes > 0 ? (proposal.votesFor / proposal.totalVotes) * 100 : 0;

              return (
                <div
                  key={proposal.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 hover:shadow-xl transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusBadge(proposal.status)}
                        <span className={`px-3 py-1 rounded-full text-xs ${getCategoryColor(proposal.category)}`}>
                          {proposal.category}
                        </span>
                        {proposal.status === 'active' && (
                          <span className="text-slate-600 text-sm">
                            Termina em {proposal.daysLeft} dias
                          </span>
                        )}
                      </div>
                      <h3 className="text-slate-900 text-xl mb-2">{proposal.title}</h3>
                      <p className="text-slate-600 mb-3">{proposal.description}</p>
                      <p className="text-slate-500 text-sm">
                        Criado por {proposal.creator} em {proposal.created}
                      </p>
                    </div>
                  </div>

                  {/* Vote Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">Progresso da Votação</span>
                      <span className="text-slate-900">
                        {proposal.totalVotes} votos • Quórum: {proposal.quorum}%
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${votePercentage}%` }}
                      />
                      <div
                        className="absolute h-full bg-red-500 transition-all duration-500"
                        style={{ left: `${votePercentage}%`, width: `${100 - votePercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {proposal.votesFor} favoráveis ({votePercentage.toFixed(1)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-600" />
                        {proposal.votesAgainst} contra ({(100 - votePercentage).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {proposal.status === 'active' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(proposal.id, 'for');
                        }}
                        disabled={proposal.userVoted === 'for'}
                        className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          proposal.userVoted === 'for'
                            ? 'bg-green-200 text-green-800 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {proposal.userVoted === 'for' ? 'Votado a Favor' : 'Votar a Favor'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(proposal.id, 'against');
                        }}
                        disabled={proposal.userVoted === 'against'}
                        className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          proposal.userVoted === 'against'
                            ? 'bg-red-200 text-red-800 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        {proposal.userVoted === 'against' ? 'Votado Contra' : 'Votar Contra'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProposal(proposal.id);
                        }}
                        className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Detalhes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <CreateProposalModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProposal}
        />
      )}
    </div>
  );
}
