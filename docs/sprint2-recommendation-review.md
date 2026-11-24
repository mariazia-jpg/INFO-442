# Sprint 2: Abel's recommendation and tutorial review

Reviewed November 23, 2026 against main commit `569517e` and issues #17–#20.

## Changes

- #19: Show the project description as well as transformation instructions.
- #19: Add Try again for a failed detail-page data request; preserve the project URL.
- #17, #18, #20: Existing cards, navigation, and empty-result behavior were retained.
  Added regression coverage for every displayed card, the missing description,
  retrying a failed load, and recovering from empty results by editing preferences.
- README: Document implemented accessibility, security, and responsive behavior in
  the optional Quality section.

## Verification

- All 49 unit tests passed. Production and test builds passed.
- Abel ran `npx playwright install chromium` and `npm run test:e2e` in his normal
  Mac terminal. The supplied November 23 output reports 103 tests across 22 suites:
  103 passed, zero failures, cancellations, or skips (110.45 seconds). This includes
  all new recommendation/tutorial regression tests, responsive layouts, keyboard
  access, image alt text, and the complete Home-to-Tutorial flow.
- Manual browser check on the local test build: created a disposable account and
  selected Advanced plus all three tools through the interface. A temporary,
  untracked fixture supplied the clothing upload because the browser automation's
  file chooser did not respond. Actual image upload/recognition was not verified.
- #17: All four matching T-shirt cards displayed images, titles, descriptions,
  difficulty, time, tools, and individually named View Project links.
- #18: Opened each of those four cards, checked the matching detail heading and
  information, and returned to the same recommendations. Detail refresh worked.
- #19: Description, transformation, materials, difficulty, time, and tools appeared.
  Open Tutorial opened the No-Sew T-Shirt Tote resource in a new tab. Simulating a
  missing project-data response in the disposable test build showed an error;
  restoring the data and selecting Try again loaded the same selected project.
  An unknown project ID showed Project not found with Back to Ideas.
- #19: All 12 URLs marked available returned HTTP 200 on this date. This checks
  availability, not instructional accuracy or future uptime. The two URLs already
  marked unavailable still returned 404. The Jeans-to-Denim Skirt detail page
  displayed its unavailable warning, disabled link action, materials, and Back.
- #20: Selecting only Sewing Machine produced no cards and a clear no-results
  message. Change Preferences opened preferences; adding Scissors restored the
  expected three matching T-shirt cards without changing the clothing category.
- Cards and unavailable-tutorial detail layouts had zero horizontal overflow at
  viewport widths 360, 768, and 1440px. A 360px tutorial screenshot was inspected.

## Limits and release steps

The agent execution sandbox blocked Chromium, but Abel resolved this verification
blocker by running the full suite in his normal terminal; all 103 browser tests
passed. Manual checks above are separate evidence. Tests mock recognition and
external tutorial responses, so their success does not verify the real classifier
or guarantee third-party tutorial uptime. CI should pass on the submitted branch.
Real Safari/iPhone testing and real image recognition remain team-level checks.

Release checks: review the pull request and CI results, then verify the same flow
on GitHub Pages after merging. Close #17–#20 only after their acceptance criteria
are confirmed in the deployed version. The checks above describe the local version
at review time; they do not guarantee zero bugs or a particular grade.
