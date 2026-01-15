import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, AlertCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [customerCode, setCustomerCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerCode.trim()) {
      setError('Veuillez saisir votre code client');
      return;
    }

    try {
      await login(customerCode.trim());
      navigate('/');
    } catch {
      setError('Code client non trouve. Verifiez votre numero de compte.');
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-primary-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Espace Client SAV
              </h1>
              <p className="text-gray-600">
                Connectez-vous avec votre code compte client
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Customer code input */}
              <div>
                <label htmlFor="customerCode" className="label">
                  Code compte client
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    id="customerCode"
                    type="text"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                    placeholder="Ex: COCO001, CLIENT123..."
                    className="input pl-10 font-mono text-lg tracking-wider"
                    disabled={isLoading}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Votre code client figure sur vos documents SAGE 100 (factures, commandes, etc.)
                </p>
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
                disabled={isLoading || !customerCode.trim()}
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

            {/* Help link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link
                to="/faq"
                className="flex items-center justify-center text-sm text-gray-600 hover:text-primary-600"
              >
                <HelpCircle size={16} className="mr-1" />
                Ou trouver mon code client ?
              </Link>
            </div>
          </div>

          {/* Info card */}
          <div className="mt-6 bg-white rounded-xl p-5 shadow-sm">
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
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-500">
        <p>&copy; 2024 KLY Groupe - Compatible SAGE 100</p>
      </footer>
    </div>
  );
}

export default LoginPage;
