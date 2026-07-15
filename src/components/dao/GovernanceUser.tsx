import { useState } from 'react';
import { Vote, Plus, Filter, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, User, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { CreateProposalUserModal } from './CreateProposalUserModal';
import { ProjectPriorities } from './ProjectPriorities';

import { registerVoteOnChain } from '@/app/actions/blockchain';

interface GovernanceUserProps {
  onViewProposal: (proposalId: string) => void;
  userProfile: any;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  deadline: string;
  status: 'pending_approval' | 'active' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  userVote?: boolean;
  comments?: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export function GovernanceUser({ onViewProposal, userProfile }: GovernanceUserProps) {
  const [proposals, setProposals] = useLocalStorage<Proposal[]>('wave_proposals', []);
  const [pendingProposals, setPendingProposals] = useLocalStorage<Proposal[]>('wave_pending_proposals', []);
  const [filter, setFilter] = useState<'all' | 'active' | 'approved' | 'rejected'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('filtro') === 'ativas'
      ? 'active'
      : 'all'
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'voting' | 'priorities'>('voting');
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const handleCreateProposal = (data: any) => {
    const newProposal = {
      id: Date.now().toString(),
      ...data,
      createdBy: userProfile.name,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'pending_approval' as const
    };

    // Adiciona à lista de propostas pendentes (para admin aprovar)
    setPendingProposals([...pendingProposals, newProposal]);
    setShowCreateModal(false);
    
    toast.success('Proposta enviada para aprovação do administrador!');
  };

  const handleVote = async (proposalId: string, support: boolean) => {
    // Optimistic update
    setProposals(
      proposals.map(p => {
        if (p.id === proposalId && !p.userVote && p.status === 'active') {
          return {
            ...p,
            votesFor: support ? p.votesFor + 1 : p.votesFor,
            votesAgainst: !support ? p.votesAgainst + 1 : p.votesAgainst,
            totalVotes: p.totalVotes + 1,
            userVote: support
          };
        }
        return p;
      })
    );

    try {
      toast.loading('Registrando voto na Stellar...', { id: 'vote-toast' });
      const result = await registerVoteOnChain(proposalId, support ? 'yes' : 'no', userProfile.id);
      
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

  const handleAddComment = (proposalId: string) => {
    const text = commentText[proposalId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: `${userProfile.name} - Apto ${userProfile.unit}`,
      content: text,
      createdAt: new Date()
    };

    setProposals(
      proposals.map(p => {
        if (p.id === proposalId) {
          return {
            ...p,
            comments: [...(p.comments || []), newComment]
          };
        }
        return p;
      })
    );

    setCommentText({ ...commentText, [proposalId]: '' });
  };

  const toggleComments = (proposalId: string) => {
    setExpandedComments(expandedComments === proposalId ? null : proposalId);
  };

  const filteredProposals = proposals.filter(proposal => {
    if (filter === 'all') return true;
    if (filter === 'active') return proposal.status === 'active';
    if (filter === 'approved') return proposal.status === 'approved';
    if (filter === 'rejected') return proposal.status === 'rejected';
    return true;
  });

  const activeProposals = proposals.filter(p => p.status === 'active');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Aguardando Aprovação
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-wave-100 text-wave-600 rounded-full text-sm">
            <Vote className="w-4 h-4" />
            Em Votação
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Aprovada
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            <XCircle className="w-4 h-4" />
            Rejeitada
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
          <h1 className="text-wave-800 text-3xl mb-2">Governança DAO</h1>
          <p className="text-wave-500">Participe das decisões do condomínio de forma transparente</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Proposta
        </button>
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
          Votações ({activeProposals.length})
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
                Em Votação ({activeProposals.length})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  filter === 'approved'
                    ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                    : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                }`}
              >
                Aprovadas
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  filter === 'rejected'
                    ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                    : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
                }`}
              >
                Rejeitadas
              </button>
            </div>
          </div>

          {/* Proposals List */}
          {filteredProposals.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-wave-100 shadow-lg text-center relative z-10">
              <Vote className="w-16 h-16 text-wave-300 mx-auto mb-4" />
              <h3 className="text-wave-800 text-xl mb-2">Nenhuma proposta encontrada</h3>
              <p className="text-wave-500 mb-4">
                {filter === 'all' 
                  ? 'Seja o primeiro a criar uma proposta!' 
                  : 'Nenhuma proposta nesta categoria'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg"
                >
                  Criar Primeira Proposta
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 relative z-10">
              {filteredProposals.map((proposal) => {
                const approvalRate = proposal.totalVotes > 0 
                  ? Math.round((proposal.votesFor / proposal.totalVotes) * 100) 
                  : 0;

                return (
                  <div
                    key={proposal.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-wave-800 text-xl">{proposal.title}</h3>
                          {getStatusBadge(proposal.status)}
                          <span className="px-3 py-1 bg-wave-100 text-wave-600 rounded-full text-xs">
                            {proposal.category}
                          </span>
                        </div>
                        <p className="text-wave-500 mb-3">{proposal.description}</p>
                        
                        {proposal.userVote !== undefined && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-wave-100 text-wave-400 rounded-full text-sm mb-3">
                            <CheckCircle className="w-4 h-4" />
                            Você votou: {proposal.userVote ? 'A Favor' : 'Contra'}
                          </div>
                        )}

                        <div className="text-sm text-wave-500">
                          Criada por {proposal.createdBy} em {proposal.createdAt}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onViewProposal(proposal.id)}
                          className="px-4 py-2 bg-wave-50 text-wave-500 rounded-lg hover:bg-wave-100 transition-all text-sm font-medium"
                        >
                          Ver Detalhes
                        </button>
                        
                        {proposal.status === 'active' && !proposal.userVote && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleVote(proposal.id, true)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Sim
                            </button>
                            <button
                              onClick={() => handleVote(proposal.id, false)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Não
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Voting Progress */}
                    {proposal.status === 'active' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-wave-600">Aprovação</span>
                          <span className="text-wave-800 font-medium">{approvalRate}%</span>
                        </div>
                        <div className="w-full h-3 bg-wave-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all"
                            style={{ width: `${approvalRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-green-600">
                            ✓ {proposal.votesFor} a favor
                          </span>
                          <span className="text-red-600">
                            ✗ {proposal.votesAgainst} contra
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {proposal.status === 'active' && proposal.userVote === undefined && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleVote(proposal.id, true)}
                          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Votar a Favor
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, false)}
                          className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Votar Contra
                        </button>
                      </div>
                    )}

                    {proposal.userVote !== undefined && proposal.status === 'active' && (
                      <div className="text-center py-3 bg-wave-50 rounded-xl text-wave-600">
                        Você já votou nesta proposta
                      </div>
                    )}

                    {/* Comments */}
                    <div className="mt-4">
                      <button
                        onClick={() => toggleComments(proposal.id)}
                        className="flex items-center gap-2 text-wave-500 hover:text-wave-600"
                      >
                        <MessageSquare className="w-5 h-5" />
                        {expandedComments === proposal.id ? 'Ocultar Comentários' : 'Ver Comentários'}
                      </button>
                      {expandedComments === proposal.id && (
                        <div className="mt-2">
                          {proposal.comments && proposal.comments.length > 0 ? (
                            <div className="space-y-2">
                              {proposal.comments.map(comment => (
                                <div
                                  key={comment.id}
                                  className="bg-wave-50 p-3 rounded-xl flex items-start gap-3"
                                >
                                  <User className="w-5 h-5 text-wave-500" />
                                  <div>
                                    <p className="text-wave-800 font-medium">{comment.author}</p>
                                    <p className="text-wave-500 text-sm">{comment.content}</p>
                                    <p className="text-wave-500 text-xs mt-1">
                                      {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-wave-500 text-sm">Nenhum comentário ainda.</p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-wave-500" />
                            <input
                              type="text"
                              value={commentText[proposal.id] || ''}
                              onChange={(e) => setCommentText({ ...commentText, [proposal.id]: e.target.value })}
                              placeholder="Adicione um comentário..."
                              className="flex-1 px-3 py-2 bg-wave-50 rounded-xl border border-wave-100 focus:outline-none focus:border-wave-300"
                            />
                            <button
                              onClick={() => handleAddComment(proposal.id)}
                              className="px-4 py-2 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Blockchain Info */}
      <div className="mt-8 bg-gradient-to-r from-wave-700 to-wave-500 rounded-2xl p-6 border border-wave-200 shadow-lg relative z-10">
        <div className="flex items-start gap-3">
          <Vote className="w-6 h-6 text-wave-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-wave-800 mb-2">Governança Transparente</h3>
            <p className="text-wave-600 text-sm mb-2">
              Propostas aprovadas pelo administrador são registradas de forma imutável na rede Stellar, 
              garantindo transparência total e impossibilidade de adulteração.
            </p>
            <p className="text-wave-500 text-sm">
              Suas propostas são primeiro revisadas e então publicadas para votação de todos os moradores.
            </p>
          </div>
        </div>
      </div>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <CreateProposalUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProposal}
        />
      )}
    </div>
  );
}
