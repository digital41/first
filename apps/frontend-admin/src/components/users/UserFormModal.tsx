import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Settings,
  Tag,
  Loader2,
  AlertCircle,
  Plus,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ManagedUser,
  CreateUserData,
  UpdateUserData,
  UserRole,
  ValidationError,
  getRoleLabel,
  PREDEFINED_CATEGORIES,
  PREDEFINED_BRANDS,
  PREDEFINED_SPECIALIZATIONS,
  PREDEFINED_LANGUAGES,
} from '../../lib/userManagementTypes';

// ============================================
// USER FORM MODAL COMPONENT
// ============================================
// Modal pour créer ou modifier un utilisateur/opérateur

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<{ success: boolean; errors?: ValidationError[] }>;
  editingUser?: ManagedUser | null;
  title?: string;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingUser,
  title,
}) => {
  const isEditing = !!editingUser;

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['Français']);
  const [maxConcurrentTickets, setMaxConcurrentTickets] = useState(10);
  const [dailyTicketLimit, setDailyTicketLimit] = useState(50);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'skills' | 'capacity'>('info');

  // Custom input state
  const [customCategory, setCustomCategory] = useState('');
  const [customBrand, setCustomBrand] = useState('');

  // Initialize form when editing
  useEffect(() => {
    if (editingUser) {
      setDisplayName(editingUser.displayName);
      setEmail(editingUser.email);
      setPhone(editingUser.phone || '');
      setRole(editingUser.role);
      setCategories(editingUser.profile?.skills.categories || []);
      setBrands(editingUser.profile?.skills.brands || []);
      setSpecializations(editingUser.profile?.skills.specializations || []);
      setLanguages(editingUser.profile?.skills.languages || ['Français']);
      setMaxConcurrentTickets(editingUser.profile?.capacity.maxConcurrentTickets || 10);
      setDailyTicketLimit(editingUser.profile?.capacity.dailyTicketLimit || 50);
    } else {
      resetForm();
    }
  }, [editingUser, isOpen]);

  const resetForm = () => {
    setDisplayName('');
    setEmail('');
    setPhone('');
    setRole(UserRole.AGENT);
    setNewPassword('');
    setShowPassword(false);
    setCategories([]);
    setBrands([]);
    setSpecializations([]);
    setLanguages(['Français']);
    setMaxConcurrentTickets(10);
    setDailyTicketLimit(50);
    setErrors([]);
    setActiveTab('info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    const profile = {
      skills: {
        categories,
        brands,
        specializations,
        languages,
      },
      capacity: {
        maxConcurrentTickets,
        dailyTicketLimit,
      },
    };

    const data = isEditing
      ? ({
          displayName,
          phone: phone || undefined,
          role,
          profile,
          ...(newPassword ? { password: newPassword } : {}),
        } as UpdateUserData)
      : ({
          email,
          displayName,
          phone: phone || undefined,
          role,
          profile,
          ...(newPassword ? { password: newPassword } : {}),
        } as CreateUserData);

    try {
      const result = await onSubmit(data);
      if (result.success) {
        onClose();
        resetForm();
      } else if (result.errors) {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors([{ field: 'general', message: 'Une erreur est survenue' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  const toggleArrayItem = (
    array: string[],
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    if (array.includes(item)) {
      setArray(array.filter((i) => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const addCustomItem = (
    value: string,
    array: string[],
    setArray: React.Dispatch<React.SetStateAction<string[]>>,
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value.trim() && !array.includes(value.trim())) {
      setArray([...array, value.trim()]);
      setValue('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {title || (isEditing ? 'Modifier l\'utilisateur' : 'Créer un opérateur')}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditing ? 'Modifiez les informations' : 'Remplissez les informations du nouvel opérateur'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {[
              { id: 'info', label: 'Informations', icon: User },
              { id: 'skills', label: 'Compétences', icon: Tag },
              { id: 'capacity', label: 'Capacité', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {/* General Error */}
              {getFieldError('general') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{getFieldError('general')}</span>
                </div>
              )}

              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom complet *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Jean Dupont"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          getFieldError('displayName')
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {getFieldError('displayName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('displayName')}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean.dupont@exemple.com"
                        disabled={isEditing}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          getFieldError('email')
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200'
                        } ${isEditing ? 'bg-slate-50 text-slate-500' : ''}`}
                      />
                    </div>
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                    )}
                    {isEditing && (
                      <p className="mt-1 text-xs text-slate-500">L'email ne peut pas être modifié</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Rôle *
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                      >
                        <option value={UserRole.AGENT}>{getRoleLabel(UserRole.AGENT)}</option>
                        <option value={UserRole.SUPERVISOR}>{getRoleLabel(UserRole.SUPERVISOR)}</option>
                        <option value={UserRole.ADMIN}>{getRoleLabel(UserRole.ADMIN)}</option>
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {role === UserRole.ADMIN && 'Accès complet à toutes les fonctionnalités'}
                      {role === UserRole.SUPERVISOR && 'Gestion des équipes et rapports'}
                      {role === UserRole.AGENT && 'Gestion des tickets uniquement'}
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {isEditing ? 'Nouveau mot de passe' : 'Mot de passe'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={isEditing ? 'Laisser vide pour ne pas modifier' : 'Mot de passe'}
                        className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          getFieldError('password')
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {getFieldError('password') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
                    )}
                    {isEditing && (
                      <p className="mt-1 text-xs text-slate-500">
                        Laissez vide pour conserver le mot de passe actuel
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div className="space-y-6">
                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Catégories de tickets
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PREDEFINED_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleArrayItem(categories, setCategories, cat)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            categories.includes(cat)
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Ajouter une catégorie..."
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomItem(customCategory, categories, setCategories, setCustomCategory);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addCustomItem(customCategory, categories, setCategories, setCustomCategory)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Brands */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Marques / Produits
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PREDEFINED_BRANDS.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => toggleArrayItem(brands, setBrands, brand)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            brands.includes(brand)
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="Ajouter une marque..."
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomItem(customBrand, brands, setBrands, setCustomBrand);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addCustomItem(customBrand, brands, setBrands, setCustomBrand)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Spécialisations
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PREDEFINED_SPECIALIZATIONS.map((spec) => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleArrayItem(specializations, setSpecializations, spec)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            specializations.includes(spec)
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Langues parlées
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleArrayItem(languages, setLanguages, lang)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            languages.includes(lang)
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Capacity Tab */}
              {activeTab === 'capacity' && (
                <div className="space-y-6">
                  {/* Max Concurrent Tickets */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tickets simultanés maximum
                    </label>
                    <input
                      type="number"
                      value={maxConcurrentTickets}
                      onChange={(e) => setMaxConcurrentTickets(parseInt(e.target.value, 10) || 1)}
                      min="1"
                      max="100"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        getFieldError('maxConcurrentTickets')
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200'
                      }`}
                    />
                    {getFieldError('maxConcurrentTickets') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('maxConcurrentTickets')}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Nombre maximum de tickets que l'opérateur peut traiter en même temps
                    </p>
                  </div>

                  {/* Daily Ticket Limit */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Limite quotidienne
                    </label>
                    <input
                      type="number"
                      value={dailyTicketLimit}
                      onChange={(e) => setDailyTicketLimit(parseInt(e.target.value, 10) || 1)}
                      min="1"
                      max="500"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        getFieldError('dailyTicketLimit')
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200'
                      }`}
                    />
                    {getFieldError('dailyTicketLimit') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('dailyTicketLimit')}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Nombre maximum de tickets assignés par jour
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Résumé de la capacité</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Simultanés</p>
                        <p className="font-semibold text-slate-800">{maxConcurrentTickets} tickets</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Par jour</p>
                        <p className="font-semibold text-slate-800">{dailyTicketLimit} tickets</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Enregistrer' : 'Créer l\'opérateur'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserFormModal;
