/**
 * RBAC Macofel — roles alinhados ao Prisma `UserRole`.
 * CLIENT = área do cliente (equivalente ao “CUSTOMER” na documentação de produto).
 *
 * Resumo por papel (matriz de produto):
 * - MASTER_ADMIN: tudo do Admin + criar/editar admins, config global (taxas, DevNota, PDV),
 *   auditoria, reset de senhas, exportação total.
 * - ADMIN: produtos/categorias, pedidos, clientes, relatórios, criar vendedor/funcionário/logística, PDV terminais/impressoras.
 * - STORE_MANAGER: tudo do vendedor + relatórios da loja, trocas/devoluções, estoque físico, caixas PDV.
 * - SELLER: PDV completo, estoque em tempo real, NFC-e, cliente rápido, histórico do caixa.
 * - EMPLOYEE: consulta estoque, entrada/saída mercadoria, status preparo — sem fechar venda/NFC-e.
 * - LOGISTICS: fila envio, status entrega, retirada balcão, dados de entrega — PDV só leitura quando existir UI.
 * - CLIENT: apenas portal (pedidos, perfil, carrinho).
 *
 * Uso: `hasPermission(role, '…')` para gates finos; `isAdminDashboardRole` / `hasPdvFullWebAccess` para rotas atuais.
 */

export type UserRole =
  | 'CLIENT'
  | 'LOGISTICS'
  | 'EMPLOYEE'
  | 'SELLER'
  | 'STORE_MANAGER'
  | 'ADMIN'
  | 'MASTER_ADMIN';

export type AppPermission =
  | 'master:manage_admins'
  | 'master:global_settings'
  | 'master:audit_logs_full'
  | 'master:reset_any_password'
  | 'master:export_all_data'
  | 'admin:products_crud'
  | 'admin:categories'
  | 'admin:orders_view_change_status'
  | 'admin:clients_manage'
  | 'admin:reports_full'
  | 'admin:manage_seller_employee_logistics'
  | 'admin:pdv_terminals_printers'
  | 'store:store_reports'
  | 'store:approve_returns'
  | 'store:physical_stock'
  | 'store:pdv_cash_register_config'
  | 'store:lock_unlock_registers'
  | 'pdv:full_sale_barcode_nfce'
  | 'pdv:stock_realtime'
  | 'pdv:quick_customer'
  | 'pdv:own_register_sales_history'
  | 'employee:stock_consult'
  | 'employee:goods_in_out'
  | 'employee:order_prep_status'
  | 'logistics:pending_shipments'
  | 'logistics:delivery_status'
  | 'logistics:counter_pickup'
  | 'logistics:view_delivery_address'
  | 'customer:web_portal';

export const ROLE_LEVEL: Record<UserRole, number> = {
  CLIENT: 0,
  LOGISTICS: 1,
  EMPLOYEE: 1,
  SELLER: 2,
  STORE_MANAGER: 3,
  ADMIN: 4,
  MASTER_ADMIN: 5,
};

const ALL_MASTER: AppPermission[] = [
  'master:manage_admins',
  'master:global_settings',
  'master:audit_logs_full',
  'master:reset_any_password',
  'master:export_all_data',
];

const ALL_ADMIN: AppPermission[] = [
  'admin:products_crud',
  'admin:categories',
  'admin:orders_view_change_status',
  'admin:clients_manage',
  'admin:reports_full',
  'admin:manage_seller_employee_logistics',
  'admin:pdv_terminals_printers',
];

const ALL_STORE_MANAGER: AppPermission[] = [
  'store:store_reports',
  'store:approve_returns',
  'store:physical_stock',
  'store:pdv_cash_register_config',
  'store:lock_unlock_registers',
];

const ALL_SELLER: AppPermission[] = [
  'pdv:full_sale_barcode_nfce',
  'pdv:stock_realtime',
  'pdv:quick_customer',
  'pdv:own_register_sales_history',
];

const ALL_EMPLOYEE: AppPermission[] = [
  'employee:stock_consult',
  'employee:goods_in_out',
  'employee:order_prep_status',
];

const ALL_LOGISTICS: AppPermission[] = [
  'logistics:pending_shipments',
  'logistics:delivery_status',
  'logistics:counter_pickup',
  'logistics:view_delivery_address',
];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<AppPermission>> = {
  CLIENT: new Set<AppPermission>(['customer:web_portal']),
  LOGISTICS: new Set<AppPermission>([...ALL_LOGISTICS]),
  EMPLOYEE: new Set<AppPermission>([...ALL_EMPLOYEE]),
  SELLER: new Set<AppPermission>([...ALL_SELLER]),
  STORE_MANAGER: new Set<AppPermission>([...ALL_SELLER, ...ALL_STORE_MANAGER]),
  ADMIN: new Set<AppPermission>([...ALL_ADMIN, ...ALL_SELLER, ...ALL_STORE_MANAGER]),
  MASTER_ADMIN: new Set<AppPermission>([
    ...ALL_MASTER,
    ...ALL_ADMIN,
    ...ALL_SELLER,
    ...ALL_STORE_MANAGER,
  ]),
};

export function parseUserRole(role: string | undefined | null): UserRole | null {
  if (!role) return null;
  if (role in ROLE_PERMISSIONS) return role as UserRole;
  return null;
}

export function hasPermission(
  role: string | undefined | null,
  permission: AppPermission
): boolean {
  const r = parseUserRole(role);
  if (!r) return false;
  return ROLE_PERMISSIONS[r].has(permission);
}

/** Painel web `/admin` (produtos, clientes, hero, etc.) — hoje só ADMIN + MASTER. */
export function isAdminDashboardRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'MASTER_ADMIN';
}

/** PDV web `/loja`: venda completa (vendedor, gerente, admin). */
export function hasPdvFullWebAccess(role: string | undefined | null): boolean {
  return (
    role === 'MASTER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'STORE_MANAGER' ||
    role === 'SELLER'
  );
}

export function isCustomerRole(role: string | undefined | null): boolean {
  return role === 'CLIENT' || !role;
}

export function roleAtLeast(
  role: string | undefined | null,
  min: UserRole
): boolean {
  const r = parseUserRole(role);
  if (!r) return false;
  return ROLE_LEVEL[r] >= ROLE_LEVEL[min];
}
