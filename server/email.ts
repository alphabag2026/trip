import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Alpha Trip <noreply@alphatrip.io>";
const APP_NAME = "Alpha Trip";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const resendClient = getResend();
  if (!resendClient) {
    console.warn("[Email] RESEND_API_KEY not set, skipping email send to:", to);
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const result = await resendClient.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log("[Email] Sent to:", to, "subject:", subject);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("[Email] Failed to send:", error?.message || error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// ── Email Templates ──

export function buildVerificationEmail(params: {
  userName: string;
  verifyUrl: string;
  expiresIn: string;
}) {
  const { userName, verifyUrl, expiresIn } = params;
  return {
    subject: `[${APP_NAME}] 이메일 인증을 완료해주세요`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">${APP_NAME}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">이메일 인증</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
        안녕하세요, <strong>${userName}</strong>님!
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
        아래 버튼을 클릭하여 이메일 인증을 완료해주세요.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
          이메일 인증하기
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
        이 링크는 ${expiresIn} 후 만료됩니다.<br/>
        본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣어주세요:<br/>
        <a href="${verifyUrl}" style="color:#2563eb;word-break:break-all;">${verifyUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}

export function buildPasswordResetEmail(params: {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}) {
  const { userName, resetUrl, expiresIn } = params;
  return {
    subject: `[${APP_NAME}] 비밀번호 재설정`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">${APP_NAME}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">비밀번호 재설정</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
        안녕하세요, <strong>${userName}</strong>님!
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
        비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ea580c);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(220,38,38,0.3);">
          비밀번호 재설정
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
        이 링크는 ${expiresIn} 후 만료됩니다.<br/>
        본인이 요청하지 않은 경우 이 이메일을 무시해주세요. 비밀번호는 변경되지 않습니다.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
        버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣어주세요:<br/>
        <a href="${resetUrl}" style="color:#dc2626;word-break:break-all;">${resetUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}

export function buildWelcomeEmail(params: {
  userName: string;
  loginUrl: string;
}) {
  const { userName, loginUrl } = params;
  return {
    subject: `[${APP_NAME}] 가입을 환영합니다!`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">🎉 ${APP_NAME}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">가입을 환영합니다!</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
        안녕하세요, <strong>${userName}</strong>님!
      </p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Alpha Trip에 가입해주셔서 감사합니다. 밋업 신청, 여행 일정 관리, 항공/호텔 예약까지 모든 것을 한 곳에서 관리하세요.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
          시작하기
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  };
}
