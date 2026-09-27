# Progress — Local Lead Intelligence

## Completed (Phase 1)

- Next.js 14 + TypeScript + Tailwind app scaffold, App Router
- Full Prisma schema: User, Account, Session, VerificationToken (NextAuth),
  Search, SearchResult, Business, BusinessLocation, Website, AuditRun,
  AuditFinding, Score, Contact, Proposal, Note — with relations, indexes,
  unique constraints, and a `DataConfidence` enum (VERIFIED / OBSERVED /
  INFERRED / NOT_VERIFIED) threaded through every fact-bearing model
- Provider interfaces: BusinessSearchProvider, BusinessDetailsProvider,
  ReviewProvider, ContactDiscoveryProvider (composed as
  BusinessDataProvider), WebsiteAuditProvider, AiProposalProvider
- Mock implementations of all of the above, backed by a fixed demo dataset
  (`src/lib/data/mock-leads.ts`) — the app runs with zero external
  credentials
- Deterministic scoring engine (`src/lib/scoring/calculate.ts`) —
  Profile / Website SEO / Technical SEO / Local SEO / Content / Conversion
  / Opportunity scores, each with a structured `explanation` showing which
  signals produced the number. Explicitly NOT review-count-driven; see
  `tests/scoring.test.ts`
- Dashboard shell with sidebar nav (Dashboard, Search Leads, Leads, Audits,
  Proposals, Follow-ups, Settings)
- Dashboard page: 5 pipeline stats + lead search box + empty state
- Search page: keyword/location/radius search against the mock provider,
  results table, validation error state
- Leads list page, Lead detail page (`/leads/[id]`) with all spec'd
  sections: Business Information, Profile Signals, Website Information,
  Technical Issues, Local SEO Audit, Content Opportunities, Conversion
  Issues, Opportunity Score (with "why" breakdown), Contact Information,
  Recommended Services, AI Proposal
- Audits and Proposals list pages (read from the same mock pipeline)
- Follow-ups and Settings pages (Follow-ups is an intentional Phase 6
  placeholder; Settings shows active provider config)
- AI proposal generation: deterministic (non-LLM) in Phase 1, strictly
  composed from real findings, cites `findingId` on every observation,
  and explicitly outputs "NOT VERIFIED" when no findings exist yet
  instead of inventing pain points
- Sending (email/WhatsApp) is disabled in the UI by design — buttons are
  present but non-functional, per the "no automatic sending" requirement
- API routes: `POST /api/search`, `GET /api/leads` (Zod-validated)
- NextAuth config (credentials + optional Google OAuth), Prisma adapter
- Zod validation schemas for search input, notes, proposal edits, status
  updates
- Design tokens (color/type/layout) — see ARCHITECTURE.md — chosen
  deliberately against the spec's subject matter rather than defaulted
- Test suite: 15 tests across scoring, mock provider, validation, and the
  lead composition layer — all passing
- ESLint clean, `tsc --noEmit` clean, production build succeeds for every
  route except the one blocked by the sandbox's network policy (see
  Blocked below)
- Seed script (`prisma/seed.ts`) that loads the same mock dataset into a
  real Postgres DB via Prisma, for when persistence is wired up

## In Progress

- Nothing left mid-implementation — Phase 1 scope is fully built.

## Blocked

- **Prisma client generation** (`npx prisma generate`) cannot complete in
  this sandbox: it needs to download engine binaries from
  `binaries.prisma.sh`, which is not in this container's network
  allowlist. Effect: `PrismaClient` is an untyped stub here, and the one
  route that instantiates it (`/api/auth/[...nextauth]`) fails a
  production build in this sandbox specifically. Every other route
  (13/13) builds and pre-renders cleanly. This will resolve itself the
  moment `npm install && npx prisma generate` runs on a machine with
  normal internet access — nothing in the schema or code needs to change.
- **No live Postgres instance** was available to actually run
  `prisma migrate dev` or the seed script against. The schema has not
  been mechanically validated by Prisma's own CLI (`prisma validate`) for
  the same network reason above. I wrote and reviewed it carefully, but
  "the CLI confirmed it's valid" is not something I can claim here.
- **No real business-data or AI provider was wired in or tested** — Phase
  1 explicitly scopes this out. The mock providers stand in.

## Completed (Phase 2)

- `GooglePlacesProvider` — real `BusinessDataProvider` implementation
  against the Places API (New): Text Search + Place Details, full
  normalization (`normalizePlace`), honest `NOT_VERIFIED`/`VERIFIED`
  tagging per field returned. **Not exercised against the live API** —
  this sandbox's network allowlist doesn't include `googleapis.com`. Unit
  tests cover normalization against a fixture response only; test it
  against a real `GOOGLE_PLACES_API_KEY` before depending on it.
