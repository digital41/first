import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  icon?: React.ReactNode;
  iconBgColor?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  icon,
  iconBgColor = 'bg-primary-100',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}`}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          {icon && (
            <div className={`w-14 h-14 ${iconBgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {icon}
            </div>
          )}

          {/* Title */}
          {title && (
            <h2
              id="modal-title"
              className="text-xl font-semibold text-gray-900 text-center mb-4"
            >
              {title}
            </h2>
          )}

          {/* Children */}
          {children}
        </div>
      </div>
    </div>
  );
}

// Error Modal variant
interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: React.ReactNode;
  buttonText?: string;
}

export function ErrorModal({
  isOpen,
  onClose,
  title = 'Erreur',
  message,
  details,
  buttonText = 'Compris',
}: ErrorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={
        <svg
          className="w-7 h-7 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      iconBgColor="bg-red-100"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>

        {details && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-left">
            {details}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full btn-primary py-3"
        >
          {buttonText}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
