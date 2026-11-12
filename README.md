# INFO-442 — ReWear
Rodas G - PM

Jonathan H - Product Design

Abel Z - Developer 

Kenneth P - Developer

Maria Z - Developer 

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

**Project data (`public/data/projects.json`).** Each project has the fields from the
data model (`clothingType`, `projectType`, `category`, `difficulty`,
`requiredTools`, `estimatedTime`, `tutorialUrl`, `tutorialAvailable`, ...). Every
tutorial link was checked in November 2026. Set `tutorialAvailable` to `false` if a
link dies, and the details page shows the unavailable banner. `npm test` checks every
record has valid values.

**Filtering rules (`src/lib/recommend.js`).** R4 uses the confirmed clothing type
only. R5 shows difficulty at or below the user's level. R6 requires every tool the
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

- **Recognition with real photos:** MobileNet accuracy on a few photos of each clothing type.
- **HEIC conversion in Chrome:** upload a real iPhone `.heic` photo.
- **Performance:** NF-P1 (PageSpeed Insights), NF-P2 (WebPageTest), NF-P3 (recognition under 10 s), NF-P4, NF-P5 (Lighthouse).
- **Accessibility:** NF-A1 (WebAIM contrast), NF-A3 (VoiceOver and NVDA), NF-A5 (alerts announced), NF-A8 (W3C validator), NF-A9 (Lighthouse).
- **Browsers:** NF-A7, the full flow in Chrome, Safari (including iOS) and Edge.
