import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`;

  await transporter.sendMail({
    from: `"Clínica Luz" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verifica tu correo electrónico — Clínica Luz",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1A3A6B;margin-bottom:8px;">Verifica tu correo</h2>
        <p style="color:#6B7280;margin-bottom:24px;">
          Haz clic en el botón para activar tu cuenta en Clínica Luz.
          El enlace expira en <strong>24 horas</strong>.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#2563EB;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
          Verificar correo
        </a>
        <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
          Si no creaste esta cuenta, ignora este mensaje.
        </p>
      </div>
    `,
  });
};
