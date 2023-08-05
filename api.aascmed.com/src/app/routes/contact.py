from html import escape
import os
import requests
import base64

import sendgrid
from fastapi import APIRouter, HTTPException, Depends, encoders

from ..schemas import contact as contact_schemas
from ..utils.form_verification import check_valid_email, check_required_field_present
from ..dependencies.email import send_email, email_dep_type
from ..email_templates import contact_form_notification_template, new_patient_forms_template

router = APIRouter()


@router.post("/contact/", tags=["contact"], responses={
    400: {
        "model": contact_schemas.HTTP400Response,
        "description": "Details of what went wrong."
    }
})
async def contact_form(
        data: contact_schemas.ContactFormSubmission,
        mailer: email_dep_type = Depends(send_email)
):
    has_error = False
    field_errors = {}

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
            field_errors["email_address"] = [f"Please enter a valid email address. {email_valid_error}"]
            has_error = True

    if has_error:
        pydantic_field_errors = contact_schemas.ContactFormFieldErrors(**field_errors)
        raise HTTPException(status_code=400, detail=encoders.jsonable_encoder(encoders.jsonable_encoder(
            contact_schemas.ContactFormErrorResponse(field_errors=pydantic_field_errors)
        )))

    cleaned_subject = escape(data.subject)

    email_addressees = list(filter(lambda email: len(email) > 0, os.getenv("CONTACT_FORM_RECIPIENTS", "").split(",")))
    email_cc = list(filter(lambda email: len(email) > 0, os.getenv("CONTACT_FORM_CC", "").split(",")))
    email_subject = f"Contact form submission: {cleaned_subject}"
    email_substitutions = [
        ("%submission.subject%", cleaned_subject),
        ("%submission.full_name%", escape(data.full_name)),
        ("%submission.email%", escape(email_addr)),
        ("%submission.phone%", escape(data.phone_number)),
        ("%submission.message%", escape(data.message)),
        ("%submission.patient_status%", "New Patient" if data.newPatient else "Existing Patient"),
        ("%submission.clinic%", escape(data.clinic)),
    ]
    email_reply_to = (email_addr, escape(data.full_name))

    try:
        response_status_code = mailer(
            email_addressees,
            email_cc,
            email_subject,
            contact_form_notification_template,
            email_reply_to,
            email_substitutions,
        )

        if response_status_code != 202:
            print("status code")
            print(response_status_code)
            raise HTTPException(status_code=500,
                                detail=encoders.jsonable_encoder(
                                    contact_schemas.ContactFormErrorResponse(
                                        error="An unexpected error occurred when sending the email.")
                                ))

        if not data.newPatient:
            return

        # Send New Patient Forms
        new_patient_email_to = [email_addr]
        new_patient_reply_to = (os.getenv("PATIENT_REPLY_TO", "info@aascmed.com"), "Allergy Asthma and Sinus Centers")
        new_patient_email_subject = "Patient Registration Forms for Allergy, Asthma and Sinus Centers"
        new_patient_email_substitutions = [("%submission.full_name%", escape(data.full_name))]
        new_patient_email_attachments = [
            convert_to_attachment("https://www.aascmed.com/documents/patient_information.pdf",
                                  "patient_information.pdf"),
            convert_to_attachment("https://www.aascmed.com/documents/financial_policy.pdf",
                                  "financial_policy.pdf"),
            convert_to_attachment("https://www.aascmed.com/documents/consent_for_release_use_of_confidential_information_and_receipt_of_notice_of_privacy_practices.pdf",
                                  "consent_for_release_use_of_confidential_information_and_receipt_of_notice_of_privacy_practices.pdf"),
            convert_to_attachment("https://www.aascmed.com/documents/consent_form_for_messages.pdf",
                                  "consent_form_for_messages.pdf"),
        ]

        new_patient_response_status_code = mailer(
            new_patient_email_to,
            [],
            new_patient_email_subject,
            new_patient_forms_template,
            new_patient_reply_to,
            new_patient_email_substitutions,
            new_patient_email_attachments
        )

        if new_patient_response_status_code != 202:
            raise HTTPException(
                status_code=500,
                detail=encoders.jsonable_encoder(contact_schemas.ContactFormErrorResponse(
                    error="An unexpected error occurred when sending patient registration forms."
                ))
            )

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=encoders.jsonable_encoder(contact_schemas.ContactFormErrorResponse(error="An unexpected error occurred.")))

    return


def convert_to_attachment(url: str, file_name: str, file_type: str = "application/pdf") -> sendgrid.Attachment:
    resp = requests.get(url)
    content = base64.b64encode(resp.content).decode()

    return sendgrid.Attachment(
        sendgrid.FileContent(content),
        sendgrid.FileName(file_name),
        sendgrid.FileType(file_type),
    )
