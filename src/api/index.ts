import type { ContactFormFields, ContactFormFieldErrors, ContactFormResult } from "./types";

export const contactErrorMessage = "An unexpected error occurred. Please try again or email us at info@aascmed.com if the problem persists.";
const fieldNames = ["subject", "full_name", "email_address", "phone_number", "message", "clinic", "new_patient", "disclaimer", "source_url"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export class API {
    constructor(readonly baseURL: string) {}

    async contact(fields: ContactFormFields): Promise<ContactFormResult> {
        try {
            const response = await fetch(`${this.baseURL}/contact/`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(15000),
            });
            if (response.ok) return { ok: true };

            const data: unknown = await response.json().catch(() => null);
            const detail = isRecord(data) ? data.detail : undefined;
            const field_errors: ContactFormFieldErrors = {};
            if (response.status === 422 && Array.isArray(detail)) {
                for (const item of detail) {
                    if (!isRecord(item) || !Array.isArray(item.loc) || item.loc[0] !== "body" || typeof item.msg !== "string") continue;
                    const field = item.loc[1] === "newPatient" ? "new_patient" : item.loc[1];
                    const key = fieldNames.find(name => name === field);
                    if (key) (field_errors[key] ??= []).push(item.msg);
                }
            } else if (isRecord(detail) && isRecord(detail.field_errors)) {
                for (const key of fieldNames) {
                    const messages = detail.field_errors[key];
                    if (Array.isArray(messages) && messages.every(message => typeof message === "string") && messages.length) {
                        field_errors[key] = messages;
                    }
                }
            }
            return {
                ok: false,
                error: isRecord(detail) && typeof detail.error === "string" && detail.error ? detail.error : contactErrorMessage,
                ...(Object.keys(field_errors).length ? { field_errors } : {}),
            };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error && error.name === "TimeoutError"
                    ? "We couldn't confirm your message was sent. Please call the clinic, or check your email before sending again."
                    : contactErrorMessage,
            };
        }
    }
}
