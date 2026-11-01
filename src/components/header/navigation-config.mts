import { ZocDocURL } from "../../config/booking.mts";

/** The rendered menu is also the source of labels for build-time measurement. */
export const navigationItems = [
  { href: "/conditions/", label: "Patient Education" },
  { href: "/providers/", label: "Our Team" },
  { href: "/clinics/", label: "Locations" },
  { href: "/blog/", label: "Blog" },
  { href: "https://allercorehealth.com/", label: "AllerCore Health" },
  { href: "https://login.patientfusion.com", label: "Patient Portal" },
  { href: ZocDocURL, label: "Bookings" },
  { href: "/contact/", label: "Contact" },
] as const;

/** Native toggle content and dimensions, also measured before rendering. */
export const navigationToggle = {
  label: "Menu",
  iconWidth: 1,
  iconGap: 0.5,
  padding: 0.5,
} as const;

/** Font-relative dimensions shared by generated measurements and browser CSS. */
export const navigationSizing = {
  fontSize: 1,
  letterSpacing: 0.025,
  linkGap: 1,
  logoWidth: 16,
  headerGap: 2,
  // Small allowance for browser shaping and subpixel rounding differences.
  fitAllowance: 1,
} as const;
