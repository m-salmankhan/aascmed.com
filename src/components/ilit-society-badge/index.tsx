import { Image } from "../media/image";

export const IlitSocietyBadge = () => (
    <a href="https://ilitsociety.org/practitioner/allergy-asthma-sinus-centers-bolingbrook/" target="_blank" rel="noopener noreferrer nofollow">
        <Image image={{
            src: "https://ilitsociety.org/badge/ilit-badge-light-sm-find-us-on.png",
            srcSet: "https://ilitsociety.org/badge/ilit-badge-light-sm-find-us-on@2x.png 2x",
            width: 189,
            height: 48,
            alt: "Find us on the ILIT Society directory (opens in a new tab)",
        }} />
    </a>
);
