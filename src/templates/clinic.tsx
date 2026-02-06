import React from "react";
import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { Column, Columns, HalfColumnsLayout } from "../components/layouts/half-columns";
import { H1, H2, H3, stylesH1, stylesH5 } from "../components/headings";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { MapBox } from "../components/mapbox/dynamic";
import { PrimaryAnchor } from "../components/buttons";
import { Table } from "../components/tables";
import { ContactForm } from "../components/contact";
import { SEO } from "../components/seo";
import { Article } from "../components/posts/article";
import { useSiteMetadata } from "../hooks/useSiteMetadata";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const to12Hr = (time: string) => {
    if (!time) return "";
    const [hrs, mins] = time.split(":");
    const hour = parseFloat(hrs);
    return (hour <= 12) ? `${hour}:${mins} a.m.` : `${hour - 12}:${mins} p.m.`;
}

const formatHours = (startTime: string | null, endTime: string | null): string => {
    if (!startTime || !endTime) return "Closed";
    return `${to12Hr(startTime)} - ${to12Hr(endTime)}`;
}

const Clinic: React.FC<PageProps<Queries.ClinicQuery>> = ({ data }) => {
    const siteMetadata = useSiteMetadata();
    const clinic = data.strapiClinic;
    
    const clinicName = clinic?.clinic_name || "Untitled";
    const pageTitle = clinic?.title || "Untitled";
    
    // Parse raw JSON content to get full rich text data with all formatting
    const rawContent = clinic?.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const body = parsedData?.body as any[] | undefined;

    const clinicAddress = clinic?.location?.address || "";
    const clinicPhone = clinic?.contact?.phone || "";
    const clinicFax = clinic?.contact?.fax || "";

    const googlePlaceID = clinic?.location?.placeId;
    const longitude = clinic?.location?.long || 0;
    const latitude = clinic?.location?.lat || 0;
    const pinLabelName = clinic?.location?.label_name || clinicName;

    // Transform Strapi hours data to the format used in the template
    const clinicOpeningTimes = clinic?.hours?.map(day => {
        const isOpen = day?.open;
        const openingHours = day?.opening_hours;
        
        return {
            day: day?.day || "",
            hours: isOpen && openingHours ? formatHours(openingHours.start_time, openingHours.end_time) : "Closed",
            hours24: isOpen && openingHours ? `${openingHours.start_time} - ${openingHours.end_time}` : "Closed",
        }
    }) || [];
    
    const clinicShotTimes = clinic?.hours?.filter(day => day?.open && day?.shot_hours).map(day => {
        const shotHours = day?.shot_hours;
        
        return {
            day: day?.day || "",
            hours: shotHours ? formatHours(shotHours.start_time, shotHours.end_time) : "Closed",
            hours24: shotHours ? `${shotHours.start_time} - ${shotHours.end_time}` : "Closed",
        }
    }) || [];

    const slug = `/clinics/${clinicName.toLowerCase().replace(/\s+/g, '-')}/`;

    const stylesPageTitle = css`
        font-size: 2.5em;
    `;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "MedicalClinic",
        logo: `${siteMetadata.url}/assets/logos/logo.png`,
        image: `${siteMetadata.url}/assets/logos/logo.png`,
        name: `${siteMetadata.title} ${clinicName}`,
        medicalSpecialty: ["Pediatric", "Pulmonary", "PublicHealth"],
        address: clinicAddress,
        geo: {
            "@type": "GeoCoordinates",
            latitude: latitude,
            longitude: longitude
        },
        url: `${siteMetadata.url}${slug}`,
        telephone: clinicPhone,
        faxNumber: clinicFax,
        email: "info@aascmed.com",
        openingHoursSpecification: clinicOpeningTimes.map((entry) => {
            const closed = entry.hours24.toLowerCase().trim() === "closed";
            const hours = entry.hours24.split("-").map(x => x.trim());

            const openingHoursSpecification = {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: entry.day,
                opens: closed ? undefined : hours[0],
                closes: closed ? undefined : hours[1],
            }

            return openingHoursSpecification;
        }),
    }

    return (
        <HalfColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/clinics/", "Clinics"],
                    [slug, clinicName]
                ]} css={css({ marginTop: "3em" })} />

                <H1 css={stylesPageTitle}>{clinicName} Clinic</H1>
                <Columns>
                    <Column>
                        <MapBox
                            css={css`height: 25em`}
                            longitude={longitude} latitude={latitude}
                            zoom={15}
                            label={pinLabelName}
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
                        <H2 css={stylesH1}>Contact</H2>
                        <ContactForm clinic={clinicName} />

                        <Article>
                            <h2>About the Clinic</h2>
                            <StrapiBlocksRenderer content={body} />
                        </Article>
                    </Column>
                    <Column>
                        <H2 css={[stylesH1, css`margin-top: 0`]}>Contact Information</H2>
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
                                            <tr key={idx}>
                                                <td>{day.day}</td>
                                                <td>{day.hours}</td>
                                            </tr>
                                    )
                                }
                            </tbody>
                            {clinicShotTimes.length > 0 && (
                                <>
                                    <tr className={"faux-head"}>
                                        <td colSpan={2}>Shot Hours</td>
                                    </tr>
                                    {
                                        clinicShotTimes.map(
                                            (day, idx) =>
                                                <tr key={`shot-${idx}`}>
                                                    <td>{day.day}</td>
                                                    <td>{day.hours}</td>
                                                </tr>
                                        )
                                    }
                                </>
                            )}
                        </Table>
                    </Column>
                </Columns>
            </main>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}></script>
        </HalfColumnsLayout>
    )
}

export const Head = (props: HeadProps<Queries.ClinicQuery>) => {
    const pageTitle = props.data.strapiClinic?.title || "Untitled";
    const description = props.data.strapiClinic?.description || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={`${pageTitle}`} useTracking={true} appendBusinessNameToTitle={false}>
            <meta name={"og:type"} content={"website"} />
        </SEO>
    )
}

export const query = graphql`
  query Clinic($id: String) {
    strapiClinic(id: {eq: $id}) {
      id
      title
      clinic_name
      description
      internal {
        content
      }
      hours {
        day
        open
        opening_hours {
          start_time
          end_time
        }
        shot_hours {
          start_time
          end_time
        }
      }
      contact {
        phone
        fax
      }
      location {
        address
        lat
        long
        placeId
        label_name
      }
    }
  }
`

export default Clinic
