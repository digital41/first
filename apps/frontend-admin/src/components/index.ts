// ============================================
// COMPOSANTS ADMIN - EXPORTS
// ============================================

// Core components
export { default as AdminDashboard } from './AdminDashboard';
export { default as AdminLogin } from './AdminLogin';
export { default as TicketDetail } from './TicketDetail';

// Enhancement components (additive features)
export { default as SLACountdown } from './SLACountdown';
export { default as QuickActionsBar } from './QuickActionsBar';
export { default as TicketPreviewPanel } from './TicketPreviewPanel';
export { default as AgentWorkloadWidget } from './AgentWorkloadWidget';
export { default as SmartFilterPresets } from './SmartFilterPresets';

// Queue module (Operator Inbox)
export { OperatorQueuePage, QueueItem } from './queue';

// Macros module
export { MacrosAdminPage, MacroEditor, MacroSelector } from './macros';

// Time tracking module
export { TimeSpentBadge, TimeTrackingPanel } from './timetracking';

// Export module
export { ExportButton } from './exports';

// SLA Alerts module
export { SLAAlertCenter, SLAAlertBanner } from './alerts';

// User Management module (ADMIN only)
export { UsersAdminPage, UserFormModal } from './users';
