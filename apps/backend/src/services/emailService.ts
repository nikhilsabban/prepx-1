import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Creates and returns configured Nodemailer transporter
 */
function getTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

/**
 * Commercial-grade responsive HTML email wrapper with sleek dark/light hybrid styling,
 * gradient accents, brand badge, and security disclaimers (Stripe/Linear/Vercel standard).
 */
function buildCommercialEmailTemplate(params: {
  preheader: string;
  badgeText: string;
  title: string;
  description: string;
  contentHtml: string;
  calloutNote?: string;
  expiryMinutes?: number;
}): string {
  const { preheader, badgeText, title, description, contentHtml, calloutNote, expiryMinutes } = params;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .card-body { padding: 24px 20px !important; }
      .code-display { font-size: 28px !important; letter-spacing: 6px !important; padding: 14px 16px !important; }
      .action-btn { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #f4f4f5;">
  <!-- Preview Text Spacing -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #09090b;">
    ${preheader} &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 8px 16px; border-radius: 9999px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); border: 1px solid rgba(168, 85, 247, 0.3);">
                      <span style="font-size: 18px; font-weight: 900; letter-spacing: -0.5px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); -webkit-background-clip: text; color: #c084fc;">
                        ⚡ prepX
                      </span>
                      <span style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-left: 6px;">
                        Placement & Coding
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121217; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
                
                <!-- Glowing Top Accent Line -->
                <tr>
                  <td height="3" style="background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);"></td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td class="card-body" style="padding: 36px 32px 32px 32px;">
                    
                    <!-- Pill Badge -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="padding: 4px 10px; border-radius: 6px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.8px;">
                          ${badgeText}
                        </td>
                      </tr>
                    </table>

                    <!-- Headline -->
                    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px; line-height: 1.3;">
                      ${title}
                    </h1>

                    <!-- Description -->
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                      ${description}
                    </p>

                    <!-- Custom Content (OTP or Button) -->
                    ${contentHtml}

                    ${expiryMinutes ? `
                    <!-- Expiry Notice -->
                    <div style="margin-top: 20px; padding: 10px 14px; background-color: rgba(39, 39, 42, 0.5); border: 1px solid #27272a; border-radius: 10px; font-size: 12px; color: #71717a; text-align: center;">
                      ⏱️ This authentication token will expire in <strong style="color: #e4e4e7;">${expiryMinutes} minutes</strong>.
                    </div>
                    ` : ""}

                    ${calloutNote ? `
                    <!-- Security Notice -->
                    <div style="margin-top: 24px; padding: 12px 16px; background-color: rgba(24, 24, 27, 0.8); border-left: 3px solid #6366f1; border-radius: 4px 8px 8px 4px; font-size: 12px; line-height: 1.5; color: #71717a;">
                      ${calloutNote}
                    </div>
                    ` : ""}

                  </td>
                </tr>

                <!-- Security Verification Footer Bar -->
                <tr>
                  <td style="background-color: #0e0e13; border-top: 1px solid #1f1f23; padding: 14px 32px; font-size: 11px; color: #52525b;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left">
                          🔒 256-bit Secure Authentication
                        </td>
                        <td align="right">
                          Official PrepX Notification
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer Legal & Links -->
          <tr>
            <td align="center" style="padding: 24px 16px 0 16px; font-size: 11px; line-height: 1.6; color: #52525b;">
              <p style="margin: 0 0 8px 0;">
                If you did not initiate this request, no action is needed — your account remains completely secure.
              </p>
              <p style="margin: 0;">
                &copy; ${currentYear} PrepX AI Placement & Coding Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends a commercial OTP email (e.g. for login or password change)
 */
export async function sendOtpEmail(toEmail: string, otp: string, purpose: "login" | "password_change" = "login"): Promise<boolean> {
  const isLogin = purpose === "login";
  const title = isLogin ? "Your One-Time Login Code" : "Password Change Verification";
  const badgeText = isLogin ? "Account Security" : "Password Verification";
  const description = isLogin
    ? "Enter the 6-digit verification code below on PrepX to complete your secure passwordless sign-in."
    : "You requested to change your PrepX account password. Enter the 6-digit security code below to authorize this update.";

  const contentHtml = `
    <!-- OTP Code Display Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0;">
      <tr>
        <td align="center" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%); border: 1.5px dashed rgba(168, 85, 247, 0.4); border-radius: 14px; padding: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
            One-Time Security Passcode
          </div>
          <div class="code-display" style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #ffffff; text-shadow: 0 0 20px rgba(168, 85, 247, 0.4);">
            ${otp}
          </div>
          <div style="font-size: 11px; color: #71717a; margin-top: 8px;">
            Copy and paste this code into your PrepX verification screen.
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = buildCommercialEmailTemplate({
    preheader: `Your PrepX verification code is: ${otp}. Valid for 10 minutes.`,
    badgeText,
    title,
    description,
    contentHtml,
    expiryMinutes: 10,
    calloutNote: "Never share this code with anyone. PrepX staff will never ask for your verification code.",
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`\n📧 [DEV SIMULATED EMAIL - NO SMTP]: OTP for ${toEmail} is: ${otp}\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"PrepX Security" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: isLogin ? `${otp} is your prepX login code` : `${otp} is your prepX verification code`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email via SMTP:", err);
    return false;
  }
}

