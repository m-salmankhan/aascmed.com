import { Image } from "../media/image";

export const IlitSocietyBadge = ({ href = "https://ilitsociety.org/practitioner/allergy-asthma-sinus-centers-bolingbrook/", variant = "light" }: { href?: string; variant?: "light" | "dark" }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        <Image image={{
            src: `https://ilitsociety.org/badge/ilit-badge-${variant}-sm-find-us-on.png`,
            srcSet: `https://ilitsociety.org/badge/ilit-badge-${variant}-sm-find-us-on@2x.png 2x`,
            width: 189,
            height: 48,
            alt: "Find us on the ILIT Society directory",
        }} />
    </a>
);
