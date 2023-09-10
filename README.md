<div style="text-align: center">
   <div style="width: 10em; height: auto; margin: 1rem auto;">
      <img src="https://aascmed.com/assets/favicon/favicon.svg" alt="Allergy, Asthma and Sinus Centers Logo" width="50%" align="center" />
   </div>
  
  # Allergy, Asthma and Sinus Centers Website
  [![Netlify Status](https://api.netlify.com/api/v1/badges/8aff015c-4beb-4c18-968b-e8bb93ab42b5/deploy-status)](https://app.netlify.com/sites/aascmed/deploys)
</div>

## Development Instructions

Coming soon&trade;

## Adding / Updating Site Content

Open the admin panel by going to the link in the website footer, or by adding `/admin` to the end of the root URL.

#### Homepage
1. In the left-hand-side sidebar, select "pages" and then from the main page, select "Home Page".
2. Update all necessary fields:
   - **Meta Description:** The page's description, to go in the description meta tags and OpenGraph tags.
   - **Hero**
     - **Heading**: the display text for the hero (nb: this will not be a real `<h1>` tag; the `h1` tag on the homepage will be the site title as defined in `gatsby-config.ts`).
     - **Text**: the body copy for the hero
   - **Conditions**, **Service Updates**, **Providers** and **Practices** sections 
     - **Heading**: Heading text for the section
     - **Text**: the body copy for the section
   - **Patient Feedback section**
     - **Rating:** Rating (0-1). This should be the average rating according to a source (e.g. average Google reviews rating)
     - **Source URL:** URL to where the rating was taken from
     - **Access date:** The month & year the rating was checked
   - **Contact Section**
     - **Heading**: The heading for the contact section
     - **Text**: The text displayed in the green section next to the form.
3. Click "Publish" in the top right to save these changes.

## Pages
#### Index / Archive Pages
Index (or archive) pages are pages which list items of a particular type (e.g. clinics, conditions, providers, etc.) They all have the same input fields:

1. In the left-hand-side sidebar, select "pages" and then from the main page, select the page you wish to edit.
2. Update all necessary fields:
   - **Meta Description:** The description for the `<meta name=description>` tag, as well as opengraph and twitter cards.
   - **Heading**: The page heading
   - **Text**: The page text
3. Click "Publish" in the top right to save these changes.

#### Contact Page
1. In the left-hand-side sidebar, select "pages" and then from the main page, select "Contact Page"
2. Update all necessary fields:
   - **Meta Description:** The description for the `<meta name=description>` tag, as well as opengraph and twitter cards.
   - **Heading**: The page heading
   - **Text**: The page text
3. Click "Publish" in the top right to save these changes.

#### Privacy Policy
1. In the left-hand-side sidebar, select "pages" and then from the main page, select "Privacy"
2. Update all necessary fields:
   - **Meta Description:** The description for the `<meta name=description>` tag, as well as opengraph and twitter cards.
   - **Heading**: The page heading
   - **Text**: The page text
3. Click "Publish" in the top right to save these changes.

## Collections

### Conditions
1. In the left-hand-side sidebar, select "Conditions" and then from the main page, select a conditoin to edit, or click on "New Conditions".
2. Update all necessary fields:
   -  **Title**: Page heading
   -  **Description**: Meta and opengraph/twitter descriptions
   -  **Thumbnail**: The image used for the thumbnail and for social media previews.
   -  **Body**: Page content. <br/> **Important:** This section allows you to insert the shortcodes `<ButtonList />` and `<ContactBanner />`. The first of these has a *"Skip to FAQ"* button, which assumes that you have a title "Frequently Asked Questions". **This will not work if you title the section anything else.**
3. Click "Publish" in the top right to save these changes.

### Service Updates

1. In the left-hand-side sidebar, select "Service Updates" and then from the main page, select a post to edit, or click on "New Service Updates".
2. Update all necessary fields:
   -  **Title**: Page heading
   -  **Description**: Meta and opengraph/twitter descriptions; will also be shown on the archive view
   -  **Body**: Page content.
3. Click "Publish" in the top right to save these changes.


### Providers

1. In the left-hand-side sidebar, select "Service Updates" and then from the main page, select a provider to edit, or click on "New Providers".
2. Update all necessary fields:
   -  **Title**: Filename; set this to the provider name
   -  **Name**:
      -  **Full Name:** Full name of provider
      -  **Degree**: Full text version of their degree (or other certifications); e.g. Doctor of Medicine
      -  **Degree Abberviation** e.g. MD, DO, PA-C
      -  **Title**: Honorific Title (e.g. Dr. )
   -  **Image**: An image of the Doctors
   -  **Featured Review**: A review/testimonial about this provider form a patient.
   -  **Description**: Meta and opengraph/twitter descriptions; will also be shown on the archive view
   -  **Body**: Page content. <br/> **Important:** This section allows you to insert the shortcode `<ContactBanner />`.
3. Click "Publish" in the top right to save these changes.

### Reviews

These are displayed in a carousel on the homepage.

1. In the left-hand-side sidebar, select "Reviews" and then from the main page, select a post to edit, or click on "New Reviews".
2. Update all necessary fields:
   -  **Title**: Name of reviewer
   -  **Stars**: How many stars (out of 5)
   -  **Review Source:**
      -  **URL**: Direct link to review
      -  **Name**: Name of review website
   -  **Body**: Review Content.
3. Click "Publish" in the top right to save these changes.


### Clinics / Practices

1. In the left-hand-side sidebar, select "Clinics" and then from the main page, select a post to edit, or click on "New Clinics".
2. Update all necessary fields:
   -  **Title**: Clinic Name
   -  **Description**: Meta and opengraph/twitter descriptions; will also be shown on the archive view
   -  **Opening Times**: Repeater field; add multiple days and specify for each:
      -  **Day**: (Name of the day of week; e.g. "Monday")
      -  **Hours**: Opening Hours
      -  **Notes**: Optional Notes 
   -  **Shout Times**: Repeater field; add multiple days and specify for each:
      -  **Day**: (Name of the day of week; e.g. "Monday")
      -  **Hours**: Shot Hours
      -  **Notes**: Optional Notes 
   -  **Address**: Address of clinic
   -  **Phone**: Clinic Phone number
   -  **Fax**: Clinic Fax number
   -  **Latitude**: Clinic Geographical Latitude (right click on google maps to get this)
   -  **Longitude**: Clinic Geographical Longitude (right click on google maps to get this)
   -  **Google Maps Place ID**: Use [this tool](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder) to find the place ID
   -  **Body**: Text appearing above mapbox map.
3. Click "Publish" in the top right to save these changes.