/**
 * Sends a commercial welcome & email verification link
 */
export async function sendVerificationEmail(toEmail: string, fullName: string, verifyUrl: string): Promise<boolean> {
  const contentHtml = `
    <!-- Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 8px 0;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" class="action-btn" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.5);">
            Verify My Email Address &rarr;
          </a>
        </td>
      </tr>
    </table>

    <div style="margin-top: 18px; font-size: 11px; color: #71717a; word-break: break-all; text-align: center;">
      Or copy and paste this verification URL into your browser:<br>
      <a href="${verifyUrl}" style="color: #818cf8; text-decoration: underline;">${verifyUrl}</a>
    </div>
  `;

  const html = buildCommercialEmailTemplate({
    preheader: `Welcome to PrepX, ${fullName}! Please verify your email address to activate your account.`,
    badgeText: "Welcome to PrepX",
    title: `Verify your account, ${fullName}`,
    description: "Thank you for joining PrepX — India's premier AI placement preparation and coding accelerator. Click the button below to confirm your email and access mock interviews, coding labs, and group discussions.",
    contentHtml,
    expiryMinutes: 1440, // 24 hours
    calloutNote: "If you did not register for a PrepX account, please safely ignore this email.",
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`\n📧 [DEV SIMULATED EMAIL - NO SMTP]: Verify URL for ${toEmail} is: ${verifyUrl}\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"PrepX Welcome" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: "Verify your email address — PrepX Placement Platform",
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send verification email via SMTP:", err);
    return false;
  }
}

/**
 * Sends a commercial password reset link
 */
export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<boolean> {
  const contentHtml = `
    <!-- Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 8px 0;">
      <tr>
        <td align="center">
          <a href="${resetUrl}" class="action-btn" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.5);">
            Reset My Password &rarr;
          </a>
        </td>
      </tr>
    </table>

    <div style="margin-top: 18px; font-size: 11px; color: #71717a; word-break: break-all; text-align: center;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #818cf8; text-decoration: underline;">${resetUrl}</a>
    </div>
  `;

  const html = buildCommercialEmailTemplate({
    preheader: "Reset your PrepX password. This secure link is valid for 15 minutes.",
    badgeText: "Password Recovery",
    title: "Reset Your Password",
    description: "We received a request to reset your PrepX account password. Click the button below to choose a strong, new password.",
    contentHtml,
    expiryMinutes: 15,
    calloutNote: "If you did not request a password reset, please ignore this email or review your account security.",
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`\n📧 [DEV SIMULATED EMAIL - NO SMTP]: Reset URL for ${toEmail} is: ${resetUrl}\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"PrepX Security" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: "Password Reset Request — PrepX",
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send password reset email via SMTP:", err);
    return false;
  }
}
