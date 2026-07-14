import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email(to_email, subject, html_body, text_body=None):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    from_email = os.getenv("SMTP_FROM", "noreply@foundesk.app")

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[EMAIL] SMTP not configured. Would send to {to_email}:")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Body: {html_body[:200]}...")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


def send_invite_email(invited_email, inviter_name, workspace_name, role, invite_link=None):
    subject = f"{inviter_name} invited you to {workspace_name} on FounDesk"
    link = invite_link or "https://foundesk.app"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a18;border-radius:12px;border:1px solid rgba(255,255,255,0.06);color:#f5f5f0">
      <div style="font-size:24px;font-weight:800;margin-bottom:4px;color:#ff751f">FounDesk</div>
      <div style="font-size:13px;color:rgba(245,245,240,0.6);margin-bottom:20px">Workspace Invitation</div>
      <div style="font-size:14px;line-height:1.6">
        <strong style="color:#f5f5f0">{inviter_name}</strong>
        <span style="color:rgba(245,245,240,0.6)"> invited you to join </span>
        <strong style="color:#f5f5f0">{workspace_name}</strong>
        <span style="color:rgba(245,245,240,0.6)"> as </span>
        <strong style="color:#3acaa5">{role}</strong>
        <span style="color:rgba(245,245,240,0.6)">.</span>
      </div>
      <a href="{link}" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#ff751f;color:#161614;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none">
        Accept Invitation
      </a>
      <div style="margin-top:16px;font-size:11px;color:rgba(245,245,240,0.3)">
        If you don't have a FounDesk account yet, create one with this email to accept.
      </div>
    </div>
    """
    text = f"{inviter_name} invited you to {workspace_name} on FounDesk as {role}. Visit {link} to accept."
    return send_email(invited_email, subject, html, text)


def send_welcome_email(to_email, name):
    subject = "Welcome to FounDesk"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a18;border-radius:12px;border:1px solid rgba(255,255,255,0.06);color:#f5f5f0">
      <div style="font-size:24px;font-weight:800;margin-bottom:4px;color:#ff751f">FounDesk</div>
      <div style="font-size:13px;color:rgba(245,245,240,0.6);margin-bottom:20px">Welcome, {name}!</div>
      <div style="font-size:14px;line-height:1.6;color:rgba(245,245,240,0.8)">
        Your workspace is ready. Connect your tools (Gmail, Trello, Linear, Slack) and FounDesk will start extracting tasks, decisions, and blockers automatically.
      </div>
      <a href="https://foundesk.app/settings" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#ff751f;color:#161614;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none">
        Get Started
      </a>
    </div>
    """
    text = f"Welcome to FounDesk, {name}! Connect your tools to get started."
    return send_email(to_email, subject, html, text)
