export interface ContactFormFields {
    subject: string
    full_name: string
    email_address: string
    phone_number: string
    message: string
    clinic: string
    newPatient: boolean
    disclaimer: boolean
    source_url: string
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
    source_url?: string[]
}

export interface ContactFormErrorResponse {
    error?: string
    field_errors?: ContactFormFieldErrors
}

export type ContactFormFailure = "timeout" | "network" | "rejected" | "server";

/** Field errors take precedence over the server error, then the failure reason's UI copy. */
export type ContactFormResult =
    | { ok: true }
    | ({ ok: false; reason: ContactFormFailure } & ContactFormErrorResponse);
