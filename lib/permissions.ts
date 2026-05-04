/**
 * RBAC Macofel — roles alinhados ao Prisma `UserRole`.
 * CLIENT = área do cliente (equivalente ao “CUSTOMER” na documentação de produto).
 *
 * Resumo por papel (matriz de produto):
 * - MASTER_ADMIN: tudo do Admin + criar/editar admins, config global (taxas, DevNota, PDV),
 *   auditoria, reset de senhas, exportação total.
 * - ADMIN: produtos/categorias, pedidos, clientes, relatórios, criar vendedor/funcionário/logística, PDV terminais/impressoras.
 * - STORE_MANAGER: tudo do vendedor + relatórios da loja, trocas/devoluções, estoque físico, caixas PDV;
 *   no Mongo de orçamentos PDV: os seus, os dos vendedores e legados sem autor — não vê solicitações do site;
 *   sem integração Telegram (`canUseStaffTelegramBot`).
 * - GERENTE_SITE: gerente de loja + canal site; acede ao painel `/admin` para catálogo (produtos,
 *   pedidos, clientes, categorias, hero, orçamentos admin). Gestão de equipa (`/admin/equipe`,
 *   APIs `users`) fica só para ADMIN e MASTER_ADMIN.
 * - SELLER: PDV completo, estoque em tempo real, NFC-e, cliente rápido, histórico do caixa;
 *   orçamentos PDV só os que criou; vendas PDV só as suas; não vê solicitações de clientes no site;
 *   sem integração Telegram (`canUseStaffTelegramBot`).
 * - EMPLOYEE: consulta estoque, entrada/saída mercadoria, status preparo — sem fechar venda/NFC-e.
 * - LOGISTICS: fila envio, status entrega, retirada balcão, dados de entrega — PDV só leitura quando existir UI.
 * - CLIENT: apenas portal (pedidos, perfil, carrinho).
 *
 * Uso: `hasPermission(role, '…')` para gates finos; `isAdminDashboardRole` / `hasPdvFullWebAccess` /
 * `isPainelLojaRole` / `canOpenPainelLoja` para rotas (`/admin`, `/loja`, `/painel-loja`).
 */

export type UserRole =
  | 'CLIENT'
  | 'LOGISTICS'
  | 'EMPLOYEE'
  | 'SELLER'
  | 'STORE_MANAGER'
  | 'GERENTE_SITE'
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
  | 'customer:web_portal'
  /** Fila e tratamento de solicitações de orçamento enviadas por clientes no site. */
  | 'site:client_quote_requests'
  /** Reservado: pedidos/vendas gerados pelo e-commerce (quando existir UI). */
  | 'site:online_sales';

export const ROLE_LEVEL: Record<UserRole, number> = {
  CLIENT: 0,
  LOGISTICS: 1,
  EMPLOYEE: 1,
  SELLER: 2,
  STORE_MANAGER: 3,
  GERENTE_SITE: 3,
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

const SITE_CHANNEL_STAFF: AppPermission[] = ['site:client_quote_requests', 'site:online_sales'];

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
  GERENTE_SITE: new Set<AppPermission>([
    ...ALL_ADMIN,
    ...ALL_SELLER,
    ...ALL_STORE_MANAGER,
    ...SITE_CHANNEL_STAFF,
  ]),
  ADMIN: new Set<AppPermission>([
    ...ALL_ADMIN,
    ...ALL_SELLER,
    ...ALL_STORE_MANAGER,
    ...SITE_CHANNEL_STAFF,
  ]),
  MASTER_ADMIN: new Set<AppPermission>([
    ...ALL_MASTER,
    ...ALL_ADMIN,
    ...ALL_SELLER,
    ...ALL_STORE_MANAGER,
    ...SITE_CHANNEL_STAFF,
  ]),
};

export function parseUserRole(role: string | undefined | null): UserRole | null {
  if (!role) return null;
  if (role in ROLE_PERMISSIONS) return role as UserRole;
  return null;
}

/** Qualquer conta de equipa (papéis Prisma exceto CLIENT). */
export function isOperationalStaffRole(role: string | undefined | null): boolean {
  const r = parseUserRole(role);
  if (!r) return false;
  return r !== 'CLIENT';
}

