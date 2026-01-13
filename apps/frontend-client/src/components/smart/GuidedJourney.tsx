import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Wrench,
  Truck,
  FileText,
  Clock,
  ChevronRight,
  RotateCcw,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { createDecisionTree, DecisionNode, DecisionOption } from '@/services/decisionTree';
import { cn } from '@/utils/helpers';

interface GuidedJourneyProps {
  onComplete: (result: {
    resolved: boolean;
    needsTicket: boolean;
    ticketData?: {
      title: string;
      description: string;
      issueType: string;
      priority: string;
      tags: string[];
    };
  }) => void;
  onOpenChatbot: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'wrench': Wrench,
  'truck': Truck,
  'file-text': FileText,
  'help-circle': HelpCircle,
  'power': Zap,
  'alert-triangle': AlertTriangle,
  'activity': Target,
  'shield-off': AlertTriangle,
  'map-pin': Target,
  'clock': Clock,
  'package-x': AlertTriangle,
  'refresh-cw': RotateCcw,
  'info': HelpCircle,
  'calculator': FileText,
  'handshake': CheckCircle,
  'message-square': MessageSquare,
  'credit-card': FileText,
  'rotate-ccw': RotateCcw,
  'alert-circle': AlertTriangle
};

export function GuidedJourney({ onComplete, onOpenChatbot }: GuidedJourneyProps) {
  const navigate = useNavigate();
  const [treeService] = useState(() => createDecisionTree());
  const [currentNode, setCurrentNode] = useState<DecisionNode>(treeService.getCurrentNode());
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [solutionTried, setSolutionTried] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  useEffect(() => {
    setProgress(treeService.getProgress());
  }, [currentNode, treeService]);

  const handleOptionSelect = (option: DecisionOption) => {
    setIsAnimating(true);
    setTimeout(() => {
      const nextNode = treeService.selectOption(option.id);
      if (nextNode) {
        setCurrentNode(nextNode);
        setSolutionTried(false);
        setFeedback(null);
      }
      setIsAnimating(false);
    }, 200);
  };

  const handleDiagnosticAnswer = (answer: 'yes' | 'no', stepId: string) => {
    setIsAnimating(true);
    setTimeout(() => {
      const nextNode = treeService.answerDiagnostic(answer, stepId);
      if (nextNode) {
        setCurrentNode(nextNode);
        setSolutionTried(false);
        setFeedback(null);
      }
      setIsAnimating(false);
    }, 200);
  };

  const handleGoBack = () => {
    const prevNode = treeService.goBack();
    if (prevNode) {
      setCurrentNode(prevNode);
      setSolutionTried(false);
      setFeedback(null);
    }
  };

  const handleReset = () => {
    const rootNode = treeService.reset();
    setCurrentNode(rootNode);
    setSolutionTried(false);
    setFeedback(null);
  };

  const handleSolutionWorked = () => {
    setFeedback('positive');
    treeService.markResolved(true);
    onComplete({
      resolved: true,
      needsTicket: false
    });
  };

  const handleSolutionFailed = () => {
    setFeedback('negative');
    setSolutionTried(true);

    // If there's a fallback, go there
    if (currentNode.solution?.fallbackNodeId) {
      setTimeout(() => {
        const fallbackNode = treeService.getNode(currentNode.solution!.fallbackNodeId!);
        if (fallbackNode) {
          treeService.selectOption(currentNode.solution!.fallbackNodeId!);
          setCurrentNode(fallbackNode);
          setSolutionTried(false);
          setFeedback(null);
        }
      }, 500);
    }
  };

  const handleEscalate = () => {
    const metadata = currentNode.metadata || {};
    const journey = treeService.getJourney();

    onComplete({
      resolved: false,
      needsTicket: true,
      ticketData: {
        title: currentNode.title,
        description: `Parcours de diagnostic: ${journey.path.join(' > ')}`,
        issueType: metadata.issueType || 'OTHER',
        priority: metadata.priority || 'MEDIUM',
        tags: metadata.tags || []
      }
    });
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return HelpCircle;
    return ICON_MAP[iconName] || HelpCircle;
  };

  const breadcrumbs = treeService.getBreadcrumbs();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center flex-wrap gap-1 mb-6 text-sm">
          {breadcrumbs.slice(-3).map((crumb, index, arr) => (
            <React.Fragment key={crumb.id}>
              <span className={cn(
                'truncate max-w-[150px]',
                index === arr.length - 1
                  ? 'text-primary-600 font-medium'
                  : 'text-gray-500'
              )}>
                {crumb.title}
              </span>
              {index < arr.length - 1 && (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        'card p-8 transition-all duration-300',
        isAnimating && 'opacity-50 scale-98'
      )}>
        {/* Question / Diagnostic */}
        {(currentNode.type === 'question' || currentNode.type === 'diagnostic') && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {currentNode.type === 'diagnostic' ? (
                  <Target className="text-primary-600" size={32} />
                ) : (
                  <HelpCircle className="text-primary-600" size={32} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentNode.title}
              </h2>
              {currentNode.subtitle && (
                <p className="text-gray-600">{currentNode.subtitle}</p>
              )}
            </div>

            {/* Options */}
            {currentNode.options && (
              <div className="grid gap-3 mt-8">
                {currentNode.options.map((option) => {
                  const Icon = getIcon(option.icon);
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option)}
                      className="group flex items-center p-4 bg-gray-50 hover:bg-primary-50 border-2 border-gray-200 hover:border-primary-500 rounded-xl transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-white group-hover:bg-primary-100 rounded-xl flex items-center justify-center mr-4 transition-colors">
                        <Icon className="text-gray-500 group-hover:text-primary-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 group-hover:text-primary-700">
                          {option.label}
                        </p>
                        {option.description && (
                          <p className="text-sm text-gray-500">{option.description}</p>
                        )}
                      </div>
                      <ArrowRight className="text-gray-400 group-hover:text-primary-600 transition-colors" size={20} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Diagnostic questions */}
            {currentNode.diagnostic && currentNode.diagnostic.map((step) => (
              <div key={step.id} className="mt-8">
                <p className="text-lg font-medium text-gray-900 text-center mb-6">
                  {step.question}
                </p>
                {step.type === 'yes_no' && (
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => handleDiagnosticAnswer('yes', step.id)}
                      className="flex items-center px-8 py-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-500 rounded-xl text-green-700 font-medium transition-all"
                    >
                      <Check size={20} className="mr-2" />
                      Oui
                    </button>
                    <button
                      onClick={() => handleDiagnosticAnswer('no', step.id)}
                      className="flex items-center px-8 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-500 rounded-xl text-red-700 font-medium transition-all"
                    >
                      <AlertTriangle size={20} className="mr-2" />
                      Non
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Solution */}
        {currentNode.type === 'solution' && currentNode.solution && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentNode.title}
              </h2>
              {currentNode.solution.estimatedTime && (
                <p className="text-sm text-gray-500">
                  <Clock size={14} className="inline mr-1" />
                  Durée estimée: {currentNode.solution.estimatedTime}
                </p>
              )}
              {currentNode.solution.successRate && (
                <div className="mt-2 inline-flex items-center px-3 py-1 bg-green-100 rounded-full">
                  <span className="text-sm text-green-700">
                    {currentNode.solution.successRate}% de réussite
                  </span>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="bg-gray-50 rounded-xl p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">{currentNode.solution.title}</h3>
              <ol className="space-y-3">
                {currentNode.solution.steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Feedback */}
            {!feedback && (
              <div className="bg-blue-50 rounded-xl p-6 mt-6">
                <p className="text-center text-blue-800 font-medium mb-4">
                  Cette solution a-t-elle résolu votre problème ?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleSolutionWorked}
                    className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
                  >
                    <ThumbsUp size={20} className="mr-2" />
                    Oui, c'est résolu !
                  </button>
                  <button
                    onClick={handleSolutionFailed}
                    className="flex items-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-all"
                  >
                    <ThumbsDown size={20} className="mr-2" />
                    Non, le problème persiste
                  </button>
                </div>
              </div>
            )}

            {/* Success feedback */}
            {feedback === 'positive' && (
              <div className="bg-green-50 rounded-xl p-6 mt-6 text-center">
                <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Parfait ! Nous sommes ravis d'avoir pu vous aider.
                </h3>
                <p className="text-green-700">
                  N'hésitez pas à nous recontacter si vous avez d'autres questions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Escalate */}
        {currentNode.type === 'escalate' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-orange-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentNode.title}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {currentNode.subtitle}
            </p>

            {currentNode.metadata?.priority === 'URGENT' && (
              <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full">
                <AlertTriangle size={16} className="mr-2" />
                Priorité urgente
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6 mt-6">
              <p className="text-gray-700 mb-4">
                Notre équipe technique va prendre en charge votre demande et vous répondre dans les plus brefs délais.
              </p>
              <button
                onClick={handleEscalate}
                className="btn-primary w-full py-3"
              >
                <MessageSquare size={18} className="mr-2" />
                Créer un ticket maintenant
              </button>
            </div>

            <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
              <Sparkles size={14} className="mr-1" />
              Ou posez votre question à notre
              <button
                onClick={onOpenChatbot}
                className="text-primary-600 hover:text-primary-700 ml-1 font-medium"
              >
                assistant IA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleGoBack}
          disabled={breadcrumbs.length <= 1}
          className={cn(
            'flex items-center px-4 py-2 rounded-lg transition-colors',
            breadcrumbs.length <= 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </button>

        <button
          onClick={handleReset}
          className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={18} className="mr-2" />
          Recommencer
        </button>
      </div>
    </div>
  );
}

export default GuidedJourney;
