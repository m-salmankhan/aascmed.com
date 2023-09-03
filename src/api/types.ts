export enum HTTP_STATUS {
    OK = 200,
    CREATED = 201,

    BAD_REQUEST = 400,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNPROCESSABLE = 422,
}

export interface ContactFormFields {
    subject: string
    full_name: string
    email_address: string
    phone_number: string
    message: string
    clinic: string
    newPatient: boolean
    disclaimer: boolean
}

export interface ContactFormFieldErrors {
    subject?: string[]
    full_name?: string[]
    email_address?: string[]
    phone_number?: string[]
    message?: string[]
    clinic?: string[]
    new_patient?: string[]
    disclaimer?: string[]
}

export interface ContactFormErrorResponse {
    error?: string
    field_errors?: ContactFormFieldErrors
}