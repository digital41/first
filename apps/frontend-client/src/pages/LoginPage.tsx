import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, AlertCircle, ArrowRight, HelpCircle, Mail, Lock, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loading, ErrorModal } from '@/components/common';

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type LoginMethod = 'email' | 'code';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithEmail, loginWithGoogle, isLoading } = useAuth();

  // Login method tab
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');

  // Email + Password form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Customer code form
  const [customerCode, setCustomerCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Google loading state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Show modal when Google error occurs
  useEffect(() => {
    if (googleError) {
      setShowErrorModal(true);
    }
  }, [googleError]);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setGoogleError(null);
    setShowErrorModal(false);
    setGoogleLoading(true);

    try {
      const result = await loginWithGoogle(response.credential);
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      console.error('Google login error:', err);
      let errorMessage = 'Erreur lors de la connexion avec Google. Veuillez reessayer.';

      if (err && typeof err === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = err as any;

        // Extract error message from Axios response
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message && axiosError.message !== 'Request failed with status code 403') {
          errorMessage = axiosError.message;
        }
      }

      setGoogleError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
            locale: 'fr',
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [handleGoogleResponse]);

  // Handle email + password login
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email.trim()) {
      setEmailError('Veuillez saisir votre email');
      return;
    }

    if (!password) {
      setEmailError('Veuillez saisir votre mot de passe');
      return;
    }

    try {
      const result = await loginWithEmail(email.trim(), password);
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      let errorMessage = 'Email ou mot de passe incorrect';

      if (err && typeof err === 'object') {
        const axiosError = err as {
          response?: { data?: { error?: string; message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }

      setEmailError(errorMessage);
    }
  };

  // Handle customer code login
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    if (!customerCode.trim()) {
      setCodeError('Veuillez saisir votre code client');
      return;
    }

    try {
      await login(customerCode.trim());
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = 'Code client non trouve. Verifiez votre numero de compte.';

      if (err && typeof err === 'object') {
        const axiosError = err as {
          response?: { data?: { error?: string; message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }

      setCodeError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">KLY</span>
          </div>
          <span className="font-semibold text-xl text-gray-900">SAV Industriel</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-primary-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Espace Client SAV
              </h1>
              <p className="text-gray-600">
                Connectez-vous pour acceder a votre espace
              </p>
            </div>

            {/* Google Sign-In */}
            {GOOGLE_CLIENT_ID && (
              <div className="mb-6">
                <div
                  id="google-signin-button"
                  className="flex justify-center"
                  style={{ minHeight: '44px' }}
                />

                {googleLoading && (
                  <div className="flex items-center justify-center mt-2">
                    <Loading size="sm" />
                    <span className="ml-2 text-sm text-gray-600">Connexion en cours...</span>
                  </div>
                )}

                {/* Separator */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">ou</span>
                  </div>
                </div>
              </div>
            )}

            {/* Login method tabs */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail size={16} className="mr-1.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'code'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 size={16} className="mr-1.5" />
                Code client
              </button>
            </div>

            {/* Email + Password Form */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="input pl-10"
                      disabled={isLoading || googleLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="input pl-10"
                      disabled={isLoading || googleLoading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {emailError && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-start">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <div className="ml-2">
                        <p className="text-sm text-red-700 font-medium">Erreur de connexion</p>
                        <p className="text-sm text-red-600 mt-1">{emailError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || googleLoading || !email.trim() || !password}
                  className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="ml-2" size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Customer Code Form */}
            {loginMethod === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="customerCode" className="label">
                    Code compte client
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="customerCode"
                      type="text"
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                      placeholder="Ex: COCO001, CLIENT123..."
                      className="input pl-10 font-mono text-lg tracking-wider"
                      disabled={isLoading || googleLoading}
                      autoComplete="off"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Ce code figure sur vos factures et bons de commande
                  </p>
                </div>

                {codeError && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-start">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      <div className="ml-2">
                        <p className="text-sm text-red-700 font-medium">Code client invalide</p>
                        <p className="text-sm text-red-600 mt-1">{codeError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || googleLoading || !customerCode.trim()}
                  className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      Acceder a mon espace
                      <ArrowRight className="ml-2" size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Help link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link
                to="/faq"
                className="flex items-center justify-center text-sm text-gray-600 hover:text-primary-600"
              >
                <HelpCircle size={16} className="mr-1" />
                Besoin d'aide pour vous connecter ?
              </Link>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-6 space-y-4">
            {loginMethod === 'code' && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-2">Ou trouver votre code client ?</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 mr-2">1</span>
                    <span>Sur votre facture, en haut a droite</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 mr-2">2</span>
                    <span>Sur votre bon de commande</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 mr-2">3</span>
                    <span>Dans vos emails de confirmation</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Security notice for Google */}
            {GOOGLE_CLIENT_ID && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Securite Google :</strong> La connexion Google est reservee aux emails enregistres dans notre systeme.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-500">
        <p>&copy; 2024 KLY Groupe</p>
      </footer>

      {/* Error Modal for Google OAuth */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setGoogleError(null);
        }}
        title="Acces refuse"
        message={googleError || ''}
        details={
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Que faire ?</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Verifiez que vous utilisez l'email associe a votre compte client
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Si vous etes nouveau client, contactez le support pour creer votre acces
              </li>
            </ul>
          </div>
        }
        buttonText="Compris"
      />
    </div>
  );
}

export default LoginPage;
