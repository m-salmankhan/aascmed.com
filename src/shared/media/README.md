# Shared media

`social-cards.mjs` renders branded Open Graph images for Gatsby and Astro. Its public types are defined once in `social-cards.d.mts`; `assets/` contains the font, font license and logo it uses. Neither the renderer nor these assets belong to a framework-specific directory while both builds consume them.

The renderer is JavaScript so Gatsby’s Node 20 runtime can import it directly. After Gatsby retires, [WEB-46](https://kaneo.intahnet.co.uk/aascmed/task/WEB-46/remove-obsolete-gatsby-code-and-preview-infrastructure-after-observation) tracks moving the surviving renderer and assets into the final Astro source layout, converting the renderer to TypeScript and removing its separate declaration file. The Gatsby adapter is deleted at that point.
