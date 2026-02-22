import { env } from '../config/env.js';
import { logger } from './logger.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!env.BREVO_API_KEY) {
    logger.warn({ to: options.to, subject: options.subject }, 'Email skipped — BREVO_API_KEY not configured');
    return;
  }

  const toEmails = Array.isArray(options.to) ? options.to : [options.to];

  const body = {
    sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM },
    to: toEmails.map((email) => ({ email })),
    subject: options.subject,
    htmlContent: options.html,
    ...(options.text && { textContent: options.text }),
    ...(options.reply_to && { replyTo: { email: options.reply_to } }),
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as { messageId?: string; code?: string; message?: string };

    if (!res.ok) {
      logger.error({ status: res.status, data, to: options.to }, 'Failed to send email');
      throw new Error(data?.message ?? `Email send failed: ${res.status}`);
    }

    logger.info({ messageId: data?.messageId, to: options.to, subject: options.subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to: options.to }, 'Email service error');
    throw err;
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────

export function matchFoundEmailHtml(params: {
  ownerName: string;
  lostItemTitle: string;
  foundItemTitle: string;
  matchScore: number;
  foundItemLocation?: string | null;
  itemUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Match Found — FoundU</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #7c3aed; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">FoundU</h1>
    <p style="color: #e9d5ff; margin: 8px 0 0;">We may have found your item!</p>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
    <p>Hi <strong>${params.ownerName}</strong>,</p>
    <p>Great news! We found a potential match for your lost item.</p>
    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
      <p style="margin: 0 0 8px;"><strong>Your lost item:</strong> ${params.lostItemTitle}</p>
      <p style="margin: 0 0 8px;"><strong>Potential match:</strong> ${params.foundItemTitle}</p>
      ${params.foundItemLocation ? `<p style="margin: 0 0 8px;"><strong>Found at:</strong> ${params.foundItemLocation}</p>` : ''}
      <p style="margin: 0;"><strong>Match confidence:</strong> ${Math.round(params.matchScore * 100)}%</p>
    </div>
    <a href="${params.itemUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Match</a>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If this is not your item, you can dismiss this match on the platform.</p>
  </div>
</body>
</html>`;
}

export function ucardFoundEmailHtml(params: {
  recipientEmail: string;
  finderNote?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>UCard Found — FoundU</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #7c3aed; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">FoundU</h1>
    <p style="color: #e9d5ff; margin: 8px 0 0;">Your UCard has been found</p>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
    <p>Hello,</p>
    <p>Someone has submitted your UMass UCard on the FoundU platform.</p>
    ${params.finderNote ? `<div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;"><p style="margin: 0;"><strong>Note from finder:</strong> ${params.finderNote}</p></div>` : ''}
    <p>Please log into FoundU to claim your card and arrange pickup.</p>
    <a href="${env.FRONTEND_URL}/ucard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Claim My Card</a>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">For security, your SPIRE ID is never stored or displayed on our platform.</p>
  </div>
</body>
</html>`;
}

export function claimVerificationEmailHtml(params: {
  claimantName: string;
  itemTitle: string;
  verificationQuestion: string;
  claimUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Claim Submitted — FoundU</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: #7c3aed; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">FoundU</h1>
    <p style="color: #e9d5ff; margin: 8px 0 0;">Someone is claiming your found item</p>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
    <p>Hi,</p>
    <p><strong>${params.claimantName}</strong> has submitted a claim for <strong>${params.itemTitle}</strong>.</p>
    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
      <p style="margin: 0;"><strong>Verification question asked:</strong></p>
      <p style="margin: 8px 0 0; color: #374151;">${params.verificationQuestion}</p>
    </div>
    <a href="${params.claimUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review Claim</a>
  </div>
</body>
</html>`;
}
