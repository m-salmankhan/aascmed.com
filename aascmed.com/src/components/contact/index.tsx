import { Checkbox, DropdownInput, TextArea, TextInput } from "../forms";
import { graphql, useStaticQuery } from "gatsby";
import React, { FormEventHandler, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "../buttons";
import { css } from "@emotion/react";
import { API } from "../../api";
import { ContactFormFieldErrors } from "../../api/types";
import { ErrorNotice, SuccessNotice } from "../forms/notices";
import { Loading } from "../loading";
import { stylesH4 } from "../headings";


enum FormState {
    DEFAULT,
    SUBMITTING,
    SUCCESS,
    ERROR
}

interface ContactFormProps {
    className?: string,
    clinic?: string
}
export const ContactForm: React.FC<ContactFormProps> = (props) => {
    const [formState, setFormState] = useState(FormState.DEFAULT);
    const [formData, setFormData] = useState<FormData | undefined>(undefined);
    const [fieldErrors, setFieldErrors] = useState<ContactFormFieldErrors | undefined>();
    const [errorMsg, setErrorMsg] = useState("An unexpected error occurred.");
    const formRef = useRef<HTMLFormElement>(null);

    const data: Queries.ClinicNamesQuery = useStaticQuery(graphql`
    query ClinicNames {
      allMdx(filter: {fields: {post_type: {eq: "clinics"}}}) {
        clinics: edges {
          node {
            frontmatter {
              clinic_name
            }
          }
        }
      }
    }`);

    // update state variables. actual api call happens on rerender
    const formSubmisisonHandler: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        if (!formRef.current) return;
        setFieldErrors(undefined);
        setFormState(FormState.SUBMITTING);
        setFormData(new FormData(formRef.current));
        return false;
    }

    // submit form here.
    useEffect(() => {
        if (formData === undefined) return;
        if (formState !== FormState.SUBMITTING) return;

        const api = new API();

        api.contact({
            subject: (formData.get("subject")?.toString() || ""),
            full_name: (formData.get("fullname")?.toString() || ""),
            email_address: (formData.get("email")?.toString() || ""),
            phone_number: (formData.get("phone")?.toString() || ""),
            clinic: (formData.get("clinic")?.toString() || ""),
            message: (formData.get("message")?.toString() || ""),
            newPatient: !!(formData.get("new_patient")?.valueOf()),
            disclaimer: !!(formData.get("disclaimer")?.valueOf()),
        }).then(res => {
            console.log(res)
            // no error messages
            if (res === undefined) {
                setFormState(FormState.SUCCESS);
                setFormData(undefined);
                return;
            }

            if (res.field_errors) {
                setFieldErrors(res.field_errors);
                setFormState(FormState.DEFAULT);
            } else if (res.error) {
                setFormState(FormState.ERROR);
                setErrorMsg(res.error);
            } else {
                setFormState(FormState.ERROR);
            }
        }).catch(e => {
            console.error(e);
            setFormState(FormState.ERROR);
        })
    }, [formState, formData]);

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
                <SuccessNotice css={css`margin-bottom: 1em;`}>Message successfully sent! If you are a new patient, check your email for the patient registration forms.</SuccessNotice>
            }
            {
                formState === FormState.ERROR &&
                <ErrorNotice css={css`margin-bottom: 1em;`}>{errorMsg}</ErrorNotice>

            }
            <form css={formState == FormState.SUBMITTING ? css`display: none;` : Boolean} ref={formRef} className={props.className} onSubmit={formSubmisisonHandler}>
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
                            {data.allMdx.clinics.map((clinic, idx) =>
                                <option key={idx} value={clinic.node?.frontmatter?.clinic_name || idx}>{clinic.node?.frontmatter?.clinic_name}</option>
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