"""
Mock Email Service for AMLGuard.
Currently logs emails to console. Replace with SendGrid in production.
"""
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Mock email service - logs emails instead of sending"""

    async def send_email(self, to: str, subject: str, html_content: str):
        logger.info(f"[EMAIL] To: {to} | Subject: {subject}")
        logger.info(f"[EMAIL] Content preview: {html_content[:200]}...")
        return {"status": "mocked", "to": to, "subject": subject}


email_service = EmailService()
