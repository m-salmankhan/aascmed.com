from typing import List, Optional

from pydantic import BaseModel


class ContactFormSubmission(BaseModel):
    subject: str
    full_name: str
    email_address: str
    phone_number: str
    message: Optional[str] = None
    clinic: str
    newPatient: bool
    disclaimer: bool


ContactFormFieldError = List[str]


class ContactFormFieldErrors(BaseModel):
    subject: Optional[ContactFormFieldError] = None
    full_name: Optional[ContactFormFieldError] = None
    email_address: Optional[ContactFormFieldError] = None
    phone_number: Optional[ContactFormFieldError] = None
    message: Optional[ContactFormFieldError] = None
    clinic: Optional[ContactFormFieldError] = None
    new_patient: Optional[ContactFormFieldError] = None
    disclaimer: Optional[ContactFormFieldError] = None


class ContactFormErrorResponse(BaseModel):
    # details of errors in submitted fields
    field_errors: Optional[ContactFormFieldErrors] = None
    # if another error occurred (not a field validation error)
    error: Optional[str] = None


class HTTP400Response(BaseModel):
    detail: ContactFormErrorResponse