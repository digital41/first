// Decision Tree Service for intelligent issue routing
// Minimizes user interaction by guiding through smart choices

export interface DecisionNode {
  id: string;
  type: 'question' | 'solution' | 'escalate' | 'diagnostic';
  title: string;
  subtitle?: string;
  icon?: string;
  options?: DecisionOption[];
  solution?: SolutionData;
  diagnostic?: DiagnosticStep[];
  metadata?: {
    category?: string;
    priority?: string;
    issueType?: string;
    tags?: string[];
  };
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  nextNodeId: string;
  confidence?: number;
}

export interface SolutionData {
  title: string;
  steps: string[];
  videoUrl?: string;
  documentUrl?: string;
  estimatedTime?: string;
  successRate?: number;
  fallbackNodeId?: string; // If solution doesn't work
}

export interface DiagnosticStep {
  id: string;
  question: string;
  type: 'yes_no' | 'select' | 'input';
  options?: { label: string; value: string; nextNodeId: string }[];
  yesNodeId?: string;
  noNodeId?: string;
}

export interface UserJourney {
  startTime: Date;
  path: string[];
  answers: Record<string, string>;
  resolved: boolean;
  finalNode?: string;
}

// Complete decision tree for SAV
const DECISION_TREE: Record<string, DecisionNode> = {
  // ROOT NODE
  'root': {
    id: 'root',
    type: 'question',
    title: 'Comment pouvons-nous vous aider ?',
    subtitle: 'Sélectionnez la catégorie qui correspond à votre besoin',
    options: [
      {
        id: 'technical',
        label: 'Problème technique',
        description: 'Panne, dysfonctionnement, erreur',
        icon: 'wrench',
        nextNodeId: 'technical_root'
      },
      {
        id: 'delivery',
        label: 'Livraison',
        description: 'Suivi, retard, colis endommagé',
        icon: 'truck',
        nextNodeId: 'delivery_root'
      },
      {
        id: 'billing',
        label: 'Facturation',
        description: 'Facture, paiement, avoir',
        icon: 'file-text',
        nextNodeId: 'billing_root'
      },
      {
        id: 'other',
        label: 'Autre demande',
        description: 'Question, renseignement',
        icon: 'help-circle',
        nextNodeId: 'other_root'
      }
    ]
  },

  // ========== TECHNICAL BRANCH ==========
  'technical_root': {
    id: 'technical_root',
    type: 'question',
    title: 'Quel type de problème technique rencontrez-vous ?',
    metadata: { category: 'TECHNICAL' },
    options: [
      {
        id: 'no_power',
        label: 'L\'équipement ne démarre pas',
        description: 'Pas d\'alimentation, voyants éteints',
        icon: 'power',
        nextNodeId: 'tech_no_power_diag'
      },
      {
        id: 'error',
        label: 'Code erreur / Message d\'erreur',
        description: 'Un code ou message s\'affiche',
        icon: 'alert-triangle',
        nextNodeId: 'tech_error_input'
      },
      {
        id: 'performance',
        label: 'Problème de performance',
        description: 'Lent, bruyant, surchauffe',
        icon: 'activity',
        nextNodeId: 'tech_performance_root'
      },
      {
        id: 'physical',
        label: 'Dommage physique',
        description: 'Casse, fuite, usure',
        icon: 'shield-off',
        nextNodeId: 'tech_physical_escalate'
      }
    ]
  },

  // No power diagnostic
  'tech_no_power_diag': {
    id: 'tech_no_power_diag',
    type: 'diagnostic',
    title: 'Diagnostic: Problème d\'alimentation',
    subtitle: 'Répondez à ces questions pour identifier la cause',
    diagnostic: [
      {
        id: 'plug_check',
        question: 'Le câble d\'alimentation est-il correctement branché des deux côtés ?',
        type: 'yes_no',
        yesNodeId: 'tech_no_power_step2',
        noNodeId: 'tech_no_power_solution_plug'
      }
    ],
    metadata: { category: 'TECHNICAL', priority: 'HIGH', issueType: 'TECHNICAL' }
  },

  'tech_no_power_solution_plug': {
    id: 'tech_no_power_solution_plug',
    type: 'solution',
    title: 'Solution: Vérification du branchement',
    solution: {
      title: 'Rebranchez correctement l\'équipement',
      steps: [
        'Débranchez complètement le câble d\'alimentation',
        'Vérifiez que la prise murale est sous tension (testez avec un autre appareil)',
        'Inspectez le câble pour détecter d\'éventuels dommages',
        'Rebranchez fermement le câble côté équipement',
        'Rebranchez fermement le câble côté prise murale',
        'Attendez 10 secondes puis essayez de démarrer'
      ],
      estimatedTime: '2 minutes',
      successRate: 85,
      fallbackNodeId: 'tech_no_power_step2'
    }
  },

  'tech_no_power_step2': {
    id: 'tech_no_power_step2',
    type: 'diagnostic',
    title: 'Vérification du disjoncteur',
    diagnostic: [
      {
        id: 'breaker_check',
        question: 'Le disjoncteur ou fusible dédié à l\'équipement est-il en position "ON" ?',
        type: 'yes_no',
        yesNodeId: 'tech_no_power_step3',
        noNodeId: 'tech_no_power_solution_breaker'
      }
    ]
  },

  'tech_no_power_solution_breaker': {
    id: 'tech_no_power_solution_breaker',
    type: 'solution',
    title: 'Solution: Réarmement du disjoncteur',
    solution: {
      title: 'Réarmez le disjoncteur',
      steps: [
        'Localisez le tableau électrique',
        'Identifiez le disjoncteur correspondant à l\'équipement',
        'Basculez-le en position OFF',
        'Attendez 30 secondes',
        'Basculez-le en position ON',
        'Essayez de redémarrer l\'équipement'
      ],
      estimatedTime: '3 minutes',
      successRate: 70,
      fallbackNodeId: 'tech_no_power_escalate'
    }
  },

  'tech_no_power_step3': {
    id: 'tech_no_power_step3',
    type: 'diagnostic',
    title: 'Test de la prise électrique',
    diagnostic: [
      {
        id: 'outlet_check',
        question: 'Un autre appareil fonctionne-t-il sur cette même prise ?',
        type: 'yes_no',
        yesNodeId: 'tech_no_power_escalate',
        noNodeId: 'tech_no_power_solution_outlet'
      }
    ]
  },

  'tech_no_power_solution_outlet': {
    id: 'tech_no_power_solution_outlet',
    type: 'solution',
    title: 'Solution: Problème de prise électrique',
    solution: {
      title: 'Changez de prise électrique',
      steps: [
        'Débranchez l\'équipement de la prise actuelle',
        'Trouvez une autre prise électrique fonctionnelle',
        'Branchez l\'équipement sur cette nouvelle prise',
        'Essayez de démarrer l\'équipement',
        'Si cela fonctionne, faites vérifier la prise défectueuse par un électricien'
      ],
      estimatedTime: '5 minutes',
      successRate: 60,
      fallbackNodeId: 'tech_no_power_escalate'
    }
  },

  'tech_no_power_escalate': {
    id: 'tech_no_power_escalate',
    type: 'escalate',
    title: 'Intervention technique nécessaire',
    subtitle: 'Le problème nécessite l\'intervention d\'un technicien',
    metadata: {
      category: 'TECHNICAL',
      priority: 'HIGH',
      issueType: 'TECHNICAL',
      tags: ['alimentation', 'panne', 'urgent']
    }
  },

  // Error code input
  'tech_error_input': {
    id: 'tech_error_input',
    type: 'question',
    title: 'Quel code erreur s\'affiche ?',
    subtitle: 'Entrez le code exact pour obtenir une solution',
    options: [
      {
        id: 'e001',
        label: 'E001 - Erreur de communication',
        nextNodeId: 'tech_error_e001_solution'
      },
      {
        id: 'e002',
        label: 'E002 - Surchauffe détectée',
        nextNodeId: 'tech_error_e002_solution'
      },
      {
        id: 'e003',
        label: 'E003 - Capteur défaillant',
        nextNodeId: 'tech_error_e003_escalate'
      },
      {
        id: 'other_error',
        label: 'Autre code / Je ne sais pas',
        nextNodeId: 'tech_error_other'
      }
    ]
  },

  'tech_error_e001_solution': {
    id: 'tech_error_e001_solution',
    type: 'solution',
    title: 'Solution: Erreur E001 - Communication',
    solution: {
      title: 'Résolution de l\'erreur de communication',
      steps: [
        'Éteignez complètement l\'équipement',
        'Débranchez tous les câbles de données (USB, Ethernet, etc.)',
        'Attendez 60 secondes',
        'Rebranchez les câbles de données un par un',
        'Redémarrez l\'équipement',
        'Si l\'erreur persiste, essayez avec un autre câble'
      ],
      estimatedTime: '5 minutes',
      successRate: 80,
      fallbackNodeId: 'tech_error_escalate'
    }
  },

  'tech_error_e002_solution': {
    id: 'tech_error_e002_solution',
    type: 'solution',
    title: 'Solution: Erreur E002 - Surchauffe',
    solution: {
      title: 'Résolution de la surchauffe',
      steps: [
        'Éteignez IMMÉDIATEMENT l\'équipement',
        'Laissez refroidir pendant au moins 30 minutes',
        'Vérifiez que les grilles de ventilation ne sont pas obstruées',
        'Nettoyez les filtres à air si présents',
        'Assurez-vous que l\'environnement est bien ventilé',
        'Redémarrez et surveillez la température'
      ],
      estimatedTime: '30 minutes',
      successRate: 75,
      fallbackNodeId: 'tech_error_escalate'
    }
  },

  'tech_error_e003_escalate': {
    id: 'tech_error_e003_escalate',
    type: 'escalate',
    title: 'Erreur E003 - Capteur défaillant',
    subtitle: 'Cette erreur nécessite le remplacement d\'un composant',
    metadata: {
      category: 'TECHNICAL',
      priority: 'HIGH',
      issueType: 'TECHNICAL',
      tags: ['capteur', 'remplacement', 'E003']
    }
  },

  'tech_error_other': {
    id: 'tech_error_other',
    type: 'escalate',
    title: 'Code erreur non référencé',
    subtitle: 'Notre équipe technique analysera ce code',
    metadata: {
      category: 'TECHNICAL',
      priority: 'MEDIUM',
      issueType: 'TECHNICAL',
      tags: ['code-erreur', 'diagnostic']
    }
  },

  'tech_error_escalate': {
    id: 'tech_error_escalate',
    type: 'escalate',
    title: 'L\'erreur persiste',
    subtitle: 'Un technicien va prendre en charge votre dossier',
    metadata: {
      category: 'TECHNICAL',
      priority: 'HIGH',
      issueType: 'TECHNICAL'
    }
  },

  // Performance issues
  'tech_performance_root': {
    id: 'tech_performance_root',
    type: 'question',
    title: 'Quel problème de performance constatez-vous ?',
    options: [
      {
        id: 'slow',
        label: 'Fonctionnement ralenti',
        nextNodeId: 'tech_perf_slow_solution'
      },
      {
        id: 'noisy',
        label: 'Bruit anormal',
        nextNodeId: 'tech_perf_noisy_diag'
      },
      {
        id: 'hot',
        label: 'Surchauffe',
        nextNodeId: 'tech_error_e002_solution'
      },
      {
        id: 'intermittent',
        label: 'Fonctionnement intermittent',
        nextNodeId: 'tech_perf_intermittent_escalate'
      }
    ]
  },

  'tech_perf_slow_solution': {
    id: 'tech_perf_slow_solution',
    type: 'solution',
    title: 'Optimisation des performances',
    solution: {
      title: 'Améliorez les performances de votre équipement',
      steps: [
        'Effectuez un redémarrage complet de l\'équipement',
        'Vérifiez que le micrologiciel est à jour',
        'Nettoyez les filtres et grilles de ventilation',
        'Vérifiez l\'espace de stockage disponible si applicable',
        'Réduisez la charge de travail simultanée',
        'Planifiez une maintenance préventive si nécessaire'
      ],
      estimatedTime: '15 minutes',
      successRate: 65,
      fallbackNodeId: 'tech_perf_escalate'
    }
  },

  'tech_perf_noisy_diag': {
    id: 'tech_perf_noisy_diag',
    type: 'question',
    title: 'Quel type de bruit entendez-vous ?',
    options: [
      {
        id: 'grinding',
        label: 'Grincement / Frottement',
        nextNodeId: 'tech_perf_noisy_escalate'
      },
      {
        id: 'clicking',
        label: 'Cliquetis / Claquement',
        nextNodeId: 'tech_perf_noisy_escalate'
      },
      {
        id: 'humming',
        label: 'Bourdonnement / Vibration',
        nextNodeId: 'tech_perf_noisy_solution'
      },
      {
        id: 'fan',
        label: 'Ventilateur bruyant',
        nextNodeId: 'tech_perf_fan_solution'
      }
    ]
  },

  'tech_perf_noisy_solution': {
    id: 'tech_perf_noisy_solution',
    type: 'solution',
    title: 'Réduction des vibrations',
    solution: {
      title: 'Stabilisez votre équipement',
      steps: [
        'Vérifiez que l\'équipement est posé sur une surface stable et plane',
        'Ajustez les pieds de nivellement si présents',
        'Éloignez l\'équipement des autres sources de vibration',
        'Vérifiez le serrage de toutes les vis accessibles',
        'Placez un tapis anti-vibration sous l\'équipement si nécessaire'
      ],
      estimatedTime: '10 minutes',
      successRate: 70,
      fallbackNodeId: 'tech_perf_noisy_escalate'
    }
  },

  'tech_perf_fan_solution': {
    id: 'tech_perf_fan_solution',
    type: 'solution',
    title: 'Nettoyage du système de ventilation',
    solution: {
      title: 'Nettoyez le système de refroidissement',
      steps: [
        'Éteignez l\'équipement et débranchez-le',
        'Localisez les grilles de ventilation',
        'Utilisez de l\'air comprimé pour dépoussiérer (à distance)',
        'Nettoyez les filtres à air si accessibles',
        'Vérifiez qu\'aucun objet n\'obstrue les ouvertures',
        'Rebranchez et testez'
      ],
      estimatedTime: '15 minutes',
      successRate: 80,
      fallbackNodeId: 'tech_perf_noisy_escalate'
    }
  },

  'tech_perf_noisy_escalate': {
    id: 'tech_perf_noisy_escalate',
    type: 'escalate',
    title: 'Bruit anormal détecté',
    subtitle: 'Ce type de bruit peut indiquer une usure mécanique',
    metadata: {
      category: 'TECHNICAL',
      priority: 'MEDIUM',
      issueType: 'TECHNICAL',
      tags: ['bruit', 'mécanique', 'usure']
    }
  },

  'tech_perf_intermittent_escalate': {
    id: 'tech_perf_intermittent_escalate',
    type: 'escalate',
    title: 'Fonctionnement intermittent',
    subtitle: 'Un diagnostic approfondi est nécessaire',
    metadata: {
      category: 'TECHNICAL',
      priority: 'HIGH',
      issueType: 'TECHNICAL',
      tags: ['intermittent', 'instable']
    }
  },

  'tech_perf_escalate': {
    id: 'tech_perf_escalate',
    type: 'escalate',
    title: 'Problème de performance persistant',
    subtitle: 'Notre équipe va analyser votre situation',
    metadata: {
      category: 'TECHNICAL',
      priority: 'MEDIUM',
      issueType: 'TECHNICAL'
    }
  },

  'tech_physical_escalate': {
    id: 'tech_physical_escalate',
    type: 'escalate',
    title: 'Dommage physique constaté',
    subtitle: 'Une intervention sur site sera nécessaire',
    metadata: {
      category: 'TECHNICAL',
      priority: 'HIGH',
      issueType: 'TECHNICAL',
      tags: ['dommage', 'physique', 'intervention']
    }
  },

  // ========== DELIVERY BRANCH ==========
  'delivery_root': {
    id: 'delivery_root',
    type: 'question',
    title: 'Quelle est votre question concernant la livraison ?',
    metadata: { category: 'DELIVERY' },
    options: [
      {
        id: 'tracking',
        label: 'Suivre ma commande',
        description: 'Où en est ma livraison ?',
        icon: 'map-pin',
        nextNodeId: 'delivery_tracking_info'
      },
      {
        id: 'delay',
        label: 'Ma livraison est en retard',
        description: 'Date dépassée',
        icon: 'clock',
        nextNodeId: 'delivery_delay_diag'
      },
      {
        id: 'damaged',
        label: 'Colis endommagé',
        description: 'Produit abîmé à la réception',
        icon: 'package-x',
        nextNodeId: 'delivery_damaged_escalate'
      },
      {
        id: 'wrong',
        label: 'Erreur de commande',
        description: 'Mauvais produit reçu',
        icon: 'refresh-cw',
        nextNodeId: 'delivery_wrong_escalate'
      }
    ]
  },

  'delivery_tracking_info': {
    id: 'delivery_tracking_info',
    type: 'solution',
    title: 'Suivi de votre commande',
    solution: {
      title: 'Comment suivre votre livraison',
      steps: [
        'Accédez à la section "Mes commandes" dans votre espace client',
        'Cliquez sur la commande concernée',
        'Le statut et le numéro de suivi sont affichés',
        'Cliquez sur le numéro de suivi pour accéder au site du transporteur',
        'Vous pouvez également recevoir les notifications par email'
      ],
      estimatedTime: '1 minute',
      successRate: 95
    }
  },

  'delivery_delay_diag': {
    id: 'delivery_delay_diag',
    type: 'diagnostic',
    title: 'Analyse du retard de livraison',
    diagnostic: [
      {
        id: 'delay_check',
        question: 'La date de livraison estimée est-elle dépassée de plus de 48h ?',
        type: 'yes_no',
        yesNodeId: 'delivery_delay_escalate',
        noNodeId: 'delivery_delay_info'
      }
    ]
  },

  'delivery_delay_info': {
    id: 'delivery_delay_info',
    type: 'solution',
    title: 'Livraison en cours',
    solution: {
      title: 'Votre commande est en route',
      steps: [
        'Les délais de livraison sont indicatifs et peuvent varier de 24-48h',
        'Vérifiez le suivi pour connaître la position exacte du colis',
        'Assurez-vous que l\'adresse de livraison est correcte',
        'Le transporteur vous contactera en cas de problème de livraison',
        'Si le retard dépasse 48h, n\'hésitez pas à nous recontacter'
      ],
      estimatedTime: '2 minutes',
      successRate: 90
    }
  },

  'delivery_delay_escalate': {
    id: 'delivery_delay_escalate',
    type: 'escalate',
    title: 'Retard de livraison significatif',
    subtitle: 'Nous allons enquêter sur votre colis',
    metadata: {
      category: 'DELIVERY',
      priority: 'HIGH',
      issueType: 'DELIVERY',
      tags: ['retard', 'livraison', 'urgent']
    }
  },

  'delivery_damaged_escalate': {
    id: 'delivery_damaged_escalate',
    type: 'escalate',
    title: 'Colis endommagé',
    subtitle: 'Nous allons traiter votre réclamation en priorité',
    metadata: {
      category: 'DELIVERY',
      priority: 'HIGH',
      issueType: 'DELIVERY',
      tags: ['endommagé', 'réclamation', 'photos']
    }
  },

  'delivery_wrong_escalate': {
    id: 'delivery_wrong_escalate',
    type: 'escalate',
    title: 'Erreur de commande',
    subtitle: 'Nous organiserons l\'échange sans frais',
    metadata: {
      category: 'DELIVERY',
      priority: 'HIGH',
      issueType: 'DELIVERY',
      tags: ['erreur', 'échange', 'retour']
    }
  },

  // ========== BILLING BRANCH ==========
  'billing_root': {
    id: 'billing_root',
    type: 'question',
    title: 'Quelle est votre question de facturation ?',
    metadata: { category: 'BILLING' },
    options: [
      {
        id: 'invoice',
        label: 'Obtenir une facture',
        description: 'Télécharger ou recevoir une facture',
        icon: 'file-text',
        nextNodeId: 'billing_invoice_solution'
      },
      {
        id: 'payment',
        label: 'Question sur le paiement',
        description: 'Problème de paiement, moyens acceptés',
        icon: 'credit-card',
        nextNodeId: 'billing_payment_solution'
      },
      {
        id: 'refund',
        label: 'Demande de remboursement',
        description: 'Avoir, remboursement',
        icon: 'rotate-ccw',
        nextNodeId: 'billing_refund_escalate'
      },
      {
        id: 'dispute',
        label: 'Contestation',
        description: 'Montant incorrect, erreur de facturation',
        icon: 'alert-circle',
        nextNodeId: 'billing_dispute_escalate'
      }
    ]
  },

  'billing_invoice_solution': {
    id: 'billing_invoice_solution',
    type: 'solution',
    title: 'Accès à vos factures',
    solution: {
      title: 'Téléchargez vos factures en quelques clics',
      steps: [
        'Accédez à la section "Mes commandes"',
        'Sélectionnez la commande concernée',
        'Cliquez sur le bouton "Télécharger la facture"',
        'Le PDF sera téléchargé sur votre appareil',
        'Vous pouvez également demander l\'envoi par email'
      ],
      estimatedTime: '1 minute',
      successRate: 98
    }
  },

  'billing_payment_solution': {
    id: 'billing_payment_solution',
    type: 'solution',
    title: 'Informations de paiement',
    solution: {
      title: 'Modes de paiement et informations',
      steps: [
        'Nous acceptons: Carte bancaire, Virement, Prélèvement',
        'Les paiements par carte sont sécurisés (3D Secure)',
        'Pour le virement, utilisez la référence commande',
        'Les délais de traitement sont de 2-3 jours ouvrés',
        'Contactez-nous pour les facilités de paiement'
      ],
      estimatedTime: '2 minutes',
      successRate: 90
    }
  },

  'billing_refund_escalate': {
    id: 'billing_refund_escalate',
    type: 'escalate',
    title: 'Demande de remboursement',
    subtitle: 'Notre service comptabilité va traiter votre demande',
    metadata: {
      category: 'BILLING',
      priority: 'MEDIUM',
      issueType: 'BILLING',
      tags: ['remboursement', 'avoir', 'comptabilité']
    }
  },

  'billing_dispute_escalate': {
    id: 'billing_dispute_escalate',
    type: 'escalate',
    title: 'Contestation de facturation',
    subtitle: 'Nous allons vérifier votre dossier',
    metadata: {
      category: 'BILLING',
      priority: 'MEDIUM',
      issueType: 'BILLING',
      tags: ['contestation', 'erreur', 'vérification']
    }
  },

  // ========== OTHER BRANCH ==========
  'other_root': {
    id: 'other_root',
    type: 'question',
    title: 'Comment pouvons-nous vous aider ?',
    options: [
      {
        id: 'product_info',
        label: 'Information produit',
        description: 'Caractéristiques, compatibilité',
        icon: 'info',
        nextNodeId: 'other_product_chatbot'
      },
      {
        id: 'quote',
        label: 'Demande de devis',
        description: 'Obtenir un devis personnalisé',
        icon: 'calculator',
        nextNodeId: 'other_quote_escalate'
      },
      {
        id: 'partnership',
        label: 'Partenariat / Commercial',
        description: 'Devenir partenaire, contact commercial',
        icon: 'handshake',
        nextNodeId: 'other_partnership_escalate'
      },
      {
        id: 'feedback',
        label: 'Suggestion / Feedback',
        description: 'Partager votre avis',
        icon: 'message-square',
        nextNodeId: 'other_feedback_escalate'
      }
    ]
  },

  'other_product_chatbot': {
    id: 'other_product_chatbot',
    type: 'question',
    title: 'Assistant IA',
    subtitle: 'Notre assistant peut répondre à vos questions produits',
    options: [
      {
        id: 'use_chatbot',
        label: 'Discuter avec l\'assistant IA',
        nextNodeId: 'chatbot_redirect'
      },
      {
        id: 'contact_human',
        label: 'Parler à un conseiller',
        nextNodeId: 'other_info_escalate'
      }
    ]
  },

  'chatbot_redirect': {
    id: 'chatbot_redirect',
    type: 'solution',
    title: 'Assistant IA disponible',
    solution: {
      title: 'Utilisez notre assistant intelligent',
      steps: [
        'L\'assistant IA peut répondre à vos questions 24/7',
        'Posez votre question en langage naturel',
        'Vous pouvez demander des informations techniques',
        'Si nécessaire, l\'assistant vous orientera vers un conseiller'
      ],
      estimatedTime: 'Instantané',
      successRate: 85
    }
  },

  'other_info_escalate': {
    id: 'other_info_escalate',
    type: 'escalate',
    title: 'Demande d\'information',
    subtitle: 'Un conseiller vous répondra rapidement',
    metadata: {
      category: 'OTHER',
      priority: 'LOW',
      issueType: 'OTHER',
      tags: ['information', 'question']
    }
  },

  'other_quote_escalate': {
    id: 'other_quote_escalate',
    type: 'escalate',
    title: 'Demande de devis',
    subtitle: 'Notre service commercial vous contactera',
    metadata: {
      category: 'OTHER',
      priority: 'MEDIUM',
      issueType: 'OTHER',
      tags: ['devis', 'commercial']
    }
  },

  'other_partnership_escalate': {
    id: 'other_partnership_escalate',
    type: 'escalate',
    title: 'Demande de partenariat',
    subtitle: 'Notre direction commerciale étudiera votre demande',
    metadata: {
      category: 'OTHER',
      priority: 'LOW',
      issueType: 'OTHER',
      tags: ['partenariat', 'commercial', 'B2B']
    }
  },

  'other_feedback_escalate': {
    id: 'other_feedback_escalate',
    type: 'escalate',
    title: 'Votre avis compte',
    subtitle: 'Merci de partager votre retour d\'expérience',
    metadata: {
      category: 'OTHER',
      priority: 'LOW',
      issueType: 'OTHER',
      tags: ['feedback', 'suggestion', 'amélioration']
    }
  }
};

