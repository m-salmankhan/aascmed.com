import os

import sendgrid


def mailer() -> sendgrid.SendGridAPIClient:
    return sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
