import { css } from "@emotion/react";
import { colours, gridSpacing } from "../../styles/theme";
import { Container } from "../containers";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { H3, stylesH1 } from "../headings";
import { Logo } from "../logo";
import { Link } from "gatsby";

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
                            <li><Link to={"/"}>Home</Link></li>
                            <li><Link to={"/conditions/"}>Conditions</Link></li>
                            <li><Link to={"/service-updates/"}>Service Updates</Link></li>
                            <li><Link to={"/providers/"}>Meet the team</Link></li>
                            <li><Link to={"/clinics/"}>Practice Locations</Link></li>
                            <li><Link to={"/privacy/"}>Privacy Policy</Link></li>
                        </ul>
                    </nav>
                </div>
                <div css={stylesCol}>
                    <H3 css={stylesH1}>External Sites</H3>
                    <nav>
                        <ul>
                            <li><Link to={"https://login.patientfusion.com/"}>Patient Portal</Link></li>
                            <li><Link to={"https://www.facebook.com/AllergyAsthmaAndSinusCenters/"}>Facebook</Link></li>
                            <li><Link to={"https://twitter.com/DrMaazAllergy"}>Twitter</Link></li>
                        </ul>
                    </nav>
                    <p>Website by <a href="https://msalmankhan.co.uk/">Salman Khan</a></p>
                </div>
            </Container>
        </footer>
    )
}