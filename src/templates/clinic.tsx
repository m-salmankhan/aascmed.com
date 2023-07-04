import * as React from "react"
import {graphql, PageProps} from "gatsby"
import {Column, Columns, HalfColumnsLayout} from "../components/layouts/half-columns";
import {H1, H2, H3, stylesH1, stylesH5} from "../components/headings";
import {Breadcrumbs} from "../components/breadcrumbs";
import {css} from "@emotion/react";
import {MapBox} from "../components/mapbox";
import {PrimaryAnchor} from "../components/buttons";
import {Table} from "../components/tables";

const Clinic: React.FC<PageProps<Queries.ClinicQuery>>  = ({ data }) => {
    const clinicName = data.mdx?.frontmatter?.title || "Untitled";

    const clinicAddress = data.mdx?.frontmatter?.address || "";
    const clinicPhone = data.mdx?.frontmatter?.phone || "";
    const clinicFax = data.mdx?.frontmatter?.fax || "";

    const googlePlaceID = data.mdx?.frontmatter?.placeId;
    const longitude = data.mdx?.frontmatter?.lon || 0;
    const latitude = data.mdx?.frontmatter?.lat || 0;

    const clinicOpeningTimes = data.mdx?.frontmatter?.opening?.map(day => ({
        day: day?.day || "",
        hours: day?.hours || "",
        notes: day?.notes || "",
    })) || [];
    const clinicShotTimes = data.mdx?.frontmatter?.shot?.map(day => ({
        day: day?.day || "",
        hours: day?.hours || "",
        notes: day?.notes || "",
    })) || [];

    const stylesPageTitle = css`
        font-size: 2.5em;
    `;

    return (
        <HalfColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/clinics/", "Clinics"],
                    [data.mdx?.fields?.slug, clinicName]
                ]} css={css({marginTop: "3em"})} />

                <H1 css={stylesPageTitle}>{clinicName} Practice</H1>

                <Columns>
                    <Column>
                        <MapBox
                            css={css`height: 25em`}
                            longitude={longitude} latitude={latitude}
                            zoom={15}
                            label={`${clinicName} | Allergy Asthma and Sinus Centers`}
                        />
                        {
                            googlePlaceID &&
                            <PrimaryAnchor
                                css={css`margin-top: 1em`}
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`Allergy, Asthma and Sinus Centers (${clinicName})`)}&destination_place_id=${googlePlaceID}`}
                                target="_BLANK"
                                rel="noreferrer">
                                Open directions in Google Maps
                            </PrimaryAnchor>
                        }
                    </Column>
                    <Column>
                        <H2 css={[stylesH1, css`margin-top: 0`]}>Contact</H2>
                        <H3 css={stylesH5}>Address</H3>
                        <address css={css`white-space: pre-wrap; font-style: normal`}>
                            {clinicAddress}
                        </address>
                        <H3 css={stylesH5}>Phone</H3>
                        <a css={css`color: inherit`} href={`tel:${clinicPhone}`}>{clinicPhone}</a>
                        <H3 css={stylesH5}>Fax</H3>
                        <a css={css`color: inherit`} href={`fax:${clinicFax}`}>{clinicFax}</a>

                        <H2 css={stylesH1}>Opening Hours</H2>
                        <Table>
                            <thead>
                                <tr>
                                    <td>Day</td>
                                    <td>Hours</td>
                                </tr>
                            </thead>
                            <tbody>
                            {
                                clinicOpeningTimes.map(
                                    (day, idx) =>
                                        <tr>
                                            <td>{day.day}</td>
                                            <td>
                                                {day.hours} { day.notes && <>({day.notes})</>}
                                            </td>
                                        </tr>
                                )
                            }
                            </tbody>
                            <tr className={"faux-head"}>
                                <td colSpan={2}>Shot Hours</td>
                            </tr>
                            {
                                clinicShotTimes.map(
                                    (day, idx) =>
                                        <tr>
                                            <td>{day.day}</td>
                                            <td>
                                                {day.hours} { day.notes && <>({day.notes})</>}
                                            </td>
                                        </tr>
                                )
                            }
                        </Table>
                        {/*<pre>{JSON.stringify(data, null, 2)}</pre>*/}
                    </Column>
                </Columns>

            </main>
        </HalfColumnsLayout>
    )
}

export const query = graphql`
  query Clinic($id: String) {
    mdx(id: {eq: $id}) {
      id
      frontmatter {
        title
        address
        opening {
          day
          hours
          notes
        }
        shot {
          day
          hours
          notes
        }
        placeId
        lon
        lat
        fax
        phone
      }
      fields {
        slug
      }
    }
  }
`

export default Clinic