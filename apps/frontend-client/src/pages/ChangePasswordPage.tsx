import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, ArrowRight, Eye, EyeOff, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, logout, user, isLoading } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      // No current password needed for mustChangePassword
      await changePassword(newPassword);
      setSuccess(true);
      // Redirect after showing success
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors du changement de mot de passe');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (newPassword.length === 0) return { level: 0, text: '', color: '' };
    if (newPassword.length < 8) return { level: 1, text: 'Trop court', color: 'bg-red-500' };

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^a-zA-Z\d]/.test(newPassword)) score++;

    if (score <= 2) return { level: 2, text: 'Faible', color: 'bg-orange-500' };
    if (score <= 3) return { level: 3, text: 'Moyen', color: 'bg-yellow-500' };
    return { level: 4, text: 'Fort', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">KLY</span>
          </div>
          <span className="font-semibold text-xl text-gray-900">SAV Industriel</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
        >
          <LogOut size={16} className="mr-1" />
          Deconnexion
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {success ? (
              // Success state
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Mot de passe modifie !
                </h2>
                <p className="text-gray-600">
                  Redirection vers votre espace...
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="text-orange-600" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Changement de mot de passe
                  </h1>
                  <p className="text-gray-600">
                    {user?.displayName && (
                      <>Bonjour <strong>{user.displayName}</strong>, </>
                    )}
                    vous devez definir un nouveau mot de passe pour continuer.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div>
                    <label htmlFor="newPassword" className="label">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 caracteres"
                        className="input pl-10 pr-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    {/* Password strength */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full ${
                                level <= strength.level ? strength.color : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${
                          strength.level <= 1 ? 'text-red-600' :
                          strength.level <= 2 ? 'text-orange-600' :
                          strength.level <= 3 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          Force du mot de passe : {strength.text}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="confirmPassword" className="label">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retapez le mot de passe"
                        className="input pl-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="flex items-start p-4 bg-red-50 rounded-lg">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <p className="ml-2 text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loading size="sm" />
                    ) : (
                      <>
                        Valider et continuer
                        <ArrowRight className="ml-2" size={18} />
                      </>
                    )}
                  </button>
                </form>

                {/* Password requirements */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Conseils pour un bon mot de passe :
                  </h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                        newPassword.length >= 8 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {newPassword.length >= 8 ? '✓' : '•'}
                      </span>
                      Au moins 8 caracteres
                    </li>
                    <li className="flex items-center">
                      <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                        /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      Majuscules et minuscules
                    </li>
                    <li className="flex items-center">
                      <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                        /\d/.test(newPassword) ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {/\d/.test(newPassword) ? '✓' : '•'}
                      </span>
                      Au moins un chiffre
                    </li>
                    <li className="flex items-center">
                      <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                        /[^a-zA-Z\d]/.test(newPassword) ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {/[^a-zA-Z\d]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      Un caractere special (!@#$...)
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-500">
        <p>&copy; 2024 KLY Groupe</p>
      </footer>
    </div>
  );
}

export default ChangePasswordPage;
