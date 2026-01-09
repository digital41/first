import React from 'react';
import { Wrench, Truck, FileText, RotateCcw, Search, ArrowRight } from 'lucide-react';
import { Intent } from '../types';

interface DecisionTreeProps {
  onSelect: (intent: Intent) => void;
  onLookup: () => void;
}

const DecisionTree: React.FC<DecisionTreeProps> = ({ onSelect, onLookup }) => {
  const cards = [
    {
      id: Intent.TECHNICAL,
      title: "Support Technique",
      // Blue/Cyan: Engineering, Trust, Technical precision
      icon: <Wrench className="w-7 h-7 text-white" />,
      desc: "Panne, maintenance ou assistance machine.",
      gradient: "from-blue-500 to-cyan-600",
      shadow: "shadow-blue-500/30",
      textColor: "group-hover:text-blue-700",
      ringColor: "group-hover:ring-blue-200"
    },
    {
      id: Intent.DELIVERY,
      title: "Livraison & Logistique",
      // Emerald/Teal: Movement, Success, Logistics
      icon: <Truck className="w-7 h-7 text-white" />,
      desc: "Suivi, retard ou avarie de transport.",
      gradient: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/30",
      textColor: "group-hover:text-teal-700",
      ringColor: "group-hover:ring-teal-200"
    },
    {
      id: Intent.INVOICE,
      title: "Facturation",
      // Violet/Indigo: Administrative, Formal, Documents
      icon: <FileText className="w-7 h-7 text-white" />,
      desc: "Duplicatas, avoirs ou modifications.",
      gradient: "from-violet-500 to-indigo-600",
      shadow: "shadow-violet-500/30",
      textColor: "group-hover:text-violet-700",
      ringColor: "group-hover:ring-violet-200"
    },
    {
      id: Intent.RETURN,
      title: "Retours & SAV",
      // Amber/Orange: Attention, Warning, Processing
      icon: <RotateCcw className="w-7 h-7 text-white" />,
      desc: "RMA, erreur de réf. ou défaut produit.",
      gradient: "from-amber-400 to-orange-600",
      shadow: "shadow-orange-500/30",
      textColor: "group-hover:text-orange-700",
      ringColor: "group-hover:ring-orange-200"
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-fade-in">
      <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
            Bonjour, comment <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">pouvons-nous aider ?</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Choisissez un domaine pour être dirigé vers le service compétent.
          </p>
      </div>
      
      {/* Grille 2 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            className={`group relative flex items-center p-6 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 hover:border-transparent transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl overflow-hidden text-left hover:ring-2 ${card.ringColor}`}
          >
            {/* Subtle Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}></div>
            
            {/* Left Color Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${card.gradient}`}></div>

            <div className={`mr-6 flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
              {card.icon}
            </div>
            
            <div className="flex-grow">
              <h3 className={`text-xl font-bold text-slate-800 mb-1 transition-colors ${card.textColor}`}>{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
            </div>

            <div className="ml-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className={`p-2 rounded-full bg-slate-50 ${card.textColor}`}>
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button 
          onClick={onLookup}
          className="group flex items-center space-x-3 text-slate-600 bg-white/60 backdrop-blur px-8 py-4 rounded-full border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-white hover:text-blue-700 transition-all"
        >
          <div className="bg-white p-2 rounded-full shadow-sm group-hover:text-blue-600 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">J'ai déjà un numéro de dossier SAV</span>
        </button>
      </div>
    </div>
  );
};

export default DecisionTree;