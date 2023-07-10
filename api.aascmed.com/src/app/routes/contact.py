from html import escape
import os

import sendgrid
from fastapi import APIRouter, HTTPException, Depends

from ..schemas import contact as contact_schemas
from ..utils.form_verification import check_valid_email, check_required_field_present
from ..dependencies.email import mailer

router = APIRouter()


@router.post("/contact/", tags=["contact"])
async def contact_form(data: contact_schemas.ContactFormSubmission,
                       mailer: sendgrid.SendGridAPIClient = Depends(mailer)):
    has_error = False
    field_errors = contact_schemas.ContactFormFieldErrors()

    subject_present = check_required_field_present(data.subject)
    name_present = check_required_field_present(data.full_name)
    email_present = check_required_field_present(data.email_address)
    phone_present = check_required_field_present(data.phone_number)
    clinic_present = check_required_field_present(data.clinic)
    disclaimer_checked = data.disclaimer

    if not subject_present:
        has_error = True
        field_errors["subject"] = [f"You must enter a subject."]

    if not name_present:
        has_error = True
        field_errors["full_name"] = [f"You must enter your full name."]

    if not email_present:
        has_error = True
        field_errors["email_address"] = [f"You must enter your email address."]

    if not phone_present:
        has_error = True
        field_errors["phone_number"] = [f"You must enter your phone number."]

    if not clinic_present:
        has_error = True
        field_errors["clinic"] = [f"You must choose a clinic."]

    if not disclaimer_checked:
        has_error = True
        field_errors["disclaimer"] = [f"Please confirm that your message does not include any PHI."]

    email_valid_error, email_addr = check_valid_email(data.email_address)

    if not has_error:
        if email_valid_error is not None:
            field_errors["email"] = [f"Please enter a valid email address. {email_valid_error}"]
            has_error = True

    if has_error:
        raise HTTPException(status_code=400, detail=contact_schemas.ContactFormErrorResponse(field_errors=field_errors))

    cleaned_subject = escape(data.subject)

    email_to = map(lambda addr: sendgrid.Cc(email=addr.strip()), os.getenv("CONTACT_FORM_RECIPIENTS", "").split(","))
    email_cc = map(lambda addr: sendgrid.Cc(email=addr.strip()), os.getenv("CONTACT_FORM_CC", "").split(","))
    email_from = sendgrid.From(os.getenv("CONTACT_FORM_SENDER", "no-reply@aascmed.com"))
    email_subject = sendgrid.Subject(f"Contact form submission: {cleaned_subject}")
    email_content = sendgrid.Content(format_email(
        message=data.message,
        email_addr=email_addr,
        name=data.full_name,
        phone=data.phone_number,
        clinic=data.clinic,
        subject=data.subject,
        new_patient=data.new_patient,
    ))

    try:
        email = sendgrid.Mail()
        email.to = email_to
        email.cc = email_cc
        email.from_email = email_from
        email.reply_to = sendgrid.ReplyTo(email_addr)
        email.subject = email_subject
        email.content = email_content

        response = mailer.send(email)

        if response.status_code != 200:
            raise HTTPException(status_code=500,
                                detail=contact_schemas.ContactFormErrorResponse(error="An unexpected error occurred."))

        # Send New Patient Forms
        new_patient_email_to = sendgrid.To(email_addr)
        new_patient_reply_to = sendgrid.ReplyTo(os.getenv("CONTACT_FORM_REPLY_TO", "info@aascmed.com"))
        new_patient_content = sendgrid.Content(format_patient_forms_email(data.full_name))
        new_patient_email_from = email_from
        new_patient_email_subject = "Patient Registration Forms for Allergy, Asthma and Sinus Centers"

        new_patient_email = sendgrid.Mail()
        new_patient_email.to = new_patient_email_to
        new_patient_email.from_email = new_patient_email_from
        new_patient_email.reply_to = new_patient_reply_to
        new_patient_email.content = new_patient_content
        new_patient_email.subject = new_patient_email_subject

        new_patient_response = mailer.send(email)

        if new_patient_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=contact_schemas.ContactFormErrorResponse(
                    error="An unexpected error occurred when sending patient registration forms."
                )
            )

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=contact_schemas.ContactFormErrorResponse(error="An unexpected error occurred."))

    return


def format_email(message: str, name: str, email_addr: str, subject: str, phone: str, clinic: str,
                 new_patient: bool) -> str:
    message = escape(message)
    name = escape(name)
    email_addr = escape(email_addr)
    subject = escape(subject)
    phone = escape(phone)
    clinic = escape(clinic)
    patient_status = "New Patient" if new_patient else "Existing Patient"

    html = f"""
    
    <h1>Contact form submission received</h1>
    
    <p><strong>Name: </strong> {name}</p>
    <p><strong>Email: </strong> {email_addr}</p>
    <p><strong>Subject: </strong> {subject}</p>
    <p><strong>Phone: </strong> {phone}</p>
    <p><strong>Clinic: </strong> {clinic}</p>
    <p><strong>Patient Status: </strong> {patient_status}</p>
    <p><strong>Message: </strong></p>
    <p>{message}</p>
    
    """

    return html


def format_patient_forms_email(name) -> str:
    name = escape(name)
    return f"""
    <h1>New Patient Forms for Allergy, Asthma and Sinus Centers</h1>
    <p>Hello, {name},</p>
    <p>Here are some forms for you to fill in</p>
    # forms here blah blah
    """
