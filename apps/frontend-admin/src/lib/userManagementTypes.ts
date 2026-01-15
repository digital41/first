// ============================================
// USER MANAGEMENT TYPES & HELPERS
// ============================================
// Types et utilitaires pour la gestion des utilisateurs (opérateurs)

// ============================================
// ENUMS
// ============================================

// Rôles alignés avec le backend Prisma
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR', // Manager/Superviseur
  AGENT = 'AGENT', // Opérateur
  // Alias pour rétrocompatibilité
  MANAGER = 'SUPERVISOR',
  OPERATOR = 'AGENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// ============================================
// TYPES
// ============================================

export interface OperatorSkills {
  categories: string[]; // Catégories de tickets gérées
  brands: string[]; // Marques/produits maîtrisés
  languages: string[]; // Langues parlées
  specializations: string[]; // Spécialisations (technique, commercial, etc.)
}

export interface OperatorCapacity {
  maxConcurrentTickets: number; // Nombre max de tickets simultanés
  dailyTicketLimit?: number; // Limite quotidienne (optionnel)
  workingHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export interface OperatorProfile {
  skills: OperatorSkills;
  capacity: OperatorCapacity;
  teamId?: string;
  supervisorId?: string;
}

export interface OperatorStats {
  totalTicketsHandled: number;
  ticketsResolvedToday: number;
  averageResolutionTime: number; // en secondes
  customerSatisfactionScore: number; // 0-100
  currentActiveTickets: number;
  slaComplianceRate: number; // 0-100
  lastActivityAt?: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  phone?: string;
  profile?: OperatorProfile;
  stats: OperatorStats;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
}

export interface CreateUserData {
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  password?: string;
  profile?: Partial<OperatorProfile>;
}

export interface UpdateUserData {
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  password?: string;
  profile?: Partial<OperatorProfile>;
}

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'kly_managed_users';

export const loadManagedUsers = (): ManagedUser[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveManagedUsers = (users: ManagedUser[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

// ============================================
// HELPERS
// ============================================

export const generateUserId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createDefaultOperatorProfile = (): OperatorProfile => ({
  skills: {
    categories: [],
    brands: [],
    languages: ['Français'],
    specializations: [],
  },
  capacity: {
    maxConcurrentTickets: 10,
    dailyTicketLimit: 50,
  },
});

export const createDefaultStats = (): OperatorStats => ({
  totalTicketsHandled: 0,
  ticketsResolvedToday: 0,
  averageResolutionTime: 0,
  customerSatisfactionScore: 0,
  currentActiveTickets: 0,
  slaComplianceRate: 100,
});

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<string, string> = {
    [UserRole.ADMIN]: 'Administrateur',
    [UserRole.SUPERVISOR]: 'Superviseur',
    [UserRole.AGENT]: 'Opérateur',
  };
  return labels[role] || role;
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<string, string> = {
    [UserRole.ADMIN]: 'bg-purple-100 text-purple-700 border-purple-200',
    [UserRole.SUPERVISOR]: 'bg-blue-100 text-blue-700 border-blue-200',
    [UserRole.AGENT]: 'bg-green-100 text-green-700 border-green-200',
  };
  return colors[role] || 'bg-slate-100 text-slate-700 border-slate-200';
};

export const getStatusLabel = (status: UserStatus): string => {
  const labels: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'Actif',
    [UserStatus.INACTIVE]: 'Inactif',
    [UserStatus.SUSPENDED]: 'Suspendu',
  };
  return labels[status];
};

export const getStatusColor = (status: UserStatus): string => {
  const colors: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'bg-green-100 text-green-700',
    [UserStatus.INACTIVE]: 'bg-slate-100 text-slate-600',
    [UserStatus.SUSPENDED]: 'bg-red-100 text-red-700',
  };
  return colors[status];
};

// ============================================
// VALIDATION
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export const validateUserData = (
  data: CreateUserData | UpdateUserData,
  existingUsers: ManagedUser[],
  editingUserId?: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Email validation
  if ('email' in data && data.email !== undefined) {
    if (!data.email.trim()) {
      errors.push({ field: 'email', message: 'L\'email est requis' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Format d\'email invalide' });
    } else {
      const emailExists = existingUsers.some(
        (u) => u.email.toLowerCase() === data.email!.toLowerCase() && u.id !== editingUserId
      );
      if (emailExists) {
        errors.push({ field: 'email', message: 'Cet email est déjà utilisé' });
      }
    }
  }

  // Display name validation
  if ('displayName' in data && data.displayName !== undefined) {
    if (!data.displayName.trim()) {
      errors.push({ field: 'displayName', message: 'Le nom est requis' });
    } else if (data.displayName.length < 2) {
      errors.push({ field: 'displayName', message: 'Le nom doit contenir au moins 2 caractères' });
    }
  }

  // Role validation
  if ('role' in data && data.role !== undefined) {
    if (!Object.values(UserRole).includes(data.role)) {
      errors.push({ field: 'role', message: 'Rôle invalide' });
    }
  }

  // Capacity validation
  if (data.profile?.capacity) {
    const { maxConcurrentTickets, dailyTicketLimit } = data.profile.capacity;

    if (maxConcurrentTickets !== undefined) {
      if (maxConcurrentTickets < 1 || maxConcurrentTickets > 100) {
        errors.push({
          field: 'maxConcurrentTickets',
          message: 'Le nombre de tickets simultanés doit être entre 1 et 100'
        });
      }
    }

    if (dailyTicketLimit !== undefined) {
      if (dailyTicketLimit < 1 || dailyTicketLimit > 500) {
        errors.push({
          field: 'dailyTicketLimit',
          message: 'La limite quotidienne doit être entre 1 et 500'
        });
      }
    }
  }

  return errors;
};

// ============================================
// PREDEFINED OPTIONS
// ============================================

export const PREDEFINED_CATEGORIES = [
  'Support technique',
  'Facturation',
  'Commandes',
  'Retours & Remboursements',
  'Livraison',
  'Compte client',
  'Réclamations',
  'Informations produits',
];

export const PREDEFINED_BRANDS = [
  'Apple',
  'Samsung',
  'Sony',
  'LG',
  'Microsoft',
  'HP',
  'Dell',
  'Lenovo',
];

export const PREDEFINED_SPECIALIZATIONS = [
  'Support niveau 1',
  'Support niveau 2',
  'Support technique avancé',
  'Commercial',
  'Fidélisation',
  'Réclamations complexes',
  'VIP / Grands comptes',
];

export const PREDEFINED_LANGUAGES = [
  'Français',
  'Anglais',
  'Espagnol',
  'Allemand',
  'Italien',
  'Portugais',
  'Arabe',
];
