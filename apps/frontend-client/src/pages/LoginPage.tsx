import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, AlertCircle, ArrowRight, HelpCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common';

// Detect reference type from input (BC, BL, FA)
function detectReferenceType(value: string): { type: 'BC' | 'BL' | 'FA' | null; label: string; color: string } {
  const upper = value.toUpperCase().trim();

  if (upper.startsWith('BC') || upper.startsWith('CMD')) {
    return { type: 'BC', label: 'Bon de Commande', color: 'text-blue-600 bg-blue-50' };
  }
  if (upper.startsWith('BL')) {
    return { type: 'BL', label: 'Bon de Livraison', color: 'text-green-600 bg-green-50' };
  }
  if (upper.startsWith('FA') || upper.startsWith('FAC')) {
    return { type: 'FA', label: 'Facture', color: 'text-purple-600 bg-purple-50' };
  }

  return { type: null, label: '', color: '' };
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detectedType = useMemo(() => detectReferenceType(reference), [reference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reference.trim()) {
      setError('Veuillez saisir une reference SAGE');
      return;
    }

    try {
      // Send reference with the correct parameter based on detected type
      await login(reference.trim());
      navigate('/');
    } catch (err) {
      setError('Reference non trouvee. Verifiez votre numero BC, BL ou FA.');
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Espace Client SAV
              </h1>
              <p className="text-gray-600">
                Connectez-vous avec votre reference SAGE 100
              </p>
            </div>

            {/* Reference types info */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="text-center">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded">BC</span>
                <p className="text-xs text-gray-500 mt-1">Commande</p>
              </div>
              <div className="text-center">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded">BL</span>
                <p className="text-xs text-gray-500 mt-1">Livraison</p>
              </div>
              <div className="text-center">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded">FA</span>
                <p className="text-xs text-gray-500 mt-1">Facture</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Reference input */}
              <div>
                <label htmlFor="reference" className="label">
                  Numero de reference SAGE
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    id="reference"
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value.toUpperCase())}
                    placeholder="Ex: BC00001234, BL00005678, FA00009012"
                    className="input pl-10 pr-24 font-mono"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  {/* Detected type badge */}
                  {detectedType.type && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded ${detectedType.color}`}>
                      {detectedType.label}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Saisissez votre BC (Bon de Commande), BL (Bon de Livraison) ou FA (Facture)
                </p>
              </div>

              {/* Detected type confirmation */}
              {detectedType.type && reference.length > 3 && (
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="text-green-500 shrink-0" size={18} />
                  <p className="ml-2 text-sm text-green-700">
                    {detectedType.label} detecte - Pret a vous connecter
                  </p>
                </div>
              )}

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
                disabled={isLoading || !reference.trim()}
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
                Ou trouver ma reference SAGE ?
              </Link>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="font-bold text-blue-600">BC</span>
              </div>
              <p className="text-xs text-gray-600">
                Numero sur votre confirmation de commande
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="font-bold text-green-600">BL</span>
              </div>
              <p className="text-xs text-gray-600">
                Numero sur votre bon de livraison
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="font-bold text-purple-600">FA</span>
              </div>
              <p className="text-xs text-gray-600">
                Numero sur votre facture
              </p>
            </div>
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
