import nodemailer from 'nodemailer';

interface AlertEmailParams {
  to: string;
  siteName: string;
  siteUrl: string;
  violationCount: number;
  threshold: number;
  scanId: string;
}

export async function sendAlertEmail(params: AlertEmailParams): Promise<void> {
  const { to, siteName, siteUrl, violationCount, threshold, scanId } = params;

  if (!process.env.SMTP_HOST) {
    console.log(
      `[email] SMTP not configured — skipping alert to ${to} for site "${siteName}" (${violationCount} violations, threshold ${threshold})`
    );
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  });

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const scanUrl = `${appUrl}/scans/${scanId}`;

  await transport.sendMail({
    from: process.env.SMTP_USER ?? 'a11y-scope@noreply.local',
    to,
    subject: `[a11y-scope] Alert: ${violationCount} violations found on "${siteName}"`,
    html: `
      <h2>Accessibility Alert</h2>
      <p>A scan of <strong>${siteName}</strong> (<a href="${siteUrl}">${siteUrl}</a>) detected
      <strong>${violationCount} violations</strong>, which exceeds your configured threshold of ${threshold}.</p>
      <p><a href="${scanUrl}">View the full scan report</a></p>
      <hr>
      <p style="color:#888;font-size:12px;">Sent by a11y-scope. To stop receiving these alerts, update the alert settings for this site.</p>
    `,
    text: `Accessibility Alert\n\nA scan of "${siteName}" (${siteUrl}) detected ${violationCount} violations, exceeding your threshold of ${threshold}.\n\nView the full scan report: ${scanUrl}`,
  });

  console.log(`[email] Alert sent to ${to} for site "${siteName}" (${violationCount} violations)`);
}
