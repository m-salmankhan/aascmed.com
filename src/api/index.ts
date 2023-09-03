import { ContactFormErrorResponse, ContactFormFields, HTTP_STATUS } from "./types";

export class API {
    // Contact form
    readonly baseURL: string;

    constructor() {
        this.baseURL = process.env.GATBSY_API_BASE_URL || "https://api.aascmed.com";
    }

    async contact(fields: ContactFormFields): Promise<void | ContactFormErrorResponse> {
        const response = await fetch(
            `${this.baseURL}/contact/`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify(fields)
            }
        );

        const data = await response.json().catch(() => new Error("Decoding response failed."));

        switch (response.status) {
            case HTTP_STATUS.OK:
                return;

            case HTTP_STATUS.BAD_REQUEST:
                return data.detail as ContactFormErrorResponse;

            default:
                throw Error("Unexpected response from API server.")
        }
    }
}