import type { UserRole } from '@/lib/permissions';

/** Valores aceites pelo Prisma `UserRole` (ordem para UI). */
export const ASSIGNABLE_ROLES: UserRole[] = [
  'CLIENT',
  'LOGISTICS',
  'EMPLOYEE',
  'SELLER',
  'STORE_MANAGER',
  'GERENTE_SITE',
  'ADMIN',
  'MASTER_ADMIN',
];

/** Roles que o Master pode criar no cadastro de funcionário (não inclui CLIENT — usa /signup). */
export const MASTER_STAFF_CREATION_ROLES: UserRole[] = ASSIGNABLE_ROLES.filter(
  (r) => r !== 'CLIENT'
);

export const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  LOGISTICS: 'Logística',
  EMPLOYEE: 'Funcionário',
  SELLER: 'Vendedor',
  STORE_MANAGER: 'Gerente de loja',
  GERENTE_SITE: 'Gerente site',
  ADMIN: 'Administrador',
  MASTER_ADMIN: 'Master Admin',
};

export function parseAssignableRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  return ASSIGNABLE_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

export type RoleChangeErrorCode = 'LAST_MASTER_ADMIN';

/**
 * Impede ficar sem nenhum Master Admin ao rebaixar o último.
 * `masterAdminCount` = total atual na base antes do update.
 */
export function validateMasterRoleDemotion(params: {
  targetCurrentRole: UserRole;
  newRole: UserRole;
  masterAdminCount: number;
}): { ok: true } | { ok: false; code: RoleChangeErrorCode; message: string } {
  if (params.targetCurrentRole === params.newRole) {
    return { ok: true };
  }

  if (
    params.targetCurrentRole === 'MASTER_ADMIN' &&
    params.newRole !== 'MASTER_ADMIN' &&
    params.masterAdminCount < 2
  ) {
    return {
      ok: false,
      code: 'LAST_MASTER_ADMIN',
      message:
        'Tem de existir pelo menos um Master Admin. Promova outro utilizador antes de rebaixar este.',
    };
  }

  return { ok: true };
}
