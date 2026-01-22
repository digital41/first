import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  LogOut,
  Edit3,
  Save,
  X,
  Building,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state (phone peut venir du backend sous le nom "phone" ou "phoneNumber")
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
  });

  // Mettre à jour formData quand user change (évite les valeurs vides au chargement)
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || user.phoneNumber || '',
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleEdit = () => {
    setFormData({
      displayName: user?.displayName || '',
      phone: user?.phone || user?.phoneNumber || '',
    });
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.updateProfile({
        displayName: formData.displayName,
        phone: formData.phone || undefined,
      });

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      setIsEditing(false);
      setSuccess('Profil mis à jour avec succès');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-primary-600">
                  {getInitials(user.displayName)}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{user.displayName}</h1>
              <p className="text-sm text-gray-500">Client depuis {formatDate(user.createdAt)}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit3 size={18} className="mr-2" />
                  Modifier
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} className="mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Informations du compte</h2>
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <X size={16} className="mr-1" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-3 py-1.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <Save size={16} className="mr-1" />
                )}
                Enregistrer
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div className="flex items-start p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <User className="text-primary-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Nom complet</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Votre nom"
                />
              ) : (
                <p className="font-medium text-gray-900 break-words">{user.displayName}</p>
              )}
            </div>
          </div>

          {/* Email (lecture seule) */}
          <div className="flex items-start p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Mail className="text-primary-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="font-medium text-gray-900 break-all">{user.email}</p>
            </div>
          </div>

          {/* Téléphone */}
          <div className="flex items-start p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Phone className="text-primary-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</p>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="06 12 34 56 78"
                />
              ) : (
                <p className="font-medium text-gray-900">
                  {(user.phone || user.phoneNumber) || <span className="text-gray-400 italic">Non renseigné</span>}
                </p>
              )}
            </div>
          </div>

          {/* Société (lecture seule) */}
          {user.companyName && (
            <div className="flex items-start p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <Building className="text-blue-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Société</p>
                <p className="font-medium text-gray-900 break-words">{user.companyName}</p>
              </div>
            </div>
          )}

          {/* Date de création du compte */}
          <div className="flex items-start p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Calendar className="text-green-600" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Compte créé le</p>
              <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          {/* Code client SAGE (lecture seule) */}
          {user.customerCode && (
            <div className="flex items-start p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">#</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Code client SAGE</p>
                <p className="font-medium text-gray-900 font-mono">{user.customerCode}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