class DecisionTreeService {
  private currentNodeId: string = 'root';
  private journey: UserJourney;

  constructor() {
    this.journey = {
      startTime: new Date(),
      path: ['root'],
      answers: {},
      resolved: false
    };
  }

  getCurrentNode(): DecisionNode {
    return DECISION_TREE[this.currentNodeId];
  }

  getNode(nodeId: string): DecisionNode | null {
    return DECISION_TREE[nodeId] || null;
  }

  selectOption(optionId: string): DecisionNode | null {
    const currentNode = this.getCurrentNode();

    if (currentNode.options) {
      const option = currentNode.options.find(o => o.id === optionId);
      if (option) {
        this.journey.path.push(option.nextNodeId);
        this.journey.answers[currentNode.id] = optionId;
        this.currentNodeId = option.nextNodeId;
        return this.getCurrentNode();
      }
    }

    return null;
  }

  answerDiagnostic(answer: 'yes' | 'no', stepId: string): DecisionNode | null {
    const currentNode = this.getCurrentNode();

    if (currentNode.diagnostic) {
      const step = currentNode.diagnostic.find(s => s.id === stepId);
      if (step) {
        const nextNodeId = answer === 'yes' ? step.yesNodeId : step.noNodeId;
        if (nextNodeId) {
          this.journey.path.push(nextNodeId);
          this.journey.answers[`${currentNode.id}_${stepId}`] = answer;
          this.currentNodeId = nextNodeId;
          return this.getCurrentNode();
        }
      }
    }

    return null;
  }

