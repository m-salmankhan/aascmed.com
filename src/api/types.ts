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

/** Show field_errors first when present; error is the fallback for failures without field errors. */
export type ContactFormResult =
    | { ok: true }
    | { ok: false; error: string; field_errors?: ContactFormFieldErrors };
