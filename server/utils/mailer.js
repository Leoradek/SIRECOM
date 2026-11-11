const nodemailer = require('nodemailer');
const config = require('../config');
const { TURNO_INFO } = require('./constants');

let transporter = null;
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

const layout = (title, bodyHtml) => `
<div style="font-family:Inter,Arial,sans-serif;background:#F5F6F8;padding:24px">
  <div style="max-width:520px;margin:auto;background:#FFFFFF;border-radius:12px;overflow:hidden">
    <div style="background:#1B2A4A;color:#FFFFFF;padding:16px 24px;font-weight:700">SIRECOM</div>
    <div style="padding:24px;color:#1B2A4A">
      <h2 style="margin:0 0 12px">${title}</h2>
      ${bodyHtml}
      <p style="color:#5B6472;font-size:12px;margin-top:24px">Sistema de Reservas de Comedores Universitarios - Universidad Adventista de Bolivia</p>
    </div>
  </div>
</div>`;

/** Envía un correo. Sin SMTP configurado, lo imprime en consola (modo desarrollo). */
const send = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log(`\n[MAIL:DEV] Para: ${to}\n[MAIL:DEV] Asunto: ${subject}\n[MAIL:DEV] ${text}\n`);
    return { simulated: true };
  }
  return transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
};

/** Envío "best effort": un fallo de correo nunca debe romper una reserva */
const safeSend = (payload) =>
  send(payload).catch((err) => console.error('[MAIL:ERROR]', err.message));

const sendOtpEmail = (user, code) =>
  safeSend({
    to: user.correo,
    subject: 'Tu código de verificación SIRECOM',
    text: `Hola ${user.nombre}, tu código de verificación es ${code}. Vence en ${config.otp.ttlMinutes} minutos.`,
    html: layout(
      'Código de verificación',
      `<p>Hola <b>${user.nombre}</b>, usa este código para continuar:</p>
       <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#1B2A4A;margin:16px 0">${code}</p>
       <p>Vence en ${config.otp.ttlMinutes} minutos. Si no fuiste tú, ignora este mensaje.</p>`
    ),
  });

const MESSAGES = {
  confirmacion: { subject: 'Reserva confirmada', lead: 'Tu reserva fue confirmada.' },
  cancelacion: { subject: 'Reserva cancelada', lead: 'Tu reserva fue cancelada y el cupo fue liberado.' },
  recordatorio: { subject: 'Recordatorio de tu reserva', lead: 'Tu turno comienza pronto.' },
};

const notifyReservation = (kind, user, reserva) => {
  const msg = MESSAGES[kind];
  const t = TURNO_INFO[reserva.turno];
  const detalle = `${t.nombre} - ${reserva.fecha} - ${t.horario}`;
  return safeSend({
    to: user.correo,
    subject: `SIRECOM: ${msg.subject}`,
    text: `Hola ${user.nombre}. ${msg.lead} Detalle: ${detalle}.`,
    html: layout(msg.subject, `<p>Hola <b>${user.nombre}</b>. ${msg.lead}</p>
      <p style="background:#F5F6F8;padding:12px;border-radius:8px"><b>${t.nombre}</b><br/>${reserva.fecha}<br/>${t.horario}</p>`),
  });
};

module.exports = { send, safeSend, sendOtpEmail, notifyReservation };