- Provider factory (`lib/providers/factory.ts`) — `BUSINESS_DATA_PROVIDER`
  env var switches between `mock` and `google_places`; nothing else in
  the app changed to support this
- Real radius filtering: `lib/geo/distance.ts` (haversine, pure, unit
  tested) + `Geocoder` interface with a `MockGeocoder` covering the demo
  dataset's cities. `searchLeads()` now geocodes the searched location
  and drops businesses outside the radius by actual lat/lon distance —
  falls back to keyword/location text matching only, without ever
  fabricating a distance, when the location can't be geocoded
- Pagination: `leadSearchInputSchema` gained `page`/`pageSize`;
  `searchLeads()` returns `{ items, total, page, pageSize, radiusApplied }`;
  `/search` and `/leads` both paginate through a shared `Pagination`
  component. Verified live: a 6-result dataset correctly splits 5/1 across
  two pages
- Best-effort Postgres persistence (`lib/db/repository.ts`) — every
  search upserts matched businesses into `Business`/`BusinessLocation`,
  deduplicated on `[source, sourceBusinessId]`, wrapped so a DB failure
  never breaks the page. **Not run against a live database** in this
  sandbox (see Blocked). Deliberately does not yet record `Search`/
  `SearchResult` rows — that needs an authenticated `userId`, and no page
  threads a session into the search path yet (see Next Phase)
- 15 new tests (30 total, all passing): haversine/geocoder, provider
  factory selection, Google Places normalization against a fixture,
  radius exclusion and pagination in the lead composition layer
- Cleaned up two rounds of stray/duplicate files that appeared in the
  working directory mid-build (not written by me) — see the file list in
  my chat replies if reconciling against your own copy

## Blocked (unchanged from Phase 1, plus one addition)

- `prisma generate` still can't complete here (`binaries.prisma.sh` not
  reachable) — `lib/db/repository.ts` is therefore also unverified
  against a real Postgres instance, for the same reason `prisma/seed.ts`
  was in Phase 1.
- **New this phase:** `GooglePlacesProvider` is unverified against the
  live API — `googleapis.com` is not in this sandbox's network
  allowlist. The request/response shapes follow Google's published API
  docs and the normalization logic is unit-tested against a fixture, but
  no real request has been sent or observed to succeed from this
  environment.

## Completed (Phase 3)

- **Real `WebsiteAuditProvider`** (`lib/providers/website-audit/real-provider.ts`):
  fetches a page over HTTP (10s timeout, 3MB size cap, honest content-type
  check) and runs five independent, pure check modules against the parsed
  HTML (via `cheerio`): Technical SEO (HTTPS, meta description, viewport,
  canonical, image alt text), On-Page SEO (title tag, H1 structure),
  Local SEO (LocalBusiness JSON-LD schema, phone number present in page
  text), Content (thin-content word count), Conversion (click-to-call
  `tel:` link, contact form presence). Every finding carries real,
  specific evidence pulled from the actual fetched page — no category is
  ever flagged without something concrete backing it.
- **Real robots.txt permission check** (`lib/providers/website-audit/robots.ts`):
  fetches and parses `robots.txt`, honors `User-agent: *` and
  UA-specific `Disallow` blocks, and — critically — **defaults to NOT
  permitted** on any fetch/parse failure. Under-crawling on our own
  error is the safe failure mode, not over-crawling.
- **Provider factory extended**: `WEBSITE_AUDIT_PROVIDER=real` switches
  the audit pipeline from the Phase 1 mock fixture to this live crawler;
  `get-leads.ts` resolves crawl permission correctly for each mode (mock
  mode skips a real robots.txt check against the fixture's fake
  `.example` domains rather than always failing closed against them;
  real mode always goes through `checkRobotsPermission`).
- **18 new tests (48 total, all passing)**:
  - 11 fixture-based tests for the five check modules (`tests/checks.test.ts`)
  - **7 live-network integration tests** (`tests/real-provider.integration.test.ts`)
    that actually fetch `https://github.com` and its `robots.txt` for
    real — proving the HTTP/timeout/parsing pipeline works against a
    real server, not only strings I wrote myself. This is the first
    Phase in this project where a test genuinely touches the live
    internet rather than a mock or fixture.
