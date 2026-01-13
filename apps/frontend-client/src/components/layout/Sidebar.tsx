import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Package,
  PlusCircle,
  BookOpen,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '@/utils/helpers';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  highlight?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: 'Assistant intelligent', href: '/', icon: Sparkles, highlight: true },
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Nouveau ticket', href: '/tickets/new', icon: PlusCircle },
  { label: 'Mes tickets', href: '/tickets', icon: Ticket },
  { label: 'Mes commandes', href: '/orders', icon: Package },
];

const ticketNavItems: NavItem[] = [
  { label: 'En cours', href: '/tickets?status=IN_PROGRESS', icon: Clock },
  { label: 'En attente', href: '/tickets?status=WAITING_CUSTOMER', icon: AlertCircle },
  { label: 'Résolus', href: '/tickets?status=RESOLVED', icon: CheckCircle },
];

const supportNavItems: NavItem[] = [
  { label: 'FAQ', href: '/faq', icon: BookOpen },
  { label: 'Base de connaissances', href: '/knowledge', icon: FileText },
  { label: 'Contact', href: '/contact', icon: MessageSquare },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const NavSection = ({ title, items }: { title?: string; items: NavItem[] }) => (
    <div className="mb-6">
      {title && (
        <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && item.href !== '/dashboard' && location.pathname.startsWith(item.href.split('?')[0]));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : item.highlight
                    ? 'text-primary-600 hover:bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={20} className={cn(
                'mr-3',
                isActive
                  ? 'text-primary-600'
                  : item.highlight
                    ? 'text-primary-500'
                    : 'text-gray-400'
              )} />
              <span className="flex-1">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                </span>
              )}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full overflow-y-auto py-6">
          <NavSection items={mainNavItems} />
          <NavSection title="Mes tickets" items={ticketNavItems} />
          <NavSection title="Aide" items={supportNavItems} />

          {/* AI Assistant card */}
          <div className="mx-4 mt-8 p-4 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl text-white">
            <div className="flex items-center mb-2">
              <Bot size={20} className="mr-2" />
              <h4 className="font-semibold">Assistant IA</h4>
            </div>
            <p className="text-sm text-primary-100 mb-3">
              Notre IA peut resoudre 80% des problemes instantanement.
            </p>
            <NavLink
              to="/"
              onClick={onClose}
              className="inline-flex items-center text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap size={14} className="mr-1" />
              Demarrer
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
