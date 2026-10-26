import { css } from "@emotion/react";
import { colours, gridSpacing } from "../../styles/theme";
import { Container } from "../containers";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { H3, stylesH1 } from "../headings";
import { Logo } from "../logo";
import { SiteLink } from "../../shared/navigation/link";
import { HorizontalCalloutBanner } from "../cta/horizontal-banner";

const stylesFooter = css`
    background: ${colours.brandPrimary};
    color: #fff;
    padding: ${gridSpacing}rem 0;
    margin-top: ${gridSpacing}rem;

    h1, h2, h3, h4, h5, h6 {
        color: #fff;
    }

    a {
        color: #fff;
    }

    nav ul {
        list-style-position: inside;
        list-style-type: circle;

        li {
            margin: ${gridSpacing / 4}rem 0;

            a {
                text-decoration: none;

                &:focus {
                    text-decoration: underline;
                }
            }
        }
    }
`;
const stylesCol = css(
    cols(12),
    cols(4, mediaBreakpoints.md)
);
export const Footer = () => {
    return (
        <footer css={stylesFooter}>
            <Container css={gridContainer()}>
                <div css={stylesCol}>
                    <Logo css={css`fill: #fff; width: 8em; height: 8em;`} />
                    <H3 css={stylesH1}>About</H3>
                    <p>We have been providing expert care for nearly 30 years to sufferers of allergy, asthma and sinus related problems.</p>
                </div>
                <div css={stylesCol}>
                    <H3 css={stylesH1}>Navigation</H3>
                    <nav>
                        <ul>
                            <li><SiteLink href={"/"}>Home</SiteLink></li>
                            <li><SiteLink href={"/conditions/"}>Conditions</SiteLink></li>
                            <li><SiteLink href={"/service-updates/"}>Service Updates</SiteLink></li>
                            <li><SiteLink href={"/blog/"}>Blog Posts</SiteLink></li>
                            <li><SiteLink href={"/providers/"}>Meet the team</SiteLink></li>
                            <li><SiteLink href={"/clinics/"}>Practice Locations</SiteLink></li>
                            <li><SiteLink href={"/privacy/"}>Privacy Policy</SiteLink></li>
                        </ul>
                    </nav>
                </div>
                <div css={stylesCol}>
                    <H3 css={stylesH1}>External Sites</H3>
                    <nav>
                        <ul>
                            <li><a href={"https://login.patientfusion.com/"} target="_BLANK" rel="noopener">Patient Portal</a></li>
                            <li><a href={"https://www.instagram.com/allergy.asthma.sinus.centers/"} target="_BLANK" rel="noopener">Instagram</a></li>
                            <li><a href={"https://www.tiktok.com/@allergyasthmasinuscenter"} target="_BLANK" rel="noopener">TikTok</a></li>
                            <li><a href={"https://www.facebook.com/AllergyAsthmaAndSinusCenters/"} target="_BLANK" rel="noopener">Facebook</a></li>
                            <li><a href={"https://twitter.com/DrMaazAllergy"} target="_BLANK" rel="noopener">Twitter</a></li>
                            <li><a href={"/admin"} target="_BLANK" rel="noopener">Site Administration</a></li>
                        </ul>
                    </nav>
                    <p>Website by <a href="https://msalmankhan.co.uk/" target="_BLANK" rel="noopener">Salman Khan.</a></p>
                </div>
            </Container>
            <HorizontalCalloutBanner
                title="Patient Forms"
                description="Fill out your intake paperwork online before your appointment."
                primaryButtonLabel="Registration Form"
                primaryButtonUrl="https://form-aasc-allergy.raga.ai/forms/patient-registration-form"
                secondaryButtonLabel="Health History Form"
                secondaryButtonUrl="https://form-aasc-allergy.raga.ai/forms/patient-health-history-form"
                compactInContainer={true}
            />
        </footer>
    )
}
