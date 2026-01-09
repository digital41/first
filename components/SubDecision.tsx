import React from 'react';
import { Intent } from '../types';
import { ArrowLeft, Activity, AlertTriangle, FileText, Package, Truck, CreditCard, RotateCcw, ShieldAlert, PenTool, Archive } from 'lucide-react';

interface SubDecisionProps {
  intent: Intent;
  onSelect: (subIntent: string) => void;
  onBack: () => void;
}

const SubDecision: React.FC<SubDecisionProps> = ({ intent, onSelect, onBack }) => {
  
  // Configuration dynamique du thème en fonction de l'intention parente
  // Doit correspondre exactement aux couleurs de DecisionTree.tsx
  const getTheme = () => {
    switch(intent) {
      case Intent.TECHNICAL:
        return {
          // Blue/Cyan Theme
          iconColor: "text-blue-600",
          iconBg: "bg-blue-50",
          solidBg: "bg-blue-600", // Couleur de fond au survol
          hoverRing: "hover:ring-blue-200",
          hoverText: "group-hover:text-blue-700",
          backHover: "hover:text-blue-600"
        };
      case Intent.DELIVERY:
        return {
          // Emerald/Teal Theme
          iconColor: "text-teal-600",
          iconBg: "bg-teal-50",
          solidBg: "bg-teal-600",
          hoverRing: "hover:ring-teal-200",
          hoverText: "group-hover:text-teal-700",
          backHover: "hover:text-teal-600"
        };
      case Intent.INVOICE:
        return {
          // Violet/Indigo Theme
          iconColor: "text-violet-600",
          iconBg: "bg-violet-50",
          solidBg: "bg-violet-600",
          hoverRing: "hover:ring-violet-200",
          hoverText: "group-hover:text-violet-700",
          backHover: "hover:text-violet-600"
        };
      case Intent.RETURN:
        return {
          // Orange/Amber Theme
          iconColor: "text-orange-600",
          iconBg: "bg-orange-50",
          solidBg: "bg-orange-600",
          hoverRing: "hover:ring-orange-200",
          hoverText: "group-hover:text-orange-700",
          backHover: "hover:text-orange-600"
        };
      default:
        return {
          iconColor: "text-slate-600",
          iconBg: "bg-slate-50",
          solidBg: "bg-slate-600",
          hoverRing: "hover:ring-slate-200",
          hoverText: "group-hover:text-slate-800",
          backHover: "hover:text-slate-600"
        };
    }
  };

  const theme = getTheme();

  const getOptions = () => {
    // Props communes : 
    // - Par défaut : couleur du thème
    // - Au survol du groupe (bouton) : devient blanc
    const iconProps = { className: `w-6 h-6 ${theme.iconColor} group-hover:text-white transition-colors duration-300` };

    switch(intent) {
      case Intent.TECHNICAL:
        return [
          { id: "arret_production", label: "Machine à l'arrêt (Urgent)", icon: <AlertTriangle {...iconProps} /> },
          { id: "dysfonctionnement", label: "Dysfonctionnement intermittent", icon: <Activity {...iconProps} /> },
          { id: "maintenance", label: "Maintenance préventive", icon: <PenTool {...iconProps} /> },
          { id: "piece_detachee", label: "Demande de pièce détachée", icon: <Package {...iconProps} /> }
        ];
      case Intent.DELIVERY:
        return [
          { id: "retard_critique", label: "Retard critique", icon: <Truck {...iconProps} /> },
          { id: "palette_endommagee", label: "Palette endommagée", icon: <ShieldAlert {...iconProps} /> },
          { id: "colis_manquant", label: "Colis manquant", icon: <Package {...iconProps} /> },
          { id: "pod", label: "Preuve de livraison (POD)", icon: <FileText {...iconProps} /> }
        ];
      case Intent.INVOICE:
        return [
          { id: "duplicata", label: "Duplicata de facture", icon: <FileText {...iconProps} /> },
          { id: "litige_prix", label: "Erreur de prix / Remise", icon: <AlertTriangle {...iconProps} /> },
          { id: "releve", label: "Relevé de compte", icon: <Archive {...iconProps} /> },
          { id: "rib", label: "Coordonnées bancaires", icon: <CreditCard {...iconProps} /> }
        ];
      case Intent.RETURN:
        return [
          { id: "produit_defectueux", label: "Produit défectueux (DOA)", icon: <ShieldAlert {...iconProps} /> },
          { id: "erreur_reference", label: "Erreur de référence", icon: <RotateCcw {...iconProps} /> },
          { id: "retour_stock", label: "Retour stock (Rotation)", icon: <Package {...iconProps} /> },
          { id: "consigne", label: "Gestion des consignes", icon: <Archive {...iconProps} /> }
        ];
      default:
        return [];
    }
  };

  const getTitle = () => {
    switch(intent) {
      case Intent.TECHNICAL: return "Précisez la nature de la panne";
      case Intent.DELIVERY: return "Quel est le problème de livraison ?";
      case Intent.INVOICE: return "Quel document recherchez-vous ?";
      case Intent.RETURN: return "Motif du retour";
      default: return "Précisez votre demande";
    }
  };

  const options = getOptions();

  return (
    <div className="w-full max-w-3xl mx-auto p-6 animate-slide-up">
      <button onClick={onBack} className={`text-slate-400 ${theme.backHover} mb-6 flex items-center text-sm transition-colors group`}>
        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Retour aux choix
      </button>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{getTitle()}</h2>
        <p className="text-slate-500 mt-2">Sélectionnez l'option qui correspond le mieux à votre situation.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`flex items-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-transparent hover:ring-2 ${theme.hoverRing} hover:shadow-lg transition-all text-left group`}
          >
            {/* Conteneur de l'icône : change de fond au survol (de "light" à "solid") */}
            <div className={`mr-4 ${theme.iconBg} group-hover:${theme.solidBg} p-3 rounded-xl transition-all duration-300 shadow-sm`}>
              {opt.icon}
            </div>
            <span className={`text-lg font-medium text-slate-700 ${theme.hoverText} transition-colors duration-300`}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubDecision;