const APP_NAME = process.env.APP_NAME || 'Pocket Trainer';
const APP_URL  = process.env.APP_URL  || 'http://localhost:5173';
const RESEND_API_KEY = process.env.SMTP_PASS; // Resend API key (same as SMTP pass)

function wrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9}
  .wrap{max-width:520px;margin:0 auto;padding:40px 16px}
  .card{background:#1e1e2a;border:1px solid #2a2a3a;border-radius:16px;padding:40px 36px}
  .logo{font-size:22px;font-weight:700;color:#3b82f6;margin-bottom:32px;letter-spacing:-0.5px}
  h1{margin:0 0 16px;font-size:24px;font-weight:700;color:#f1f5f9;line-height:1.3}
  p{margin:0 0 20px;font-size:15px;line-height:1.6;color:#94a3b8}
  .btn{display:inline-block;padding:14px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;margin:8px 0 24px}
  .warning{background:#1a1a2e;border:1px solid #2a2a3a;border-radius:8px;padding:14px 16px;font-size:13px;color:#64748b;margin-top:8px}
  .footer{margin-top:32px;font-size:12px;color:#334155;text-align:center;line-height:1.6}
  .footer a{color:#3b82f6;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">${APP_NAME}</div>
    ${bodyHtml}
  </div>
  <div class="footer">
    ${APP_NAME} &middot; <a href="${APP_URL}">${APP_URL.replace(/https?:\/\//, '')}</a><br/>
    You received this email because you have an account with ${APP_NAME}.<br/>
    If this wasn't you, you can safely ignore this email.
  </div>
</div>
</body>
</html>`;
}

async function send({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ─── Template builders ────────────────────────────────────────────────────────

function verifyEmailHtml(name, verifyUrl) {
  return wrap('Verify your email', `
    <h1>Welcome, ${name || 'athlete'}.</h1>
    <p>You're almost in. Confirm your email address to activate your account and start training.</p>
    <a class="btn" href="${verifyUrl}">Verify Email Address</a>
    <p>This link expires in 24 hours.</p>
    <div class="warning">If you didn't create an account, ignore this email — nothing will happen.</div>
  `);
}

function emailVerifiedHtml(name) {
  return wrap("You're verified", `
    <h1>You're verified.</h1>
    <p>Hey ${name || 'there'} — your email is confirmed. Time to train.</p>
    <a class="btn" href="${APP_URL}/login">Open ${APP_NAME}</a>
  `);
}

function passwordResetHtml(name, resetUrl) {
  return wrap('Reset your password', `
    <h1>Reset your password.</h1>
    <p>Hi ${name || 'there'} — we received a request to reset the password for your account.</p>
    <a class="btn" href="${resetUrl}">Reset Password</a>
    <p>This link expires in 1 hour and can only be used once.</p>
    <div class="warning">⚠ If you didn't request this, someone may have entered your email by mistake. Your password has <strong>not</strong> been changed. You can <a href="${APP_URL}/login" style="color:#3b82f6">log in here</a>.</div>
  `);
}

function passwordChangedHtml(name) {
  return wrap('Your password was changed', `
    <h1>Password changed.</h1>
    <p>Hi ${name || 'there'} — your ${APP_NAME} password was successfully updated.</p>
    <p>You've been logged out of all other devices for security.</p>
    <div class="warning">Not you? <a href="${APP_URL}/forgot-password" style="color:#3b82f6">Reset your password immediately</a> to secure your account.</div>
  `);
}

function emailChangeHtml(name, newEmail, verifyUrl) {
  return wrap('Confirm your new email', `
    <h1>Confirm your new email.</h1>
    <p>Hi ${name || 'there'} — you requested to change your ${APP_NAME} email to <strong style="color:#f1f5f9">${newEmail}</strong>.</p>
    <a class="btn" href="${verifyUrl}">Confirm New Email</a>
    <p>This link expires in 24 hours. Your email will not change until you click confirm.</p>
    <div class="warning">If you didn't request this change, your account may be at risk. <a href="${APP_URL}/login" style="color:#3b82f6">Log in and review your account</a>.</div>
  `);
}

function accountLockedHtml(name, unlockTime) {
  return wrap('Account temporarily locked', `
    <h1>Account temporarily locked.</h1>
    <p>Hi ${name || 'there'} — your ${APP_NAME} account has been locked after too many failed login attempts.</p>
    <p>Your account will automatically unlock at <strong style="color:#f1f5f9">${unlockTime}</strong>.</p>
    <p>If you'd like to regain access sooner, you can reset your password:</p>
    <a class="btn" href="${APP_URL}/forgot-password">Reset Password</a>
    <div class="warning">If this wasn't you, someone may be attempting to access your account. Consider resetting your password immediately.</div>
  `);
}

function accountDeletedHtml(name) {
  return wrap('Your account has been deleted', `
    <h1>Account deleted.</h1>
    <p>Hi ${name || 'there'} — your ${APP_NAME} account and all associated data has been permanently deleted as requested.</p>
    <p>We're sorry to see you go. Your workout history, profile, and all personal data have been removed from our systems.</p>
    <p>If you change your mind, you're always welcome to create a new account.</p>
  `);
}

// ─── Exported send functions ──────────────────────────────────────────────────

module.exports = {
  sendVerificationEmail: async (user, token) => {
    const url = `${APP_URL}/verify-email?token=${token}`;
    await send({
      to: user.email,
      subject: `Verify your ${APP_NAME} email`,
      html: verifyEmailHtml(user.full_name, url),
    });
  },

  sendEmailVerifiedConfirmation: async (user) => {
    await send({
      to: user.email,
      subject: `You're verified — welcome to ${APP_NAME}`,
      html: emailVerifiedHtml(user.full_name),
    });
  },

  sendPasswordResetEmail: async (user, token) => {
    const url = `${APP_URL}/reset-password?token=${token}`;
    await send({
      to: user.email,
      subject: `Reset your ${APP_NAME} password`,
      html: passwordResetHtml(user.full_name, url),
    });
  },

  sendPasswordChangedEmail: async (user) => {
    await send({
      to: user.email,
      subject: `Your ${APP_NAME} password was changed`,
      html: passwordChangedHtml(user.full_name),
    });
  },

  sendEmailChangeVerification: async (user, newEmail, token) => {
    const url = `${APP_URL}/verify-email-change?token=${token}`;
    await send({
      to: newEmail,
      subject: `Confirm your new ${APP_NAME} email`,
      html: emailChangeHtml(user.full_name, newEmail, url),
    });
  },

  sendAccountLockedEmail: async (user, lockedUntil) => {
    const unlockTime = new Date(lockedUntil).toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
    await send({
      to: user.email,
      subject: `Your ${APP_NAME} account has been temporarily locked`,
      html: accountLockedHtml(user.full_name, unlockTime),
    });
  },

  sendAccountDeletedEmail: async (user) => {
    await send({
      to: user.email,
      subject: `Your ${APP_NAME} account has been deleted`,
      html: accountDeletedHtml(user.full_name),
    });
  },
};
