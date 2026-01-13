import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config/index.js';

// ============================================
// SERVICE EMAIL
// ============================================

let transporter: Transporter | null = null;

/**
 * Initialise le transporteur SMTP
 */
function getTransporter(): Transporter | null {
  if (!config.email.host || !config.email.user || !config.email.pass) {
    console.warn('[Email] Configuration SMTP manquante - emails désactivés');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  return transporter;
}

/**
 * Envoie un email générique
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log('[Email] Simulation envoi:', { to: options.to, subject: options.subject });
    return false;
  }

  try {
    await transport.sendMail({
      from: config.email.from || 'noreply@klygroupe.com',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log('[Email] Envoyé:', options.subject, '->', options.to);
    return true;
  } catch (error) {
    console.error('[Email] Erreur envoi:', error);
    return false;
  }
}

// ============================================
// TEMPLATES EMAIL
// ============================================

/**
 * Email de confirmation de création de ticket
 */
export async function sendTicketCreatedEmail(params: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  customerName: string;
}): Promise<boolean> {
  const { to, ticketId, ticketTitle, customerName } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .ticket-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>KLY Groupe - Service Client</h1>
    </div>
    <div class="content">
      <p>Bonjour ${customerName},</p>
      <p>Votre demande a bien été enregistrée. Notre équipe la traitera dans les meilleurs délais.</p>
      <div class="ticket-info">
        <p><strong>Référence:</strong> ${ticketId.slice(0, 8).toUpperCase()}</p>
        <p><strong>Sujet:</strong> ${ticketTitle}</p>
      </div>
      <p>Vous pouvez suivre l'avancement de votre demande en vous connectant à votre espace client.</p>
    </div>
    <div class="footer">
      <p>Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>&copy; ${new Date().getFullYear()} KLY Groupe - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `[Ticket #${ticketId.slice(0, 8).toUpperCase()}] Votre demande a été enregistrée`,
    html,
    text: `Bonjour ${customerName},\n\nVotre demande "${ticketTitle}" a bien été enregistrée (Réf: ${ticketId.slice(0, 8).toUpperCase()}).\n\nCordialement,\nL'équipe KLY Groupe`,
  });
}

/**
 * Email de mise à jour de statut
 */
export async function sendTicketStatusUpdateEmail(params: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  customerName: string;
  newStatus: string;
  statusLabel: string;
}): Promise<boolean> {
  const { to, ticketId, ticketTitle, customerName, statusLabel } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .status-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; }
    .ticket-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mise à jour de votre demande</h1>
    </div>
    <div class="content">
      <p>Bonjour ${customerName},</p>
      <p>Le statut de votre demande a été mis à jour:</p>
      <div class="ticket-info">
        <p><strong>Référence:</strong> ${ticketId.slice(0, 8).toUpperCase()}</p>
        <p><strong>Sujet:</strong> ${ticketTitle}</p>
        <p><strong>Nouveau statut:</strong> <span class="status-badge">${statusLabel}</span></p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} KLY Groupe</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `[Ticket #${ticketId.slice(0, 8).toUpperCase()}] Statut mis à jour: ${statusLabel}`,
    html,
    text: `Bonjour ${customerName},\n\nLe statut de votre demande "${ticketTitle}" est maintenant: ${statusLabel}.\n\nCordialement,\nL'équipe KLY Groupe`,
  });
}

/**
 * Email de nouveau message
 */
export async function sendNewMessageEmail(params: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  customerName: string;
  senderName: string;
  messagePreview: string;
}): Promise<boolean> {
  const { to, ticketId, ticketTitle, customerName, senderName, messagePreview } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .message-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nouveau message</h1>
    </div>
    <div class="content">
      <p>Bonjour ${customerName},</p>
      <p><strong>${senderName}</strong> a répondu à votre demande "${ticketTitle}":</p>
      <div class="message-box">
        <p>${messagePreview}</p>
      </div>
      <p>Connectez-vous à votre espace client pour voir le message complet et répondre.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} KLY Groupe</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `[Ticket #${ticketId.slice(0, 8).toUpperCase()}] Nouveau message de ${senderName}`,
    html,
    text: `Bonjour ${customerName},\n\n${senderName} a répondu à votre demande:\n\n"${messagePreview}"\n\nConnectez-vous pour voir le message complet.\n\nCordialement,\nL'équipe KLY Groupe`,
  });
}

/**
 * Email d'avertissement SLA (pour les agents)
 */
export async function sendSlaWarningEmail(params: {
  to: string;
  agentName: string;
  ticketId: string;
  ticketTitle: string;
  hoursRemaining: number;
}): Promise<boolean> {
  const { to, agentName, ticketId, ticketTitle, hoursRemaining } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #fff7ed; }
    .warning { background: white; padding: 15px; border: 2px solid #f59e0b; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Avertissement SLA</h1>
    </div>
    <div class="content">
      <p>Bonjour ${agentName},</p>
      <p>Un ticket qui vous est assigné approche de sa date limite SLA:</p>
      <div class="warning">
        <p><strong>Référence:</strong> ${ticketId.slice(0, 8).toUpperCase()}</p>
        <p><strong>Sujet:</strong> ${ticketTitle}</p>
        <p><strong>⏰ Temps restant:</strong> ${hoursRemaining} heures</p>
      </div>
      <p>Veuillez traiter ce ticket rapidement pour éviter une violation SLA.</p>
    </div>
    <div class="footer">
      <p>Système SAV KLY Groupe</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `⚠️ [SLA] Ticket #${ticketId.slice(0, 8).toUpperCase()} - ${hoursRemaining}h restantes`,
    html,
    text: `Avertissement SLA\n\nLe ticket "${ticketTitle}" (${ticketId.slice(0, 8).toUpperCase()}) doit être traité dans ${hoursRemaining} heures.`,
  });
}

/**
 * Email de violation SLA (pour superviseurs)
 */
export async function sendSlaBreachEmail(params: {
  to: string;
  ticketId: string;
  ticketTitle: string;
  assignedAgent?: string;
  breachTime: Date;
}): Promise<boolean> {
  const { to, ticketId, ticketTitle, assignedAgent, breachTime } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #fef2f2; }
    .breach { background: white; padding: 15px; border: 2px solid #dc2626; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Violation SLA</h1>
    </div>
    <div class="content">
      <p>Un ticket a dépassé son délai SLA:</p>
      <div class="breach">
        <p><strong>Référence:</strong> ${ticketId.slice(0, 8).toUpperCase()}</p>
        <p><strong>Sujet:</strong> ${ticketTitle}</p>
        <p><strong>Agent assigné:</strong> ${assignedAgent || 'Non assigné'}</p>
        <p><strong>Date violation:</strong> ${breachTime.toLocaleString('fr-FR')}</p>
      </div>
      <p>Une action immédiate est requise.</p>
    </div>
    <div class="footer">
      <p>Système SAV KLY Groupe</p>
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🚨 [SLA VIOLATION] Ticket #${ticketId.slice(0, 8).toUpperCase()}`,
    html,
    text: `Violation SLA\n\nLe ticket "${ticketTitle}" (${ticketId.slice(0, 8).toUpperCase()}) a dépassé son délai SLA.\nAgent: ${assignedAgent || 'Non assigné'}\nDate: ${breachTime.toLocaleString('fr-FR')}`,
  });
}

/**
 * Vérifie la configuration SMTP
 */
export async function verifyEmailConfig(): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    await transport.verify();
    console.log('[Email] Configuration SMTP vérifiée');
    return true;
  } catch (error) {
    console.error('[Email] Configuration SMTP invalide:', error);
    return false;
  }
}
