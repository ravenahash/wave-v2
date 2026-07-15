// ---------------------------------------------------------------------------
// src/lib/formatName.ts
//
// Responsabilidade única: formatar o nome de exibição do usuário (primeiro
// nome + último sobrenome) para uso em cabeçalhos/telas com pouco espaço,
// mantendo o nome completo disponível onde for necessário (ex: atributo
// alt de imagens, saudações formais, documentos).
// ---------------------------------------------------------------------------

export function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] ?? '';
  }

  return `${parts[0]} ${parts[parts.length - 1]}`;
}