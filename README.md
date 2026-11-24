# INFO-442 — ReWear
Rodas G - PM

Jonathan H - Product Design

Abel Z - Developer 

Kenneth P - Developer

Maria Z - Developer 

**Live site:** <https://mariazia-jpg.github.io/INFO-442/>

[Mission Statement](https://app.notion.com/p/Team-mission-statement-3f3713d1a2c380acb462c79259ba3d06?source=copy_link)

[Performance Matrix](https://app.notion.com/p/Team-Performance-Matrix-3f5713d1a2c380fa8980f7f61d087636?source=copy_link)

---

ReWear is a mobile-first web app that helps Gen Z upcycle clothes they already own.
Upload a photo of a T-shirt, top, pants, or skirt; confirm what it is; and get
upcycling projects that match your sewing experience and the tools you have, each
linked to a free tutorial.

The requirements, design specs and data model live in the team Notion
(INFO 442 → Requirements / Design & Specifications / Data Modeling). Test names
and code comments use the requirement IDs from there (N1, H3, U14, R6, ...).

## Getting started

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/mariazia-jpg/INFO-442.git
cd INFO-442
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). No API keys or
accounts are needed. To try it on your phone, run `npm run dev -- --host` and open
the network address on a phone on the same Wi-Fi.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (filtering rules, validation, project data) |
| `npm run test:e2e` | Build a test version and run the browser tests against it |
| `npm run test:all` | Both |

The first time you run the browser tests, install Chromium for Playwright:
`npx playwright install chromium`.

## How the app is put together

```
public/
  data/projects.json      Upcycling projects (edit this to add or change projects)
  images/projects/        Project illustrations (original SVGs)
  images/styles/          Style-question images
src/
  main.jsx, App.jsx       Entry point and routes
  components/             Layout, NavBar, route guards, shared UI (ActionBar, ProgressTracker, Alert)
  pages/                  One file per page in the design spec
  services/               Accounts, preferences, current upload, image processing, recognition, project data
  data/tools.js           Shared tool IDs and display names
  lib/                    Pure logic with no browser APIs (filtering, validation, label mapping)
tests/
  unit/                   node:test unit tests
  e2e/                    Playwright browser tests, named by requirement ID
```

| Route | Page | Needs |
| --- | --- | --- |
| `/` | Home | — |
| `/signup`, `/login` | Sign Up, Log In | — |
| `/questions/1` … `/questions/5` | Style Questions (`?edit=1` when opened from Preferences) | account |
| `/profile-complete` | Profile Complete | account |
| `/upload` | Clothing Upload (+ loading and processing-error states) | account |
| `/identify` | Clothing Recognition | account, photo this session |
| `/preferences` | Preferences | account, confirmed type |
| `/ideas` | Recommendations | account, confirmed type |
| `/ideas/:projectId` | Tutorial Details | account, confirmed type |
| anything else | Page not found | — |

### Things the team may want to change

**Accounts (`src/services/accounts.js`).** For the MVP, accounts and saved
preferences are stored in the browser's localStorage, so the app runs with no
backend. Passwords are stored only as a salted SHA-256 hash. The limitation: an
account only exists in the browser where it was created. To move to Firebase Auth or
Supabase, replace the bodies of `signUp`, `logIn`, `logOut` and `getCurrentUser`
(and `loadPreferences` / `savePreferences` in `preferences.js`), keeping the same
return values and error codes. No page reads storage directly.

**Clothing recognition (`src/services/recognition.js`).** The default recognizer is
Gemini (`gemini-3.5-flash-lite`) called through Firebase AI Logic (`src/services/gemini.js`),
so no API key is ever in the site's code. Gemini must answer with one of
`tshirt | top | pants | skirt | unknown` (structured output). Requests carry a Firebase
App Check token (reCAPTCHA) so other sites can't use the project's quota. The Firebase
web config and reCAPTCHA site key are in `src/services/firebaseConfig.js`; both are
public identifiers. Every recognizer sits behind `recognizeClothing(imageBase64) →
{ category }`. If recognition fails, times out after 8 seconds, returns something
malformed, or answers `unknown`, the user picks the type manually. MobileNet (in-browser,
labels mapped in `src/lib/clothingLabels.js`) is still available with
`VITE_RECOGNIZER=mobilenet`, and `VITE_RECOGNIZER=stub` with `VITE_STUB_RESULT`
returns a fixed answer or an error for testing screens without Firebase (see
`.env.example`). The Firebase SDK downloads only after a photo is chosen.

**HEIC photos.** Safari shows HEIC natively. Chrome and Edge can't, so the app
converts HEIC to JPEG in the browser with `heic2any`, loaded only when needed.

**Project data (`public/data/projects.json`).** Project records contain the display
information, clothing type, difficulty, tutorial URL, and availability flag.
`projectTools` holds separate `{ projectId, toolId }` rows referencing the shared
Tools catalogue in `src/data/tools.js`. `projectsWithTools()` joins these records
for the cards and filters. This follows the data-model feedback without adding a
new backend. The User account records have no upload or project ID fields.

**User tools.** Tool selections are stored separately from preferences as
`{ userId, toolId }` rows under `rewear:user-tools:<userId>`. The preference service
returns names for the existing screens and IDs for filtering. Older saved tool
names still load; saving preferences converts them into the separate rows.

**Tutorial availability.** Set `tutorialAvailable` to `false` if a link stops
working; the details page shows a banner and disables Open Tutorial. On November
11, 2026, the Jeans-to-Denim Skirt and Tiered Skirt to Off-Shoulder Top links
returned 404 and were marked unavailable. On November 23 they were replaced with
working tutorials from Cut Out + Keep and Fashion Wanderer. The skirt project was
renamed Skirt to Off-Shoulder Top to match its new tutorial. Every project now
links to a working tutorial. URL syntax checks in `npm test` do not replace
checking the external sites manually.

**Filtering rules (`src/lib/recommend.js`).** R4 uses the confirmed clothing type
only. R5 shows difficulty at or below the user's level. R6 compares shared tool IDs and requires every tool the
project needs to be one the user selected. Results are ordered easiest first.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to **GitHub Pages** on every
push to `main`, after the unit tests pass. One-time setup by the repo owner:
**Settings → Pages → Build and deployment → Source: GitHub Actions**. The live site
is then at `https://mariazia-jpg.github.io/INFO-442/`, served over HTTPS.

`.github/workflows/tests.yml` runs the unit and browser tests on every push and
pull request.

## Testing and requirement coverage

The browser tests in `tests/e2e/` walk through the app in Chromium and are named
after the requirements they check:

| Area | Requirements | File |
| --- | --- | --- |
| Navigation bar, Home, page not found | N1–N10, H1–H5, E1–E2 | `nav-home.test.js` |
| Sign Up, Log In, access control | S1–S12, L1–L8, A1–A3 | `accounts.test.js` |
| Style questions, Profile Complete | Q1–Q21, PC1–PC5 | `questions.test.js` |
| Progress tracker, Upload, Recognition | PT1–PT5, U1–U22, C1–C11 | `upload-recognition.test.js` |
| Preferences, Recommendations, Tutorial Details | P1–P9, R1–R18, T1–T12 | `preferences-ideas.test.js` |
| Full workflow | Home → tutorial | `flow.test.js` |
| Non-functional checks | NF-A2 (keyboard), NF-A4 (alt text), NF-A6 (360/768/1440 px), NF-A10 (24 px targets) | `quality.test.js` |

The browser tests use a test build (`VITE_RECOGNIZER=filename`) that reads the
clothing type from the test photo's file name, so results don't depend on the model.

Still to check by hand on the deployed site, with the tools the requirements name:

- **Recognition with real photos:** Gemini accuracy on a few photos of each clothing type.
- **HEIC conversion in Chrome:** upload a real iPhone `.heic` photo.
- **Performance:** NF-P1 (PageSpeed Insights), NF-P2 (WebPageTest), NF-P3 (recognition under 10 s), NF-P4, NF-P5 (Lighthouse).
- **Accessibility:** NF-A1 (WebAIM contrast), NF-A3 (VoiceOver and NVDA), NF-A5 (alerts announced), NF-A8 (W3C validator), NF-A9 (Lighthouse).
- **Browsers:** NF-A7, the full flow in Chrome, Safari (including iOS) and Edge.

## Quality

### Accessibility

- **Semantic HTML.** The page declares `lang="en"`. Each page has one `<h1>`, landmark
  elements (`<header>`, `<nav>`, `<main>`), and ordered lists for the "How it works"
  steps and the progress tracker. Every page sets its own browser tab title
  (`usePageTitle` in `src/components/ui.jsx`).
- **Text alternatives.** Project and style images have descriptive `alt` text.
  Decorative icons use `aria-hidden="true"`, and loading spinners have an accessible
  label. Each View Project link includes the project title in its accessible name,
  so a screen reader says "View Project: No-Sew T-Shirt Tote", not just "View Project".
- **Forms.** Every input has a `<label>`. The style questions use native radio buttons
  and checkboxes inside a `<fieldset>` named by the question. Sign Up and Log In mark
  invalid fields with `aria-invalid` and connect them to the error with
  `aria-describedby`. They also set `autocomplete` so password managers work.
- **Announcements.** Errors use `role="alert"` and notices use `role="status"`
  (`Alert` in `ui.jsx`), so screen readers announce them when they appear. The menu
  button reports `aria-expanded`, the progress tracker marks the current step with
  `aria-current="step"`, and the Open Tutorial link says that it opens a new tab.
- **Keyboard.** The upload-to-recommendations flow works with the keyboard alone
  (tested in `quality.test.js`). There is a Skip to content link, a visible `:focus-visible`
  outline on every control, and Escape closes the menu. After each page change,
  focus moves to the new page's heading so keyboard and screen reader users know
  where they are (`Layout.jsx`).
- **Contrast, size and motion.** Text colors are chosen for at least 4.5:1 contrast,
  and the ratios for the gray, error and disabled text are noted in `styles.css`. Main buttons are 48 px
  tall, and a test checks that every control is at least 24 × 24 px. The spinner
  slows down when the device asks for reduced motion (`prefers-reduced-motion`).

### Security and privacy

- **HTTPS.** The site is served only over HTTPS by GitHub Pages.
- **No secrets in the code.** Recognition calls Gemini through Firebase AI Logic, so
  there is no API key in the site's code. Firebase App Check with reCAPTCHA v3
  (`src/services/gemini.js`) stops other sites from using the project's quota.
- **Passwords.** The MVP account service stores a salted SHA-256 hash of each
  password, never the password itself. Sign Up requires a valid email and a password
  of at least 8 characters. These accounts live in the browser's localStorage, so
  they are a prototype, not a replacement for server-side authentication.
- **Upload validation.** Only JPG, PNG and HEIC files up to 10 MB are accepted. The
  file extension and the MIME type have to agree (`validatePhoto` in
  `src/lib/validation.js`).
- **Photo privacy.** Each photo is redrawn on a canvas and saved again as a JPEG of
  at most 1024 px. This removes EXIF metadata such as GPS location before the photo
  goes anywhere (tested in `image-processing.test.js`). The photo is kept in
  sessionStorage only, so it is gone when the tab closes.
- **XSS and links.** React escapes all text it shows, and the app never uses
  `dangerouslySetInnerHTML`. External tutorial links use `target="_blank"` with
  `rel="noopener noreferrer"`, so the tutorial site can't control the ReWear tab.
- **Access control.** Route guards (`src/components/guards.jsx`) send logged-out
  users to Log In. They also stop anyone from reaching Recognition, Preferences or
  Ideas without first uploading a photo and confirming its type.

### Responsivity

- **Mobile first.** The viewport meta tag is set, and the base styles are a single
  column for phones. One `min-width: 768px` media query widens the margins, enlarges
  the headings, and puts the style-question cards in three columns.
- **Fluid content.** Images use `max-width: 100%`. Tags and tool lists wrap. Content
  is capped at a readable width on large screens.
- **Thumb-friendly actions.** Each page's main button sits in an action bar pinned to
  the bottom of the screen. It leaves room for the iPhone home indicator with
  `env(safe-area-inset-bottom)`.
- **Tested widths.** A browser test checks that no page scrolls sideways at 360, 768
  and 1440 px. These checks don't replace testing on real phones.

### Error recovery

- If no projects match, the page says so and offers Change Preferences.
- If project data fails to load, Try again requests it again. A missing project
  offers a way back to Ideas.
- If recognition fails, times out or isn't sure, the user picks the clothing type.
- A tutorial whose link is known to be broken shows a message and a disabled
  Open Tutorial button.

See [recommendation and tutorial verification](docs/sprint2-recommendation-review.md)
for the scope, results, and remaining verification steps.
