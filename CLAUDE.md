# Claude Code Instructions

## Project

Repository: `AvivShelly48/site`

Primary working branch: `improve-site-seo-conversion`

Default branch: `main`

This is a Hebrew real-estate website. Preserve the current visual identity, project ordering, apartment-section position, and overall premium presentation unless a task explicitly requires a visual change.

## Working rules

1. Work only on `improve-site-seo-conversion` until the changes are reviewed.
2. Do not push directly to `main`.
3. Make small, focused commits grouped by subject: forms, SEO, projects, UX, performance, analytics.
4. Before changing behavior, inspect the existing implementation in `index.html`, JavaScript assets, CSS, sitemap, robots files, and any existing Base44 integration.
5. Do not invent credentials, API URLs, social URLs, phone numbers, analytics IDs, project facts, or legal text.
6. Preserve the existing position/order of the apartments section.
7. Keep Hebrew RTL behavior correct on desktop and mobile.
8. Avoid heavy dependencies unless clearly justified.
9. Validate generated HTML, structured data, internal links, and forms before finishing.
10. Finish with a Pull Request to `main` containing a clear summary and test checklist.

## Approved implementation scope

### Critical fixes

- Remove any SAMPLE/demo inventory fallback from production behavior.
- Correct misleading or inaccurate helper text in the contact form.
- Inspect and verify the Base44 lead submission flow end to end.
  - Confirm the endpoint/function currently used by the site.
  - Confirm submitted fields match the Base44 `Lead` entity schema.
  - Add clear success and error states.
  - Do not silently discard failed submissions.
  - If a real external submission cannot be safely tested, document exactly what remains unverified.
- Remove visible placeholders such as `[שנה]` and replace them only with verified content. If verified content is unavailable, remove the placeholder cleanly rather than inventing data.
- Add client-side validation and accessible inline error messages.
- Add spam protection using a honeypot and a safe rate-limit/throttling approach. Add Cloudflare Turnstile only if the required site key/configuration already exists or can be added without exposing secrets.

### Contact and conversion

- Add a floating WhatsApp CTA using the verified business phone number already present in the repository.
- Add Facebook and LinkedIn links in the footer and relevant schema.
- Until a verified Facebook URL is supplied, it is acceptable for the Facebook link to temporarily use the existing Instagram URL, but clearly mark this in code with a TODO comment.
- Standardize CTA wording across the website. Use three consistent actions where contextually appropriate:
  - יצירת קשר
  - לתיאום פגישה
  - לפרטים נוספים
- Add analytics events for meaningful conversion actions only if an analytics implementation already exists. Do not invent an analytics provider or ID.

### Project pages and SEO

- Create a standalone, crawlable URL/page for every project represented in the project data.
- Each project page should include, when data exists:
  - project name
  - location
  - status
  - description
  - gallery
  - specifications/highlights
  - contact CTA
  - breadcrumb navigation
- Preserve facts from the existing project data. Do not add unverified claims.
- Add all project URLs to the sitemap.
- Add per-page:
  - unique title and meta description
  - canonical URL
  - Open Graph tags
  - Twitter Card tags
  - BreadcrumbList schema
  - appropriate Project/RealEstateListing/Place-related schema based on the actual content
- Keep the organization schema accurate and include verified social links.
- Ensure all internal project navigation uses real `<a href>` links instead of clickable `<span>`, `div`, keyboard-only cards, or JavaScript-only navigation.

### UX and mobile

- Shorten long entry/hero animations on mobile so content becomes usable quickly.
- Do not remove the premium feel; reduce delay and motion duration rather than eliminating all motion.
- Make legacy project gallery images display in color on mobile.
- Keep desktop behavior unchanged unless needed for consistency or accessibility.
- Ensure focus states and keyboard navigation are visible and functional.

### Performance

- Add native lazy loading to below-the-fold images where appropriate.
- Do not lazy-load the main LCP/hero image.
- Preload only genuinely critical assets.
- Reduce layout shifts by defining image dimensions/aspect ratios.
- Avoid duplicate image downloads and unnecessary JavaScript.
- Check for unused third-party scripts before adding anything new.

## Known code observations

- The main site implementation is concentrated in `index.html` and JavaScript assets.
- Project cards were previously rendered as `<article class="pcard" tabindex="0">` with JavaScript lightbox handlers. Replace navigational behavior with real links while retaining gallery/lightbox behavior where useful.
- The repository includes project data in JavaScript. Reuse one source of truth rather than duplicating project facts manually across many files where possible.

## Base44 notes

The connected Base44 application previously exposed a `Lead` entity with fields including:

- `name`
- `phone`
- `email`
- `interest`
- `project`
- `rooms`
- `budget`
- `timeline`
- `message`
- `source`

Treat this as guidance only. Inspect the current repository and current Base44 configuration before relying on it, because the schema or endpoint may have changed.

Never commit secrets, tokens, private API keys, service-account files, or privileged Base44 credentials.

## Suggested commit sequence

1. `fix(forms): validate lead form and remove demo fallback`
2. `feat(contact): add whatsapp and social links`
3. `feat(projects): add crawlable project pages`
4. `feat(seo): add metadata schema and sitemap entries`
5. `fix(ux): improve links accessibility and mobile motion`
6. `perf: optimize image loading and critical assets`
7. `test: document verification checklist`

## Verification checklist

Before opening the Pull Request:

- No visible placeholder text remains.
- No SAMPLE/demo inventory is shown in production.
- All project cards have valid crawlable URLs.
- Every project URL returns a valid page.
- Sitemap contains all canonical project URLs.
- Canonical, OG and Twitter metadata are correct per page.
- Structured data parses without syntax errors.
- Contact form rejects invalid required fields accessibly.
- Contact form reports submission failure rather than showing false success.
- WhatsApp and social links resolve correctly.
- No secrets are committed.
- Mobile hero animation is materially shorter.
- Legacy gallery images appear in color on mobile.
- The apartments section remains in its current location/order.
- Keyboard navigation and focus states work.
- No major console errors or broken internal links remain.

## Pull Request expectations

Open a Pull Request from `improve-site-seo-conversion` into `main` with:

- concise summary of implemented changes
- list of files changed
- screenshots or preview links if available
- exact Base44 verification status
- test results
- remaining TODOs requiring owner-provided values or credentials
