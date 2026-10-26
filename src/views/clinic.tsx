import React from "react";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { H1, H2, H3, stylesH1, stylesH5 } from "../components/headings";
import { Column, Columns, HalfColumnsLayout } from "../components/layouts/half-columns";
import { MapBox } from "../components/mapbox/dynamic";
import { PrimaryAnchor } from "../components/buttons";
import { Table } from "../components/tables";
import { ContactForm } from "../components/contact";
import { Article } from "../components/posts/article";
import { useSiteMetadata } from "../hooks/useSiteMetadata";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import type { ClinicRecord } from "../shared/content/models";

export interface ClinicViewProps { clinic?: ClinicRecord }

function to12Hr(time: string): string {
  if (!time) return "";
  const [hrs, mins] = time.split(":");
  const hour = parseFloat(hrs);
  if (hour <= 12) return hour === 12 ? `${hour}:${mins} p.m.` : `${hour}:${mins} a.m.`;
  return `${hour - 12}:${mins} p.m.`;
}

function formatHours(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return "Closed";
  return `${to12Hr(startTime)} - ${to12Hr(endTime)}`;
}

export function ClinicView({ clinic }: ClinicViewProps) {
  const siteMetadata = useSiteMetadata();
  const clinicName = clinic?.clinicName || "Untitled";
  const clinicAddress = clinic?.location?.address || "";
  const clinicPhone = clinic?.contact?.phone || "";
  const clinicFax = clinic?.contact?.fax || "";
  const placeId = clinic?.location?.placeId;
  const longitude = clinic?.location?.longitude || 0;
  const latitude = clinic?.location?.latitude || 0;
  const pinLabelName = clinic?.location?.label || clinicName;
  const hours = clinic?.hours || [];
  const openingTimes = hours.map(day => ({
    day: day.day || "",
    hours: day.open && day.openingHours ? formatHours(day.openingHours.startTime, day.openingHours.endTime) : "Closed",
    hours24: day.open && day.openingHours?.startTime && day.openingHours?.endTime
      ? `${day.openingHours.startTime} - ${day.openingHours.endTime}` : "Closed",
  }));
  const shotTimes = hours.filter(day => day.open && day.shotHours).map(day => ({
    day: day.day || "",
    hours: day.shotHours ? formatHours(day.shotHours.startTime, day.shotHours.endTime) : "Closed",
  }));
  const slugName = clinicName.toLowerCase().replace(/\s+/g, "-");
  const slug = `/clinics/${slugName}/`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    logo: `${siteMetadata.url}/assets/logos/logo.png`,
    image: `${siteMetadata.url}/assets/logos/logo.png`,
    name: `${siteMetadata.title} ${clinicName}`,
    medicalSpecialty: ["Pediatric", "Pulmonary", "PublicHealth"],
    address: clinicAddress,
    geo: { "@type": "GeoCoordinates", latitude, longitude },
    url: `${siteMetadata.url}${slug}`,
    telephone: clinicPhone,
    faxNumber: clinicFax,
    email: "info@aascmed.com",
    openingHoursSpecification: openingTimes.map(entry => {
      const closed = entry.hours24.toLowerCase().trim() === "closed";
      const range = entry.hours24.split("-").map(value => value.trim());
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: entry.day,
        opens: closed ? undefined : range[0],
        closes: closed ? undefined : range[1],
      };
    }),
  };

  return <HalfColumnsLayout>
    <main>
      <Breadcrumbs path={[["/", "Home"], ["/clinics/", "Clinics"], [slug, clinicName]]} css={css({ marginTop: "3em" })} />
      <H1 css={css`font-size: 2.5em;`}>{clinicName} Clinic</H1>
      <Columns>
        <Column>
          <MapBox css={css`height: 25em`} longitude={longitude} latitude={latitude} zoom={15} label={pinLabelName} />
          {placeId && <PrimaryAnchor
            css={css`margin-top: 1em`}
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`Allergy, Asthma and Sinus Centers (${clinicName})`)}&destination_place_id=${placeId}`}
            target="_BLANK" rel="noreferrer">
            Open directions in Google Maps
          </PrimaryAnchor>}
          <H2 css={stylesH1}>Contact</H2>
          <ContactForm clinic={clinicName} />
          <Article><h2>About the Clinic</h2><StrapiBlocksRenderer content={clinic?.body as any[] | undefined} /></Article>
        </Column>
        <Column>
          <H2 css={[stylesH1, css`margin-top: 0`]}>Contact Information</H2>
          <H3 css={stylesH5}>Address</H3>
          <address css={css`white-space: pre-wrap; font-style: normal`}>{clinicAddress}</address>
          <H3 css={stylesH5}>Phone</H3>
          <a css={css`color: inherit`} href={`tel:${clinicPhone}`}>{clinicPhone}</a>
          <H3 css={stylesH5}>Fax</H3>
          <a css={css`color: inherit`} href={`fax:${clinicFax}`}>{clinicFax}</a>
          <H2 css={stylesH1}>Opening Hours</H2>
          <Table>
            <thead><tr><td>Day</td><td>Hours</td></tr></thead>
            <tbody>{openingTimes.map((day, idx) => <tr key={idx}><td>{day.day}</td><td>{day.hours}</td></tr>)}</tbody>
            {shotTimes.length > 0 && <>
              <tr className="faux-head"><td colSpan={2}>Shot Hours</td></tr>
              {shotTimes.map((day, idx) => <tr key={`shot-${idx}`}><td>{day.day}</td><td>{day.hours}</td></tr>)}
            </>}
          </Table>
        </Column>
      </Columns>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
  </HalfColumnsLayout>;
}
