import os
from typing import List, Tuple, Callable, Optional

import sendgrid


def send_email():
    def send(
            recipient_list: List[str],
            cc_list: Optional[List[str]],
            subject: str,
            template: str,
            reply_to: Tuple[str, str],
            substitutions: List[Tuple[str, str]],
            attachments: Optional[sendgrid.Attachment] = None,
            sender: Tuple[str, str] = (os.getenv("API_SERVER_FROM_EMAIL"), "Allergy, Asthma and Sinus Centers")
    ):
        email = sendgrid.Mail(recipient_list)
        email.to = [sendgrid.To(email=email) for email in recipient_list]
        email.cc = [sendgrid.Cc(email=email) for email in cc_list]
        email.from_email = sendgrid.From(email=sender[0], name=sender[1])
        email.reply_to = sendgrid.ReplyTo(email=reply_to[0], name=reply_to[1])
        email.subject = sendgrid.Subject(subject)
        email.content = sendgrid.Content(content=template, mime_type="text/html")
        email.substitution = [sendgrid.Substitution(template, value) for (template, value) in substitutions]

        if attachments is not None:
            email.attachment = attachments

        client = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
        resp = client.send(email)
        return resp.status_code

    return send


email_dep_type = Callable[
    [
        List[str],
        Optional[List[str]],
        str,
        str,
        Tuple[str, str],
        List[Tuple[str, str]],
        Optional[List[sendgrid.Attachment]],
        Optional[Tuple[str, str]]
    ],
    int
]
