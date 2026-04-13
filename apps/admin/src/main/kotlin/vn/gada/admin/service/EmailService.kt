package vn.gada.admin.service

import org.slf4j.LoggerFactory
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service
import vn.gada.admin.config.AppProperties

@Service
class EmailService(
    private val mailSender: JavaMailSender,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(EmailService::class.java)

    /**
     * Sends an admin invite email. Returns true if sent, false if skipped/failed.
     * Non-blocking — never throws.
     */
    fun sendInvite(toEmail: String, toName: String?, inviteUrl: String, invitedByEmail: String): Boolean {
        if (!props.mailEnabled) {
            log.info("Mail disabled — skipping invite email to $toEmail")
            return false
        }
        return try {
            val msg = mailSender.createMimeMessage()
            val helper = MimeMessageHelper(msg, true, "UTF-8")
            helper.setFrom(props.mailFrom)
            helper.setTo(toEmail)
            helper.setSubject("[GADA VN] 어드민 계정 초대")
            helper.setText(buildInviteHtml(toName ?: toEmail, inviteUrl, invitedByEmail), true)
            mailSender.send(msg)
            log.info("Invite email sent to $toEmail")
            true
        } catch (e: Exception) {
            log.warn("Failed to send invite email to $toEmail: ${e.message}")
            false
        }
    }

    private fun buildInviteHtml(name: String, inviteUrl: String, invitedBy: String): String = """
        <!DOCTYPE html>
        <html lang="ko">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#F8F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:40px 0;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr><td style="background:#0669F7;padding:28px 40px;text-align:center;">
                  <span style="font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">GADA VN</span>
                  <span style="display:block;font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Admin Panel</span>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:36px 40px;">
                  <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#25282A;">안녕하세요, ${escapeHtml(name)}님</p>
                  <p style="margin:0 0 24px;font-size:14px;color:#5A6474;line-height:1.6;">
                    <strong>${escapeHtml(invitedBy)}</strong>님이 GADA VN 어드민 패널에 초대했습니다.<br>
                    아래 버튼을 클릭하여 계정을 활성화하고 비밀번호를 설정하세요.
                  </p>
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                    <tr><td align="center">
                      <a href="$inviteUrl"
                         style="display:inline-block;padding:14px 36px;background:#0669F7;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                        계정 활성화하기
                      </a>
                    </td></tr>
                  </table>
                  <!-- Fallback URL -->
                  <div style="background:#F2F4F5;border-radius:10px;padding:14px 16px;word-break:break-all;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#98A2B2;text-transform:uppercase;">초대 링크 (7일 유효)</p>
                    <p style="margin:0;font-size:12px;color:#4B5563;">$inviteUrl</p>
                  </div>
                  <p style="margin:24px 0 0;font-size:12px;color:#98A2B2;line-height:1.6;">
                    이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.<br>
                    링크는 발급 후 7일간 유효합니다.
                  </p>
                </td></tr>
                <!-- Footer -->
                <tr><td style="background:#F8F9FB;padding:20px 40px;text-align:center;border-top:1px solid #EFF1F5;">
                  <p style="margin:0;font-size:11px;color:#98A2B2;">© 2025 GADA VN · 베트남 건설 근로자 매칭 플랫폼</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
    """.trimIndent()

    private fun escapeHtml(s: String) = s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
}
