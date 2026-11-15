import type { ContactFormFields, ContactFormErrorResponse, ContactFormResult } from "./types";

export class API {
    constructor(readonly baseURL: string) {}

    async contact(fields: ContactFormFields): Promise<ContactFormResult> {
        let response: Response;
        try {
            response = await fetch(`${this.baseURL}/contact/`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(15000),
            });
        } catch (error) {
            return { ok: false, reason: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network" };
        }

        switch (response.status) {
            case 200:
                return { ok: true };
            case 400: {
                const data = await response.json().catch(() => null);
                return { ...(data?.detail as ContactFormErrorResponse | undefined), ok: false, reason: "rejected" };
            }
            default:
                return { ok: false, reason: "server" };
        }
    }
}