- Live-smoke-tested in `real` mode against the Phase 1/2 mock dataset's
  fake `.example` URLs (which can't resolve): confirmed the app returns
  200, not a crash, with `crawlStatusNote` honestly reporting "not
  permitted" — the conservative-default behavior working as designed.

## Blocked / caveats (Phase 3 addition)

- The real crawler's HTTP mechanics are proven against a real server
  (github.com, reachable from this sandbox). What's **not** verified
  from this sandbox: running it against an actual small-business website
  — this environment can't reach arbitrary domains, only the specific
  allowlisted ones. Test against a handful of real client sites before
  production use.
- `Search`/`SearchResult` persistence per authenticated user is still
  not wired in (unchanged from Phase 2 — still needs `getServerSession`
  threaded into the search path).

## Completed (Phase 4)

- **Real `RealAiProposalProvider`** (`lib/providers/ai/real-provider.ts`) —
  calls the Anthropic Messages API to draft proposals. The
  never-invent-a-finding rule is enforced **structurally, not just by
  prompting**: every observation the model returns is checked against the
  real finding IDs it was given, and any observation citing a finding ID
  that doesn't exist is dropped. If every observation gets dropped, or
  the response isn't valid JSON, or the API call fails, this provider
  throws rather than returning something unvalidated.
- **`ResilientAiProposalProvider`** wraps the real provider with the
  Phase 1 deterministic mock as a fallback — a failed or invalid LLM
  response degrades to the safe mock output, never a broken page.
- **Prompt-injection hygiene**: `lib/providers/ai/sanitize.ts` strips
  control characters from any finding text before it reaches the prompt;
  the system prompt explicitly frames finding data as inert content to
  describe, never as instructions, and states this even for text that
  looks like a command. The real enforcement is the finding-ID
  validation above, not the model's good behavior.
- **Auth threaded into the search flow, for real**: `/login` and
  `/register` pages, `POST /api/auth/register` (Zod-validated, bcrypt
  password hashing, honest 503 when no DB is configured), a
  session-aware `UserMenu` in the sidebar, and `searchLeads()` now passes
  the signed-in user's ID through to `persistSearchResults()`, which
  finally records `Search`/`SearchResult` rows (Phase 2 only recorded
  `Business`). `prisma/seed.ts` sets a real, documented password on the
  demo user so credentials login is testable once a DB is connected.
- **17 new tests (67 total, all passing)**, including the load-bearing
  one: a mocked-fetch test proving that when the model's response cites
  a finding ID that was never provided, that observation is dropped —
  not repaired, not trusted, dropped.
- **Found and fixed a real bug**: `lib/db/prisma.ts` constructed
  `PrismaClient` eagerly at module-import time, which meant any page
  merely importing `authOptions` (to call `getServerSession`) crashed
  the production build — not just the `/api/auth` route as in prior
  phases, but now `/search` too, since it needs the session to attribute
  a search to a user. Fixed by making the client lazy (constructed on
  first property access, via a `Proxy`), which also resolved the
  Prisma-related build blocker that had persisted since Phase 1.
- **Build result: 16/16 routes now succeed**, including
  `/api/auth/[...nextauth]` — the one route excluded from every previous
  phase's build verification. This sandbox still can't run `prisma
  generate` against real engine binaries, but that no longer prevents a
  full production build.

## Blocked / caveats (Phase 4 addition)

- `RealAiProposalProvider` is unit-tested against a mocked `fetch` only
  (`tests/ai-real-provider.test.ts`) — not against the live Anthropic
  API, since no `ANTHROPIC_API_KEY` is available in this sandbox. The
  request shape follows the standard Messages API; verify against a real
  key before production use.
- Registration/login are still functionally unverified against a real
  database for the same reason every DB-touching code has been
  throughout this project (no live Postgres in this sandbox) — but they
  are now proven not to break the build or crash pages that don't use
  them, which was not true before this phase's Prisma fix.

## Completed (Phase 5)

- **CSV export**: `lib/export/csv.ts` (pure, RFC-4180-ish escaping —
  quotes commas/quotes/newlines, doubles embedded quotes, renders
  null/undefined as a genuinely empty cell rather than the UI-only
  "NOT VERIFIED" label) + `lib/export/leads-csv.ts` (the leads-specific
  column mapping). `GET /api/leads/export` exports either the full lead
  list or, with `?keyword=&location=&radiusMi=`, a filtered set matching
  a search — up to 500 rows in one file, deliberately not capped by the
  UI's 50-item pagination limit. "Export CSV" buttons added to `/leads`
  and `/search`.
- **PDF export**: `lib/export/audit-pdf.ts` builds a real, multi-page
  audit report (business info, all 7 scores with their "why" explanation
  lines, findings by category, the proposal draft) using `pdf-lib` — pure
  JS, no headless browser or native dependency, safe for a serverless
  function. `GET /api/leads/[id]/export` streams it as a download; 404
  for an unknown lead. "Export PDF" button added to the lead detail page.
- **10 new tests (77 total, all passing)**: CSV escaping edge cases
  (commas, quotes, newlines, null handling), a real end-to-end PDF
  generation test that round-trips the output through `pdf-lib`'s own
  loader to confirm it's a genuinely valid, re-parseable PDF (not just
  "didn't throw"), and a regression test for the bug below.