  goBack(): DecisionNode | null {
    if (this.journey.path.length > 1) {
      this.journey.path.pop();
      this.currentNodeId = this.journey.path[this.journey.path.length - 1];
      return this.getCurrentNode();
    }
    return null;
  }

  reset(): DecisionNode {
    this.currentNodeId = 'root';
    this.journey = {
      startTime: new Date(),
      path: ['root'],
      answers: {},
      resolved: false
    };
    return this.getCurrentNode();
  }

  markResolved(resolved: boolean): void {
    this.journey.resolved = resolved;
    this.journey.finalNode = this.currentNodeId;
  }

  getJourney(): UserJourney {
    return { ...this.journey };
  }

  // Get progress percentage
  getProgress(): number {
    // Estimate based on typical path length (5-7 steps)
    return Math.min(100, (this.journey.path.length / 6) * 100);
  }

  // Check if current node is terminal
  isTerminal(): boolean {
    const node = this.getCurrentNode();
    return node.type === 'solution' || node.type === 'escalate';
  }

  // Get breadcrumb trail
  getBreadcrumbs(): Array<{ id: string; title: string }> {
    return this.journey.path.map(nodeId => ({
      id: nodeId,
      title: DECISION_TREE[nodeId]?.title || nodeId
    }));
  }
}

export const createDecisionTree = () => new DecisionTreeService();
export default DecisionTreeService;
