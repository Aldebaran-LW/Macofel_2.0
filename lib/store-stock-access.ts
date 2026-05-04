import { canAccessAdminCatalogSession, hasPermission } from '@/lib/permissions';

/** APIs de estoque físico: Admin ou Gerente com `store:physical_stock`. */
export function canAccessPhysicalStockApi(role: string | undefined | null): boolean {
  return canAccessAdminCatalogSession(role) || hasPermission(role, 'store:physical_stock');
}
