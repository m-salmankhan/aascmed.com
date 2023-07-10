from typing import List, Optional

from pydantic import BaseModel


class ContactFormSubmission(BaseModel):
    subject: str
    full_name: str
    email_address: str
    phone_number: str
    message: Optional[str]
    clinic: str
    newPatient: bool
    disclaimer: bool


ContactFormFieldError = Optional[List[str]]


class ContactFormFieldErrors(BaseModel):
    subject: ContactFormFieldError
    full_name: ContactFormFieldError
    email_address: ContactFormFieldError
    phone_number: ContactFormFieldError
    message: ContactFormFieldError
    clinic: ContactFormFieldError
    new_patient: ContactFormFieldError
    disclaimer: ContactFormFieldError


class ContactFormErrorResponse(BaseModel):
    # details of errors in submitted fields
    field_errors: Optional[ContactFormFieldErrors]
    # if another error occurred (not a field validation error)
    error: Optional[str]
