import React, { useState } from 'react';
import { Order, OrderItem } from '../types';
import { CheckCircle, Circle, ArrowRight, Package, Box } from 'lucide-react';

interface ProductSelectorProps {
  order: Order;
  onConfirm: (selectedItems: OrderItem[]) => void;
  onBack: () => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ order, onConfirm, onBack }) => {
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);

  const toggleProduct = (ref: string) => {
    setSelectedRefs(prev => 
      prev.includes(ref) 
        ? prev.filter(r => r !== ref) 
        : [...prev, ref]
    );
  };

  const handleConfirm = () => {
    const items = order.items.filter(item => selectedRefs.includes(item.ref));
    onConfirm(items);
  };

  const toggleAll = () => {
    if (selectedRefs.length === order.items.length) {
        setSelectedRefs([]);
    } else {
        setSelectedRefs(order.items.map(i => i.ref));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header SAGE-like */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-400" />
                    Contenu de la commande
                </h2>
                <p className="text-slate-400 text-sm mt-1">Ref: {order.id} • Importé de SAGE ERP</p>
            </div>
            <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-300">Date d'achat</p>
                <p className="font-mono">{order.purchaseDate}</p>
            </div>
        </div>

        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Sélectionnez les articles concernés</h3>
                    <p className="text-slate-500 text-sm">Cochez les produits pour lesquels vous demandez une assistance.</p>
                </div>
                <button 
                    onClick={toggleAll}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    {selectedRefs.length === order.items.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {order.items.map((item) => {
                    const isSelected = selectedRefs.includes(item.ref);
                    return (
                        <div 
                            key={item.ref}
                            onClick={() => toggleProduct(item.ref)}
                            className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                                isSelected 
                                    ? 'border-blue-600 bg-blue-50/50 shadow-md' 
                                    : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                            }`}
                        >
                            <div className={`mr-4 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                            }`}>
                                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>

                            <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 p-1 mr-4 flex-shrink-0">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                            </div>

                            <div className="flex-grow">
                                <h4 className={`font-bold transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                    {item.name}
                                </h4>
                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                                        REF: {item.ref}
                                    </span>
                                    <span className="flex items-center">
                                        <Package className="w-3 h-3 mr-1" /> Qté: {item.quantity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <button 
                onClick={onBack}
                className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors"
            >
                Annuler
            </button>
            
            <button
                onClick={handleConfirm}
                disabled={selectedRefs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center transition-all transform hover:-translate-y-0.5"
            >
                Continuer
                <ArrowRight className="w-5 h-5 ml-2" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;