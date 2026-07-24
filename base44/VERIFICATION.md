# Base44 lead integration verification

Verified from the repository on 2026-07-24:

- The production site uses the public functions base URL already present in `index.html`:
  `https://app.base44.com/api/apps/6a2ff9d8f0f6cef4ef4c3d65/functions`.
- The contact form posts JSON to `POST /submitLead`.
- The request fields match `Lead.schema.json`: `name`, `phone`, `email`,
  `project`, `rooms`, `budget`, `timeline`, `message`, and `source`.
- `name` and `phone` are required in the browser, the local schema, and the
  backend function.
- `submitLead.js` returns `201` after creating a Lead, `400` for missing
  required fields, `405` for unsupported methods, and `500` on an exception.
- CORS explicitly allows `POST`, `OPTIONS`, `Content-Type`, and `Accept`.
- The form reports loading, success, and failure states. A failed submission
  is not converted into a false success or silently discarded.
- A honeypot field and a 30-second browser-side submission throttle are active.
- No Turnstile configuration or site key exists in the repository, so
  Turnstile was not added and no secret was invented.

Not verified without Base44 access or an authorized production test:

- Whether the checked-in `Lead.schema.json` exactly matches the currently
  deployed entity schema.
- Whether the checked-in `submitLead.js` is the exact version currently
  deployed for app `6a2ff9d8f0f6cef4ef4c3d65`.
- Whether the service-role create operation and post-create email automations
  currently succeed in production.
- Whether the public endpoint's deployed CORS settings match the checked-in
  function.

The repository is not a Base44 CLI-linked project (`base44/config.jsonc` is
absent), and the current environment could not authenticate through the Base44
CLI. No production Lead was created during verification.
