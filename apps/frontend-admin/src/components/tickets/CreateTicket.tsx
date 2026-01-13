import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  User,
  Mail,
  FileText,
  Tag,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Paperclip,
  Upload,
  X,
  File,
} from 'lucide-react';
import { IssueType, TicketPriority } from '../../types';
import { AdminApi } from '../../services/api';

// ============================================
// CREATE TICKET PAGE
// ============================================
// Formulaire de création manuelle de ticket
// Accessible depuis /admin/tickets/new

interface FormData {
  customerName: string;
  customerEmail: string;
  subject: string;
  category: IssueType;
  priority: TicketPriority;
  description: string;
}

interface FormErrors {
  customerName?: string;
  customerEmail?: string;
  subject?: string;
  description?: string;
}

// Interface pour les fichiers avec preview
interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    subject: '',
    category: IssueType.TECHNICAL,
    priority: TicketPriority.MEDIUM,
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Options pour les selects
  const categoryOptions = [
    { value: IssueType.TECHNICAL, label: 'Problème technique' },
    { value: IssueType.BILLING, label: 'Facturation' },
    { value: IssueType.DELIVERY, label: 'Livraison' },
    { value: IssueType.OTHER, label: 'Autre' },
  ];

  const priorityOptions = [
    { value: TicketPriority.LOW, label: 'Basse', color: 'bg-slate-100 text-slate-600' },
    { value: TicketPriority.MEDIUM, label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
    { value: TicketPriority.HIGH, label: 'Haute', color: 'bg-orange-100 text-orange-600' },
    { value: TicketPriority.URGENT, label: 'Urgente', color: 'bg-red-100 text-red-600' },
  ];

  // Helpers pour les fichiers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImageFile = (type: string): boolean => {
    return type.startsWith('image/');
  };

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
  };

  // Gestion des fichiers
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setFileError(null);

    const newFiles: FileWithPreview[] = [];

    Array.from(files).forEach((file) => {
      // Vérifier la taille
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`Le fichier "${file.name}" dépasse la taille maximale de 10MB`);
        return;
      }

      // Vérifier le type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(`Le type de fichier "${file.name}" n'est pas supporté`);
        return;
      }

      // Vérifier si déjà ajouté
      if (attachments.some((att) => att.file.name === file.name && att.file.size === file.size)) {
        return;
      }

      const fileWithPreview: FileWithPreview = {
        file,
        id: generateId(),
      };

      // Créer une preview pour les images
      if (isImageFile(file.type)) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      newFiles.push(fileWithPreview);
    });

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const toRemove = prev.find((att) => att.id === id);
      if (toRemove?.preview) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter((att) => att.id !== id);
    });
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Le nom du client est requis';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Format d\'email invalide';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Le sujet est requis';
    } else if (formData.subject.length < 5) {
      newErrors.subject = 'Le sujet doit contenir au moins 5 caractères';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.length < 20) {
      newErrors.description = 'La description doit contenir au moins 20 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Appel API pour créer le ticket
      await AdminApi.createTicket({
        title: formData.subject,
        description: formData.description,
        issueType: formData.category,
        priority: formData.priority,
        contactName: formData.customerName,
        contactEmail: formData.customerEmail,
      });

      // TODO: Upload des pièces jointes si nécessaire
      // Les pièces jointes devront être uploadées séparément via /admin/upload
      // puis liées au ticket créé

      // Cleanup des previews
      attachments.forEach((att) => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });

      setIsSuccess(true);

      // Rediriger après 1.5s
      setTimeout(() => {
        navigate('/admin/tickets');
      }, 1500);
    } catch (error) {
      console.error('Error creating ticket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du ticket';
      setErrors({ ...errors, subject: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestion des changements
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Affichage succès
  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Ticket créé avec succès !
          </h2>
          <p className="text-slate-500">
            Redirection vers la liste des tickets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-slate-600 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </button>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Ticket className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Créer un ticket</h1>
            <p className="text-sm text-slate-500">
              Créez manuellement un ticket pour un client
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer info card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-slate-400" />
            Informations client
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer name */}
            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Nom du client *
              </label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                  errors.customerName
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                placeholder="Jean Dupont"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
              )}
            </div>

            {/* Customer email */}
            <div>
              <label
                htmlFor="customerEmail"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    errors.customerEmail
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  placeholder="client@example.com"
                />
              </div>
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ticket details card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-slate-400" />
            Détails du ticket
          </h2>

          {/* Subject */}
          <div className="mb-4">
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Sujet *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                errors.subject
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="Décrivez brièvement le problème"
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                <Tag className="w-4 h-4 inline mr-1" />
                Catégorie
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-colors bg-white"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Priorité
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-slate-300 transition-colors bg-white"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority indicator */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500">Priorité sélectionnée:</span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  priorityOptions.find((p) => p.value === formData.priority)?.color
                }`}
              >
                {priorityOptions.find((p) => p.value === formData.priority)?.label}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none ${
                errors.description
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              placeholder="Décrivez le problème en détail..."
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description}</p>
              ) : (
                <span className="text-xs text-slate-400">
                  Minimum 20 caractères
                </span>
              )}
              <span
                className={`text-xs ${
                  formData.description.length < 20
                    ? 'text-slate-400'
                    : 'text-green-600'
                }`}
              >
                {formData.description.length} caractères
              </span>
            </div>
          </div>
        </div>

        {/* Attachments card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Paperclip className="w-5 h-5 mr-2 text-slate-400" />
            Pièces jointes
            {attachments.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-600 rounded-full">
                {attachments.length}
              </span>
            )}
          </h2>

          {/* Drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_FILE_TYPES.join(',')}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${
                isDragging ? 'text-indigo-500' : 'text-slate-400'
              }`}
            />
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-medium text-indigo-600">Cliquez pour ajouter</span> ou
              glissez-déposez vos fichiers
            </p>
            <p className="text-xs text-slate-400">
              Images (JPEG, PNG, GIF, WebP), PDF, Word, TXT - Max 10MB par fichier
            </p>
          </div>

          {/* Error message */}
          {fileError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          {/* Attachments list */}
          {attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Fichiers sélectionnés:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                  >
                    {/* Image preview */}
                    {attachment.preview ? (
                      <div className="aspect-video relative">
                        <img
                          src={attachment.preview}
                          alt={attachment.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-slate-100">
                        <File className="w-12 h-12 text-slate-400" />
                      </div>
                    )}

                    {/* File info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatFileSize(attachment.file.size)}
                      </p>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(attachment.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Création...</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" />
                <span>Créer le ticket</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
