import { Checkbox, DropdownInput, TextArea, TextInput } from "../forms";
import { graphql, useStaticQuery } from "gatsby";
import React from "react";
import { PrimaryButton } from "../buttons";
import { css } from "@emotion/react";

interface ContactFormProps {
    className?: string,
    clinic?: string
}
export const ContactForm: React.FC<ContactFormProps> = (props) => {
    const data: Queries.ClinicNamesQuery = useStaticQuery(graphql`
    query ClinicNames {
      allMdx(filter: {fields: {post_type: {eq: "clinics"}}}) {
        clinics: edges {
          node {
            frontmatter {
              title
            }
          }
        }
      }
    }`);


    return (
        <form className={props.className}>
            <TextInput
                type={"text"}
                label={"Subject"}
                placeholder={"e.g. Booking Request"}
                name={"subject"}
                required={true}
                css={css`margin-top: 0`}
            />
            <TextInput
                type={"text"}
                label={"Full Name"}
                placeholder={"E.g. John Doe"}
                name={"fullname"}
                required={true}
            />
            <TextInput
                type={"email"}
                label={"Email Address"}
                placeholder={"example@example.com"}
                name={"email"}
                required={true}
            />
            <TextInput
                type={"tel"}
                label={"Phone Number"}
                placeholder={"Phone number"}
                name={"phone"}
                required={true}
            />
            <TextArea
                label={"Your message"}
                placeholder={"Leave this field empty if you would like us to phone you."}
                rows={5}
                name={"message"}
            />
            {
                props.clinic === undefined ?
                    <DropdownInput label={"Preferred Location"} name="clinic" defaultValue={"none"}>
                        <option value={"none"} disabled={true}>Select a clinic</option>
                        {data.allMdx.clinics.map((clinic, idx) =>
                            <option key={idx} value={clinic.node?.frontmatter?.title || idx}>{clinic.node?.frontmatter?.title}</option>
                        )}
                    </DropdownInput> :
                    <input type="hidden" name="clinic" value={props.clinic} />
            }
            <Checkbox label={"I am a new patient"} />
            <Checkbox
                label={<><strong>I confirm that the above message does not contain any personal health data.</strong> This message will be transmitted over email.</>}
                required={true}
            />
            <PrimaryButton type={"submit"} css={css`margin: 1em auto 0`}>Send Message</PrimaryButton>
        </form>
    );
}