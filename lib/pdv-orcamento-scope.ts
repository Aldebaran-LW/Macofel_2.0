import { parseUserRole } from '@/lib/permissions';

/** Escopo de listagem/leitura de orçamentos Mongo (`orcamentos`), fora das solicitações do site. */
export type OrcamentoMongoListScope =
  | { kind: 'full' }
  | { kind: 'seller_self'; userId: string }
  | { kind: 'manager_loja'; managerUserId: string };

const NO_SESSION_USER = '__no_session_user__';

export function getOrcamentoMongoListScope(
  role: string | undefined,
  userId: string | undefined
): OrcamentoMongoListScope {
  const r = parseUserRole(role);
  const uid = userId?.trim() ? userId.trim() : undefined;
  if (!uid) {
    if (r === 'SELLER' || r === 'STORE_MANAGER' || r === 'GERENTE_SITE') {
      return { kind: 'seller_self', userId: NO_SESSION_USER };
    }
    return { kind: 'full' };
  }
  if (r === 'SELLER') return { kind: 'seller_self', userId: uid };
  if (r === 'STORE_MANAGER' || r === 'GERENTE_SITE') {
    return { kind: 'manager_loja', managerUserId: uid };
  }
  return { kind: 'full' };
}

/** Filtro Mongo a combinar com a pesquisa por cliente (ex.: `$and`). */
export function orcamentoScopeToMongoFilter(scope: OrcamentoMongoListScope): Record<string, unknown> {
  if (scope.kind === 'full') return {};
  if (scope.kind === 'seller_self') {
    return { createdByUserId: scope.userId };
  }
  const mid = scope.managerUserId;
  return {
    $or: [
      { createdByUserId: mid },
      { createdByRole: 'SELLER' },
      { createdByUserId: { $exists: false } },
      { createdByUserId: null },
    ],
  };
}

type OrcamentoAuthDoc = {
  createdByUserId?: unknown;
  createdByRole?: unknown;
};

export function orcamentoDocMatchesScope(doc: OrcamentoAuthDoc, scope: OrcamentoMongoListScope): boolean {
  if (scope.kind === 'full') return true;
  const uid =
    doc.createdByUserId != null && String(doc.createdByUserId).trim() !== ''
      ? String(doc.createdByUserId)
      : null;
  const creatorRole =
    doc.createdByRole != null && String(doc.createdByRole).trim() !== ''
      ? String(doc.createdByRole)
      : null;
  if (scope.kind === 'seller_self') {
    return uid === scope.userId;
  }
  if (scope.kind === 'manager_loja') {
    if (uid === scope.managerUserId) return true;
    if (creatorRole === 'SELLER') return true;
    if (uid == null) return true;
    return false;
  }
  return true;
}