/**
 * Pode gerar código de vínculo e usar as APIs do bot (Telegram).
 * Por política Macofel: vendedor e gerente de loja usam só o painel web, não o Telegram.
 */
export function canUseStaffTelegramBot(role: string | undefined | null): boolean {
  if (!isOperationalStaffRole(role)) return false;
  if (role === 'SELLER' || role === 'STORE_MANAGER') return false;
  return true;
}

export function hasPermission(
  role: string | undefined | null,
  permission: AppPermission
): boolean {
  const r = parseUserRole(role);
  if (!r) return false;
  return ROLE_PERMISSIONS[r].has(permission);
}

/**
 * Painel web `/admin` (produtos, pedidos, clientes, hero, etc.).
 * Inclui GERENTE_SITE para operar loja online; exclusões finas (equipa) usam `canManageStaffDirectory`.
 */
export function isAdminDashboardRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'GERENTE_SITE';
}

/** Criar/editar funcionários e senhas da equipa — só ADMIN e MASTER (não Gerente site). */
export function canManageStaffDirectory(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'MASTER_ADMIN';
}

/** Área exclusiva `/admin/master/*` — apenas MASTER_ADMIN. */
export function isMasterAdminRole(role: string | undefined | null): boolean {
  return role === 'MASTER_ADMIN';
}

/** Rota Next.js sob o painel admin reservada ao master. */
export function isMasterAdminPathname(pathname: string): boolean {
  return pathname === '/admin/master' || pathname.startsWith('/admin/master/');
}

/** PDV web `/loja`: venda completa (vendedor, gerente, admin). */
export function hasPdvFullWebAccess(role: string | undefined | null): boolean {
  return (
    role === 'MASTER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'STORE_MANAGER' ||
    role === 'GERENTE_SITE' ||
    role === 'SELLER'
  );
}

/** Área `/painel-loja` — vendedor, gerente de loja e gerente site (sem backoffice Admin completo). */
export function isPainelLojaRole(role: string | undefined | null): boolean {
  return role === 'STORE_MANAGER' || role === 'GERENTE_SITE' || role === 'SELLER';
}

/**
 * Quem pode aceder a rotas sob `/painel-loja` (middleware).
 * Inclui Admin/Master para verem as mesmas páginas reexportadas (ex.: solicitações de orçamento) e links em e-mail.
 */
export function canOpenPainelLoja(role: string | undefined | null): boolean {
  return isPainelLojaRole(role) || isAdminDashboardRole(role);
}

/** Relatórios de caixa / visão “loja” no painel (não filtrar só pelo operador). */
export function isPainelLojaGerenteScopeRole(role: string | undefined | null): boolean {
  return role === 'STORE_MANAGER' || role === 'GERENTE_SITE';
}

/** Gerente site: mesmo âmbito de gerente de loja no painel + canal site (solicitações de orçamento, etc.). */
export function isGerenteSiteRole(role: string | undefined | null): boolean {
  return role === 'GERENTE_SITE';
}

/** Orçamentos salvos no PDV (Mongo `orcamentos`) — equipa operacional, exceto cliente. */
export function canManagePdvOrcamentos(role: string | undefined | null): boolean {
  return isOperationalStaffRole(role);
}

/** Solicitações de orçamento (`quote_requests`) e, no futuro, vendas do site — Master, Admin, Gerente site. */
export function canManageClientQuoteRequests(role: string | undefined | null): boolean {
  return hasPermission(role, 'site:client_quote_requests');
}

/** Pedidos/vendas do canal web (quando houver módulo dedicado). */
export function canViewSiteOnlineSales(role: string | undefined | null): boolean {
  return hasPermission(role, 'site:online_sales');
}

/**
 * @deprecated Preferir `canManagePdvOrcamentos` ou `canManageClientQuoteRequests`.
 * Mantido por compatibilidade: equivale a orçamentos PDV (equipa não-cliente).
 */
export function canManageQuotesAndOrcamentos(role: string | undefined | null): boolean {
  return canManagePdvOrcamentos(role);
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
