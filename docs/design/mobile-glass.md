# Mobile authentication glass

The mobile auth background uses six CSS gradient light blobs: two larger cobalt pools and four smaller blue/cyan glints. The center stays near black behind the auth form.

The previous scene used three colored rectangular strips and an additive centerline tube per strip. The mobile treatment is intentionally simpler: blurred gradients drift independently around the viewport edges, with a dark radial veil protecting the content. The desktop/iPad pyramid remains unchanged.

The asset is requested only at widths up to 680px. An overlay protects the central content; a bottom mask fades into the page on long forms. Reduced motion leaves the complete still frame. The desktop/iPad pyramid and authentication handlers are unchanged.

## Generation prompt

Use case: stylized-concept. Create a production background asset for Planomy mobile authentication, portrait 1024x1792. Use the user's attached dark iridescent glass image as the primary artistic reference for material quality. A SINGLE continuous sculptural sheet of almost-black polished glass with layered folded curvature, dramatically cropped off the top-left and right/bottom edges. Photorealistic luxury product render. Narrow brilliant lavender, violet, cobalt and tiny cyan reflections, occasional near-white specular peaks, complex smooth reflections fading into black, deep dark internal folds, no uniformly colored material. COMPOSITION: generous pure near-black negative space across central 80 percent of image width from 15 to 85 percent height for a login form. Glass enters upper left corner, curves out of view across the top, and reappears as an elegant cropped fold along the extreme right edge and bottom-right corner. Keep luminous features mostly within outer 12 percent of frame; bottom 15 percent may have more sculptural interest. Asymmetric, restrained, dimensional; most surface is hidden in shadow. No disconnected tubes, no drawn outline stripes, no neon bands, no blue plastic, no text, no UI, no logos. Save the image asset to disk and return the local path for project integration.

### Blue color edit

Use case: style-transfer. Asset type: Planomy mobile authentication background. Input image 1 is the edit target. Change only the illumination color palette: replace the dominant purple and magenta reflections with deep cobalt blue, electric sapphire, icy blue, and restrained cyan. Retain only a tiny trace of indigo in the deepest reflections. Keep the exact portrait dimensions, composition, crop, black negative space, glass geometry, highlight positions, photorealistic polished material, and darkness unchanged. Keep the glass nearly black. Preserve narrow near-white specular highlights. Do not add objects, text, logos, UI, new folds, or brighter fill. Avoid purple-dominant or magenta lighting.

## Validation

- TypeScript: `pnpm exec tsc --noEmit`.
- ESLint: `pnpm exec eslint src/components/auth/glass-background.tsx src/app/auth/page.tsx`.
- Browser: mobile initial screen and expanded email sign-up; 768px tablet retains pyramid and two-column layout.
- Authentication submission was not exercised; this change does not modify its logic.
