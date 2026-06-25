'use server';

/**
 * Wave · Server Actions de Ancoragem na Blockchain (Stellar)
 * ---------------------------------------------------------------------------
 * Estas funções são chamadas pelo frontend (via useContracts / 
 * useBlockchainAutoRegistry) sempre que um evento crítico precisa de prova
 * de integridade: voto encerrado, proposta aprovada, documento/ata aprovada,
 * pagamento confirmado.
 *
 * Mantemos os MESMOS NOMES de função que existiam na versão anterior
 * (que simulava Ethereum/Base) para não exigir mudanças em cascata no
 * restante do app. Por dentro, agora chamam a Stellar Testnet de verdade.
 */

import { anchorHashOnStellar, sha256Hex, verifyAnchoredHash } from '@/lib/stellar';

/**
 * Registra um voto, ancorando o hash do conteúdo do voto na Stellar.
 */
export async function registerVoteOnChain(proposalId: string, vote: string, userId: string) {
  const payload = JSON.stringify({ proposalId, vote, userId, ts: Date.now() });
  const hash = await sha256Hex(payload);
  const result = await anchorHashOnStellar(hash);

  return {
    success: result.success,
    txHash: result.txHash,
    documentHash: `0x${hash}`,
    explorerUrl: result.explorerUrl,
    timestamp: result.timestamp,
    error: result.error,
  };
}

/**
 * Registra uma proposta aprovada, ancorando o hash do conteúdo na Stellar.
 */
export async function createProposalOnChain(proposalData: any, userId: string) {
  const payload = JSON.stringify({ proposalData, userId, ts: Date.now() });
  const hash = await sha256Hex(payload);
  const result = await anchorHashOnStellar(hash);

  return {
    success: result.success,
    txHash: result.txHash,
    documentHash: `0x${hash}`,
    proposalId: Date.now().toString(),
    explorerUrl: result.explorerUrl,
    timestamp: result.timestamp,
    error: result.error,
  };
}

/**
 * Registra o hash de um documento (ata, prestação de contas, comprovante)
 * na Stellar. O documento em si NUNCA é enviado à blockchain — apenas
 * seu hash SHA-256.
 */
export async function registerDocumentOnChain(docHash: string, userId: string) {
  const cleanHash = docHash.replace(/^0x/, '');
  const result = await anchorHashOnStellar(cleanHash);

  return {
    success: result.success,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    timestamp: result.timestamp,
    error: result.error,
  };
}

/**
 * Verifica se um documento corresponde ao hash ancorado na Stellar.
 * Usado pelo botão "Verificar autenticidade".
 */
export async function verifyDocumentOnChain(stellarTxHash: string, currentContentHash: string) {
  const anchored = await verifyAnchoredHash(stellarTxHash);
  const cleanCurrentHash = currentContentHash.replace(/^0x/, '');

  if (!anchored.found) {
    return { verified: false, reason: 'Transação não encontrada na Stellar.' };
  }

  const matches = anchored.memoHashHex === cleanCurrentHash;

  return {
    verified: matches,
    reason: matches
      ? 'Hash corresponde ao conteúdo atual. Documento não foi alterado.'
      : 'Hash NÃO corresponde. O conteúdo pode ter sido alterado após o registro.',
    ledger: anchored.ledger,
    createdAt: anchored.createdAt,
  };
}

/**
 * Gera o hash SHA-256 de um conteúdo (ata, comprovante, payload de voto).
 */
export async function hashDocument(content: string) {
  const hash = await sha256Hex(content);
  return `0x${hash}`;
}

/**
 * Função genérica usada pelo useBlockchainAutoRegistry: recebe qualquer
 * metadata (pagamento, cadastro de usuário, transação financeira etc.),
 * gera o hash do conteúdo e ancora na Stellar. Usada quando o evento não
 * tem uma Server Action dedicada (como votos e documentos têm).
 */
export async function anchorMetadataOnChain(metadata: Record<string, unknown>) {
  const payload = JSON.stringify(metadata);
  const hash = await sha256Hex(payload);
  const result = await anchorHashOnStellar(hash);

  return {
    success: result.success,
    txHash: result.txHash,
    documentHash: `0x${hash}`,
    explorerUrl: result.explorerUrl,
    ledger: result.ledger,
    timestamp: result.timestamp,
    error: result.error,
  };
}