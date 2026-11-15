import { Checkbox, DropdownInput, TextArea, TextInput } from "../forms";
import React, { FormEventHandler, useRef, useState } from "react";
import { PrimaryButton } from "../buttons";
import { css } from "@emotion/react";
import { API } from "../../api";
import { ContactFormFailure, ContactFormFieldErrors } from "../../api/types";
import { ErrorNotice, SuccessNotice } from "../forms/notices";
import { Loading } from "../loading";
import { stylesH4 } from "../headings";
import { usePublicConfig } from "../../config/public-context";


const contactErrorMessage = "An unexpected error occurred. Please try again or email us at info@aascmed.com if the problem persists.";
const failureMessages: Record<ContactFormFailure, string> = {
    timeout: "We couldn't confirm your message was sent. Please call the clinic, or check your email before sending again.",
    network: contactErrorMessage,
    rejected: contactErrorMessage,
    server: contactErrorMessage,
};

enum FormState {
    DEFAULT,
    SUBMITTING,
    SUCCESS,
    ERROR
}

/** Contact form data; a selector needs clinic options unless one clinic is fixed. */
type ContactFormProps = { className?: string } & (
    | { clinicOptions: readonly string[]; clinic?: undefined }
    | { clinic: string; clinicOptions?: never }
);

/** Render the contact form from explicit clinic-selection data.
 * @param props Available clinic labels or a fixed clinic, with optional class styling.
 * @returns The form with its current submission-status notices.
 */
export function ContactForm(props: ContactFormProps): React.ReactElement {
    const { runtimeApiBaseUrl } = usePublicConfig();
    const [formState, setFormState] = useState(FormState.DEFAULT);
    const [fieldErrors, setFieldErrors] = useState<ContactFormFieldErrors | undefined>();
    const [errorMsg, setErrorMsg] = useState(contactErrorMessage);
    const submitting = useRef(false);


    const formSubmisisonHandler: FormEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        const formData = new FormData(event.currentTarget);
        setFieldErrors(undefined);
        setFormState(FormState.SUBMITTING);
        const api = new API(runtimeApiBaseUrl);

        try {
            const res = await api.contact({
                subject: (formData.get("subject")?.toString() || ""),
                full_name: (formData.get("fullname")?.toString() || ""),
                email_address: (formData.get("email")?.toString() || ""),
                phone_number: (formData.get("phone")?.toString() || ""),
                clinic: (formData.get("clinic")?.toString() || ""),
                message: (formData.get("message")?.toString() || ""),
                newPatient: !!(formData.get("new_patient")?.valueOf()),
                disclaimer: !!(formData.get("disclaimer")?.valueOf()),
                source_url: window.location.href,
            });
            // no error messages
            if (res.ok) {
                setFormState(FormState.SUCCESS);
                window.fbq?.("track", "Contact");
                window.gtag?.("event", "generate_lead", {
                    new_customer: !!(formData.get("new_patient")?.valueOf()),
                    clinic: (formData.get("clinic")?.toString() || "unselected")
                });
                return;
            }

            if (res.field_errors) {
                setFieldErrors(res.field_errors);
                setFormState(FormState.DEFAULT);
            } else {
                setFormState(FormState.ERROR);
                setErrorMsg(res.error || failureMessages[res.reason]);
            }
        } catch (e) {
            console.error(e);
            setFormState(FormState.ERROR);
        } finally {
            submitting.current = false;
        }
    };

    return (
        <>
            {
                formState === FormState.SUBMITTING &&
                <Loading>
                    <span css={stylesH4}>Sending</span>
                </Loading>
            }
            {
                formState === FormState.SUCCESS &&
                <>
                    <SuccessNotice css={css`margin-bottom: 1em;`}>Message successfully sent! If you are a new patient, check your email for the patient registration forms.</SuccessNotice>
                </>
            }
            {
                formState === FormState.ERROR &&
                <ErrorNotice css={css`margin-bottom: 1em;`}>{errorMsg}</ErrorNotice>

            }
            <form css={formState == FormState.SUBMITTING ? css`display: none;` : Boolean} className={props.className} onSubmit={formSubmisisonHandler}>
                <TextInput
                    type={"text"}
                    label={"Subject"}
                    placeholder={"e.g. Booking Request"}
                    name={"subject"}
                    required={true}
                    css={css`margin-top: 0`}
                    error={fieldErrors?.subject?.join(". ")}
                />
                <TextInput
                    type={"text"}
                    label={"Full Name"}
                    placeholder={"E.g. John Doe"}
                    name={"fullname"}
                    required={true}
                    error={fieldErrors?.full_name?.join(". ")}
                />
                <TextInput
                    type={"email"}
                    label={"Email Address"}
                    placeholder={"example@example.com"}
                    name={"email"}
                    required={false}
                    error={fieldErrors?.email_address?.join(". ")}
                />
                <TextInput
                    type={"tel"}
                    label={"Phone Number"}
                    placeholder={"Phone number"}
                    name={"phone"}
                    required={true}
                    error={fieldErrors?.phone_number?.join(". ")}
                />
                <TextArea
                    label={"Your message"}
                    placeholder={"Leave this field empty if you would like us to phone you."}
                    rows={5}
                    name={"message"}
                    error={fieldErrors?.message?.join(". ")}
                />
                {
                    props.clinic === undefined ?
                        <DropdownInput label={"Preferred Location"} name="clinic" defaultValue={"none"} error={fieldErrors?.clinic?.join(". ")}>
                            <option value={"none"} disabled={true}>Select a clinic</option>
                            {props.clinicOptions.map((clinic) =>
                                <option key={clinic} value={clinic}>{clinic}</option>
                            )}
                        </DropdownInput> :
                        <input type="hidden" name="clinic" value={props.clinic} />
                }
                <Checkbox label={"I am a new patient"} name={"new_patient"} value={1} />
                <Checkbox
                    label={<><strong>I confirm that the above message does not contain any personal health data.</strong> This message will be transmitted over email.</>}
                    required={true}
                    name={"disclaimer"}
                    value={1}
                    error={fieldErrors?.disclaimer?.join(". ")}
                />
                <PrimaryButton type={"submit"} css={css`margin: 1em auto 0`}>Send Message</PrimaryButton>
            </form>
        </>
    );
}