- **Caught and fixed a real bug during live testing** (not just unit
  tests): the export route initially reused `leadSearchInputSchema`,
  which caps `pageSize` at 50 for UI pagination sanity — so a filtered
  CSV export of more than 50 rows would silently 400. Fixed with a
  dedicated `leadExportInputSchema` that validates only
  keyword/location/radiusMi and has no pageSize cap at all. Live-tested
  before and after: confirmed the 400 with the original code, confirmed
  the fix with the same live request afterward.
- Live-smoke-tested all three new download paths in one dev-server
  session: all-leads CSV, filtered-search CSV, and per-lead PDF — every
  response checked for correct `Content-Type`, `Content-Disposition`
  filename, and (for the PDF) a real `%PDF-` file signature via `file`.

## Completed (Phase 6 — final phase of the original spec)

- **Status tracking**: a `StatusSelect` dropdown on the lead detail page
  covering the full `LeadStatus` enum (New, Queued for Audit, Audited,
  Qualified, Contacted, Responded, Won, Lost, Disqualified). Saved via
  `PATCH /api/leads/[id]/status`, validated against the enum by
  `leadStatusUpdateSchema` (an invalid value is rejected with a 400
  before it ever reaches the database). Once set, the status overrides
  the derived NEW/AUDITED default everywhere a lead is shown — the leads
  list, search results, and the detail page all read the same overlay.
- **Notes**: a `NotesPanel` on the lead detail page. Signed-in users can
  add a note (`POST /api/leads/[id]/notes`); anyone can read them
  (`GET`). Notes are attributed to the user who wrote them and
  timestamped. Signed-out visitors see a "Sign in to add notes" prompt
  instead of a broken form.
- **`lib/db/repository.ts` CRM functions** (`listNotesForBusiness`,
  `addNoteForBusiness`, `getLeadStatusOverride`, `setLeadStatus`) follow
  a deliberately different failure mode than the Phase 2 search
  persistence: search persistence is best-effort and silent (a search
  result is still valid even if saving it failed), but a note or status
  change is a direct response to something the user explicitly typed or
  clicked — so these THROW on failure, and the API routes turn that into
  a real error response (503 when no database is configured at all, 500
  for an unexpected failure) rather than silently discarding what the
  user did.
- **8 new tests (85 total, all passing)** covering the "no DATABASE_URL"
  degrade paths (fully testable without a live DB — confirms reads
  return empty/null and writes throw a clear, catchable error) and both
  the status and note validation schemas (every real enum value accepted,
  a made-up status rejected, an empty note body rejected).
- **Live-smoke-tested every new status code this phase introduces** in
  one dev-server session: 200 (notes list, empty with no DB), 401 (note
  post without a session), 400 (invalid status value), 503 (valid status
  change with no DB configured), 404 (notes for an unknown lead) — each
  checked against the actual running server, not assumed from the code.

This completes every phase of the original build spec (Phases 1
through 6). Everything past this point is genuine hardening/deployment
work, not unbuilt spec.

## Still true, and worth restating clearly for anyone deploying this

- **No live Postgres has ever been available in the sandbox this was
  built in.** Every DB-touching code path (Prisma schema, seed script,
  search persistence, CRM notes/status) is unit-tested where the logic
  allows it and has been reviewed carefully, but has not been run
  against a real database. Run `npx prisma migrate dev` and
  `npx prisma db seed` against a real Postgres instance and verify the
  app's authenticated/CRM paths before considering this production-safe.
- **No real API keys have ever been available.** `GooglePlacesProvider`
  and `RealAiProposalProvider` are unit-tested against fixtures/mocked
  `fetch` only. Test both against real keys before relying on them.
- **The real website crawler** (`RealWebsiteAuditProvider`) has been
  proven against a real server (github.com, reachable from this
  sandbox) but never against an arbitrary small-business site. Test it
  against a handful of real client sites first.
- Email/WhatsApp sending remains intentionally unbuilt — `ProposalCard`
  ships those buttons disabled, by design, per the original spec's "do
  not automatically send outreach" requirement. Building real sending is
  a deliberate, separate decision for whoever operates this, not
  something to add casually.
