/**
 * Sidebar shell — thin re-export for backward compatibility.
 * The hardcoded 54-item navigation array has been replaced by the
 * server-rendered SidebarServer which reads from tenant_modules + module_registry.
 *
 * Plan 12-06: Dynamic sidebar (tenant_modules-driven)
 */
export { SidebarServer as Sidebar } from './sidebar-server'
