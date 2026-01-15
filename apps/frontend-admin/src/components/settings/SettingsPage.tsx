import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Shield,
  Bell,
  Palette,
  Globe,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminApi } from '../../services/api';

// ============================================
// TYPES
// ============================================

interface ProfileFormData {
  displayName: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  newTicketAlert: boolean;
  assignmentAlert: boolean;
  slaWarningAlert: boolean;
}

// ============================================
// SETTINGS PAGE COMPONENT
// ============================================

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance'>('profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    browserNotifications: true,
    soundEnabled: true,
    newTicketAlert: true,
    assignmentAlert: true,
    slaWarningAlert: true,
  });

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  // ============================================
  // HANDLERS
  // ============================================

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await AdminApi.updateProfile({
        displayName: profileForm.displayName,
        phone: profileForm.phone,
      });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      setPasswordSaving(false);
      return;
    }

    try {
      await AdminApi.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    // TODO: Persist to backend when API is available
  };

  // ============================================
  // TAB COMPONENTS
  // ============================================

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Informations personnelles</h3>
        <p className="text-sm text-slate-500">Gérez vos informations de profil</p>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
          {user?.displayName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h4 className="font-medium text-slate-800">{user?.displayName}</h4>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <User size={14} className="inline mr-2" />
            Nom d'affichage
          </label>
          <input
            type="text"
            value={profileForm.displayName}
            onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <Mail size={14} className="inline mr-2" />
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400 mt-1">L'email ne peut pas être modifié</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <Phone size={14} className="inline mr-2" />
            Téléphone
          </label>
          <input
            type="tel"
            value={profileForm.phone}
            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        {profileError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{profileError}</span>
          </div>
        )}

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <Check size={16} />
            <span className="text-sm">Profil mis à jour avec succès</span>
          </div>
        )}

        <button
          type="submit"
          disabled={profileSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {profileSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Sécurité du compte</h3>
        <p className="text-sm text-slate-500">Gérez la sécurité de votre compte</p>
      </div>

      {/* Password change form */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4 bg-slate-50 rounded-xl">
        <h4 className="font-medium text-slate-800 flex items-center gap-2">
          <Lock size={16} />
          Changer le mot de passe
        </h4>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe actuel
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Entrez votre mot de passe actuel"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Minimum 8 caractères"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Répétez le nouveau mot de passe"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {passwordError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <Check size={16} />
            <span className="text-sm">Mot de passe changé avec succès</span>
          </div>
        )}

        <button
          type="submit"
          disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {passwordSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Shield size={16} />
          )}
          Changer le mot de passe
        </button>
      </form>

      {/* Security info */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <h4 className="font-medium text-amber-800 mb-2">Conseils de sécurité</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Utilisez un mot de passe unique d'au moins 8 caractères</li>
          <li>• Combinez lettres, chiffres et caractères spéciaux</li>
          <li>• Ne partagez jamais votre mot de passe</li>
          <li>• Changez régulièrement votre mot de passe</li>
        </ul>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Préférences de notifications</h3>
        <p className="text-sm text-slate-500">Configurez comment vous souhaitez être notifié</p>
      </div>

      <div className="space-y-4">
        {/* Email notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Notifications par email</h4>
            <p className="text-sm text-slate-500">Recevoir les alertes importantes par email</p>
          </div>
          <button
            onClick={() => handleNotificationChange('emailNotifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.emailNotifications ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Browser notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Notifications navigateur</h4>
            <p className="text-sm text-slate-500">Notifications push dans le navigateur</p>
          </div>
          <button
            onClick={() => handleNotificationChange('browserNotifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.browserNotifications ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Sons de notification</h4>
            <p className="text-sm text-slate-500">Jouer un son lors des notifications</p>
          </div>
          <button
            onClick={() => handleNotificationChange('soundEnabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <hr className="border-slate-200" />

        <h4 className="font-medium text-slate-800">Types d'alertes</h4>

        {/* New ticket alert */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Nouveau ticket</h4>
            <p className="text-sm text-slate-500">Alerte lors de la création d'un nouveau ticket</p>
          </div>
          <button
            onClick={() => handleNotificationChange('newTicketAlert')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.newTicketAlert ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.newTicketAlert ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Assignment alert */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Assignation</h4>
            <p className="text-sm text-slate-500">Alerte quand un ticket vous est assigné</p>
          </div>
          <button
            onClick={() => handleNotificationChange('assignmentAlert')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.assignmentAlert ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.assignmentAlert ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* SLA warning */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <h4 className="font-medium text-slate-800">Alerte SLA</h4>
            <p className="text-sm text-slate-500">Alerte avant expiration des SLA</p>
          </div>
          <button
            onClick={() => handleNotificationChange('slaWarningAlert')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationSettings.slaWarningAlert ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationSettings.slaWarningAlert ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Apparence</h3>
        <p className="text-sm text-slate-500">Personnalisez l'apparence de l'interface</p>
      </div>

      <div className="space-y-4">
        {/* Theme selection */}
        <div>
          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            <Palette size={16} />
            Thème
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Clair', icon: '☀️' },
              { value: 'dark', label: 'Sombre', icon: '🌙' },
              { value: 'system', label: 'Système', icon: '💻' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as typeof theme)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-2">{option.icon}</div>
                <div className="text-sm font-medium text-slate-800">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
            <Globe size={16} />
            Langue
          </h4>
          <select
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            defaultValue="fr"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  const tabs = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'security' as const, label: 'Sécurité', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Apparence', icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'appearance' && renderAppearanceTab()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
