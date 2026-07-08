import os
import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson import ObjectId
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)

# Load configurations
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Smart HR Recruiter")

async def send_interview_email(
    candidate_id: str,
    candidate_name: str,
    recipient_email: str,
    job_title: str,
    company_name: str,
    date: str,
    time: str,
    mode: str,
    meeting_link: str = None,
    notes: str = None
) -> bool:
    """
    Constructs and sends an interview invitation email.
    Logs success or failure to the 'Emails' collection.
    Does not raise exceptions; returns True if sent, False otherwise.
    """
    db = get_database()
    now = datetime.utcnow()
    
    subject = f"Interview Invitation: {job_title} at {company_name}"
    
    # HTML Content
    meeting_info = f"<p><strong>Meeting Link:</strong> <a href='{meeting_link}'>{meeting_link}</a></p>" if mode == "Online" and meeting_link else ""
    notes_info = f"<p><strong>Preparation Notes:</strong> {notes}</p>" if notes else ""
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4F46E5;">Interview Invitation</h2>
        <p>Dear {candidate_name},</p>
        <p>Thank you for applying for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>. We were highly impressed by your credentials and would love to invite you for an interview.</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Details of your interview:</strong></p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> {time}</p>
            <p style="margin: 5px 0;"><strong>Mode:</strong> {mode}</p>
            {meeting_info}
        </div>
        {notes_info}
        <p>Please reply to this email if you have any questions or need to reschedule.</p>
        <p>Best regards,<br><strong>The HR Team</strong><br>{company_name}</p>
    </body>
    </html>
    """
    
    email_log = {
        "candidate_id": ObjectId(candidate_id) if candidate_id else None,
        "recipient_email": recipient_email,
        "subject": subject,
        "body": html_body,
        "status": "Failed",
        "sent_at": now
    }
    
    # If SMTP details aren't configured, log a warning and mark as Mocked
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP credentials are not configured. Logging mock email transmission.")
        email_log["status"] = "Sent (Mocked)"
        email_log["error_message"] = "SMTP credentials missing; mock email logged."
        await db.Emails.insert_one(email_log)
        return True

    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{EMAIL_FROM_NAME} <{SMTP_USER}>"
        msg["To"] = recipient_email
        
        msg.attach(MIMEText(html_body, "html"))
        
        # Connect and send
        # We run this synchronously in a try-except. Since it's a network request, we set timeout
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, recipient_email, msg.as_string())
        server.quit()
        
        email_log["status"] = "Sent"
        await db.Emails.insert_one(email_log)
        logger.info(f"Successfully sent interview email to {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send interview email: {str(e)}")
        email_log["status"] = "Failed"
        email_log["error_message"] = str(e)
        await db.Emails.insert_one(email_log)
        return False
