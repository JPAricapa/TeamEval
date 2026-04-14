/**
 * Utilidad de envío de correo
 * Usa nodemailer si EMAIL_HOST está configurado;
 * de lo contrario imprime el enlace en consola (modo desarrollo).
 */

import nodemailer from 'nodemailer';
import { logger } from './logger';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

async function getTransporter() {
  const host = process.env.EMAIL_HOST;

  if (!host) {
    // Sin configuración SMTP: modo consola
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendMail(options: MailOptions): Promise<void> {
  const transporter = await getTransporter();

  if (!transporter) {
    // Fallback de desarrollo: mostrar en consola
    logger.info('📧 [EMAIL - modo consola] ─────────────────────────');
    logger.info(`   Para: ${options.to}`);
    logger.info(`   Asunto: ${options.subject}`);
    // Extraer el enlace del HTML para mayor claridad
    const urlMatch = options.html.match(/href="([^"]+)"/);
    if (urlMatch) logger.info(`   Enlace: ${urlMatch[1]}`);
    logger.info('─────────────────────────────────────────────────');
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `"TeamEval" <no-reply@teameval.edu.co>`,
    ...options,
  });
}

export function buildInvitationEmail(
  inviteUrl: string,
  firstName: string,
  adminName: string,
  role: string
): string {
  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    TEACHER: 'Docente',
    STUDENT: 'Estudiante',
  };
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🎓 TeamEval</h1>
          <p style="color:#bfdbfe;margin:8px 0 0;font-size:13px;">Plataforma de Evaluación de Trabajo en Equipo</p>
        </div>
        <!-- Body -->
        <div style="padding:36px 40px;">
          <h2 style="color:#1e293b;margin:0 0 12px;font-size:18px;">¡Hola, ${firstName}!</h2>
          <p style="color:#475569;line-height:1.6;margin:0 0 16px;">
            <strong>${adminName}</strong> te ha creado una cuenta en <strong>TeamEval</strong>
            con el rol de <strong>${roleLabel[role] ?? role}</strong>.
          </p>
          <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
            Haz clic en el botón para activar tu cuenta y establecer tu contraseña.
            Este enlace es válido por <strong>7 días</strong>.
          </p>
          <div style="text-align:center;margin:0 0 28px;">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
              Activar mi cuenta
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
            Si no esperabas este correo, puedes ignorarlo.<br/>
            Por seguridad, no compartas este enlace con nadie.
          </p>
        </div>
        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 40px;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} TeamEval — Plataforma de Evaluación Colaborativa</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildPasswordResetEmail(resetUrl: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:32px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🎓 TeamEval</h1>
          <p style="color:#bfdbfe;margin:8px 0 0;font-size:13px;">Plataforma de Evaluación de Trabajo en Equipo</p>
        </div>
        <!-- Body -->
        <div style="padding:36px 40px;">
          <h2 style="color:#1e293b;margin:0 0 12px;font-size:18px;">Hola, ${firstName}</h2>
          <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en TeamEval.
            Haz clic en el botón para continuar. Este enlace es válido por <strong>1 hora</strong>.
          </p>
          <div style="text-align:center;margin:0 0 28px;">
            <a href="${resetUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                      padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
            Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no será modificada.<br/>
            Por seguridad, no compartas este enlace con nadie.
          </p>
        </div>
        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 40px;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} TeamEval — Plataforma de Evaluación Colaborativa</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
