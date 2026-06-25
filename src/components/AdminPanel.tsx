import { useState, useEffect } from 'react';
import { Shield, Rocket, CheckCircle, XCircle, Clock, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useContracts, generateHash } from '../hooks/useContracts';

import { toast } from 'sonner';
import { registerDocumentOnChain } from '@/app/actions/blockchain';

interface PendingProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  duration: number;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PendingDocument {
  id: string;
  title: string;
  category: string;
  fileContent: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ApprovedProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  status: 'approved';
  createdBy: string;
  createdAt: string;
  blockchainHash?: string;
}

/**
 * Pequeno componente auxiliar: gerar o hash SHA-256 agora roda no servidor
 * (Server Action), então é assíncrono. Em vez de bloquear a renderização do
 * AdminPanel inteiro, isolamos esse cálculo aqui com seu próprio estado.
 */
function DocumentHashPreview({ fileContent }: { fileContent: string }) {
  const [hash, setHash] = useState<string>('calculando…');

  useEffect(() => {
    let isMounted = true;
    generateHash(fileContent).then((h) => {
      if (isMounted) setHash(h);
    });
    return () => {
      isMounted = false;
    };
  }, [fileContent]);

  return <>{hash}</>;
}

export function AdminPanel() {
  const [pendingProposals, setPendingProposals] = useLocalStorage<PendingProposal[]>('wave_pending_proposals', []);
  const [pendingDocuments, setPendingDocuments] = useLocalStorage<PendingDocument[]>('wave_pending_documents', []);
  const { contracts, isConnected } = useContracts();
  const [deploying, setDeploying] = useState<string | null>(null);
  const [contractsDeployed, setContractsDeployed] = useLocalStorage('wave_contracts_deployed', false);

  const handleApproveProposal = async (proposal: PendingProposal) => {
    // Montar proposta com status 'active' para entrar em votação
    const activeProposal = {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      category: proposal.category,
      type: proposal.type,
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      quorum: 0,
      daysLeft: proposal.duration ?? 7,
      status: 'active' as const,
      created: proposal.createdAt,
      creator: proposal.createdBy,
      userVoted: null,
    };

    // Adicionar à lista de propostas ativas (wave_proposals)
    const currentProposals: any[] = JSON.parse(localStorage.getItem('wave_proposals') || '[]');
    localStorage.setItem('wave_proposals', JSON.stringify([activeProposal, ...currentProposals]));

    // Remover da fila de pendentes
    setPendingProposals(prev => prev.filter(p => p.id !== proposal.id));

    toast.success('Proposta aprovada e liberada para votação!', {
      description: `"${proposal.title}" já está disponível para os moradores votarem.`,
      duration: 5000,
    });
  };

  const handleRejectProposal = (proposalId: string) => {
    setPendingProposals(prev =>
      prev.map(p => p.id === proposalId ? { ...p, status: 'rejected' as const } : p)
    );
    toast.error('Proposta rejeitada.', { description: 'A proposta foi removida da fila.' });
  };

  const handleApproveDocument = async (document: PendingDocument) => {
    try {
      setDeploying(document.id);
      const contentHash = await generateHash(document.fileContent);
      const result = await registerDocumentOnChain(contentHash, 'admin');

      setPendingDocuments(prev =>
        prev.map(d => d.id === document.id ? { ...d, status: 'approved' as const } : d)
      );

      if (result.success) {
        toast.success('Documento aprovado e hash ancorado na Stellar!', {
          description: `Tx: ${result.txHash.slice(0, 12)}...`,
          action: { label: 'Ver na Stellar', onClick: () => window.open(result.explorerUrl, '_blank') },
          duration: 7000,
        });
      } else {
        toast.success('Documento aprovado!', {
          description: 'Ancoragem na Stellar indisponível (configure WAVE_STELLAR_SECRET), mas documento aprovado.',
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao aprovar documento.');
    } finally {
      setDeploying(null);
    }
  };

  const handleRejectDocument = (documentId: string) => {
    setPendingDocuments(prev =>
      prev.map(d => d.id === documentId ? { ...d, status: 'rejected' as const } : d)
    );
    toast.error('Documento rejeitado.');
  };

  const pendingProposalsCount = pendingProposals.filter(p => p.status === 'pending' || p.status === 'pending_approval').length;
  const pendingDocumentsCount = pendingDocuments.filter(d => d.status === 'pending' || d.status === 'pending_approval').length;

  return (
    <div className="p-8 bg-gradient-to-br from-wave-700 to-wave-500 min-h-screen relative">
      

      {/* Header */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-wave-500" />
          <h1 className="text-wave-800 text-3xl">Painel Administrativo</h1>
        </div>
        <p className="text-wave-500">
          Gerencie aprovações de propostas/documentos e a ancoragem de hashes na Stellar
        </p>
      </div>

      {/* Operator Account Status */}
      <div className={`mb-8 p-6 rounded-2xl border-2 shadow-lg relative z-10 ${
        isConnected 
          ? 'bg-green-50 border-green-300' 
          : 'bg-orange-50 border-orange-300'
      }`}>
        <div className="flex items-start gap-3">
          {isConnected ? (
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
          ) : (
            <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
          )}
          <div className="flex-1">
            <h3 className={`mb-2 ${isConnected ? 'text-green-900' : 'text-orange-900'}`}>
              {isConnected ? '✅ Sessão de Administrador Ativa' : '⚠️ Login Necessário'}
            </h3>
            {isConnected ? (
              <div className="text-sm text-green-700">
                <p>Você pode aprovar propostas e documentos. O hash de cada aprovação é ancorado automaticamente na Stellar pela conta operacional da Wave — não é necessário conectar nenhuma carteira pessoal.</p>
              </div>
            ) : (
              <div className="text-sm text-orange-700">
                <p>
                  Faça login como Administrador para aprovar e registrar itens.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Info */}
      {!contractsDeployed && (
        <div className="mb-8 bg-wave-100 border-2 border-wave-300 rounded-2xl p-6 shadow-lg relative z-10">
          <div className="flex items-start gap-3 mb-4">
            <Rocket className="w-6 h-6 text-wave-500 mt-1" />
            <div className="flex-1">
              <h3 className="text-wave-800 mb-2">Configurar Conta Operacional Stellar</h3>
              <p className="text-wave-600 text-sm mb-4">
                Antes de aprovar propostas e documentos, configure a conta da Wave na rede Stellar.
                Não há contratos para deployar — apenas uma conta que assina as ancoragens de hash.
              </p>
              <div className="bg-white rounded-xl p-4 mb-4">
                <h4 className="text-wave-800 mb-2">Passos para Configurar:</h4>
                <ol className="list-decimal list-inside text-sm text-wave-600 space-y-1">
                  <li>Gere um par de chaves Stellar (ex: no Stellar Laboratory)</li>
                  <li>Fundeie a conta de testnet via Friendbot (XLM de teste, gratuito)</li>
                  <li>Configure <code className="bg-wave-100 px-2 py-1 rounded">WAVE_STELLAR_SECRET</code> no .env</li>
                  <li>Marque como configurado abaixo</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <a
                  href="https://laboratory.stellar.org/#account-creator?network=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-wave-500 text-white rounded-xl hover:bg-wave-600 transition-all text-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Criar Conta de Testnet
                </a>
                <button
                  onClick={() => setContractsDeployed(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm"
                >
                  Marcar como Configurado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-wave-800 text-lg">Propostas Pendentes</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
              {pendingProposalsCount}
            </span>
          </div>
          <p className="text-wave-500 text-sm">
            Aguardando aprovação para registro na Stellar
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-wave-800 text-lg">Documentos Pendentes</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
              {pendingDocumentsCount}
            </span>
          </div>
          <p className="text-wave-500 text-sm">
            Aguardando aprovação para registro na Stellar
          </p>
        </div>
      </div>

      {/* Pending Proposals */}
      <div className="mb-8 relative z-10">
        <h2 className="text-wave-800 text-2xl mb-4">Propostas Pendentes</h2>
        
        {pendingProposals.filter(p => p.status === 'pending' || p.status === 'pending_approval').length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-12 text-center shadow-lg">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <p className="text-wave-500">Nenhuma proposta aguardando aprovação</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingProposals
              .filter(p => p.status === 'pending' || p.status === 'pending_approval')
              .map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-wave-800 text-xl mb-2">{proposal.title}</h3>
                      <p className="text-wave-500 mb-3">{proposal.description}</p>
                      <div className="flex items-center gap-3 text-sm text-wave-500">
                        <span className="px-3 py-1 bg-wave-100 rounded-full">{proposal.category}</span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">{proposal.type}</span>
                        <span>Criado por: {proposal.createdBy}</span>
                        <span>•</span>
                        <span>{proposal.createdAt}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs text-wave-500">Pendente</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveProposal(proposal)}
                      disabled={deploying === proposal.id}
                      className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        deploying !== proposal.id
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {deploying === proposal.id ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Registrando na Stellar...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Aprovar para Votação
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      disabled={deploying === proposal.id}
                      className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Pending Documents */}
      <div className="relative z-10">
        <h2 className="text-wave-800 text-2xl mb-4">Documentos Pendentes</h2>
        
        {pendingDocuments.filter(d => d.status === 'pending' || d.status === 'pending_approval').length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-12 text-center shadow-lg">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <p className="text-wave-500">Nenhum documento aguardando aprovação</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDocuments
              .filter(d => d.status === 'pending' || d.status === 'pending_approval')
              .map((document) => (
                <div
                  key={document.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-wave-800 text-xl mb-2">{document.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-wave-500 mb-3">
                        <span className="px-3 py-1 bg-wave-100 rounded-full">{document.category}</span>
                        <span>Enviado por: {document.uploadedBy}</span>
                        <span>•</span>
                        <span>{document.uploadedAt}</span>
                      </div>
                      <div className="bg-wave-50 rounded-xl p-3">
                        <p className="text-wave-500 text-sm mb-1">Hash SHA-256:</p>
                        <p className="text-wave-800 text-xs font-mono break-all">
                          <DocumentHashPreview fileContent={document.fileContent} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs text-wave-500">Pendente</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveDocument(document)}
                      disabled={deploying === document.id}
                      className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        deploying !== document.id
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {deploying === document.id ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Registrando na Stellar...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Aprovar e Registrar na Stellar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectDocument(document.id)}
                      disabled={deploying === document.id}
                      className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Blockchain Info */}
      <div className="mt-8 bg-gradient-to-r from-wave-700 to-wave-500 rounded-2xl p-6 border border-wave-200 shadow-lg relative z-10">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-wave-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-wave-800 mb-2">🌊 Fluxo Completo de Aprovação</h3>
            <p className="text-wave-600 text-sm mb-3">
              <strong>Como funciona na Wave:</strong>
            </p>
            <div className="bg-white rounded-xl p-4 mb-3">
              <h4 className="text-wave-800 mb-2">📋 PROPOSTAS (3 etapas):</h4>
              <ol className="list-decimal list-inside text-wave-600 text-sm space-y-1">
                <li><strong>Criação:</strong> Morador/Síndico cria proposta {'→'} Fica pendente (ainda não registrado na Stellar)</li>
                <li><strong>Aprovação Admin:</strong> Você aprova {'→'} Proposta liberada para VOTAÇÃO (ainda ainda não registrado na Stellar)</li>
                <li><strong>Votação:</strong> Moradores votam {'→'} Se aprovada por maioria, ENTÃO registra na Stellar automaticamente</li>
              </ol>
            </div>
            <div className="bg-white rounded-xl p-4">
              <h4 className="text-wave-800 mb-2">📄 DOCUMENTOS (2 etapas):</h4>
              <ol className="list-decimal list-inside text-wave-600 text-sm space-y-1">
                <li><strong>Upload:</strong> Usuário faz upload {'→'} Documento fica pendente</li>
                <li><strong>Aprovação Admin:</strong> Você aprova {'→'} Registra diretamente na rede Stellar</li>
              </ol>
            </div>
            <p className="text-wave-500 text-sm mt-3">
              ⚠️ <strong>Importante:</strong> Propostas só vão para a Stellar APÓS aprovação dos moradores na votação!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}