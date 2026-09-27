# Architecture — Local Lead Intelligence (as built, Phase 1)

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma ·
NextAuth (Auth.js v4) · Zod · Vitest

## Layering

```
app/                    ← routes only: fetch data via lib/, render components
  dashboard/, search/, leads/, leads/[id]/, audits/, proposals/,
  followups/, settings/, api/{auth,search,leads}/

components/
  ui/                   ← primitives: Button, Card, Badge, Input, Table
  layout/               ← Sidebar, Topbar, DashboardShell
  dashboard/             ← domain components: LeadSearchBox, LeadsTable,
                           ScorePill/OpportunityPill/StatusBadge,
                           FindingItem, ProposalCard

lib/
  providers/
    business-data/      ← BusinessDataProvider interface + mock impl
    website-audit/      ← WebsiteAuditProvider interface + mock impl
    ai/                 ← AiProposalProvider interface + mock impl
  scoring/               ← calculateScores() — pure, unit-tested
  leads/get-leads.ts     ← composition layer: providers + scoring → view model
  data/mock-leads.ts     ← fixed demo dataset (Phase 1 only)
  validation/schemas.ts  ← Zod schemas at every boundary
  auth/config.ts         ← NextAuth options
  db/prisma.ts           ← PrismaClient singleton

types/domain.ts          ← shared types, independent of the generated Prisma client

prisma/schema.prisma      ← full Phase 1 data model
prisma/seed.ts             ← loads the mock dataset into a real DB
```

## The one decision worth explaining: no DB read on the happy path yet

Every page today calls `src/lib/leads/get-leads.ts`, which talks directly
to the **provider interfaces** (currently the mock implementations) and
runs scoring in-memory. It does not read from Postgres.

This was deliberate, not a shortcut: the brief asked for a working,
testable Phase 1 UI with **zero external setup**, and a live DB wasn't
available to verify against in this environment either (see progress.md).
The Prisma schema is real and complete, `prisma/seed.ts` loads the exact
same demo data into it, and swapping `get-leads.ts` to query `prisma.*`
instead of the provider is a contained change — the page components,
scoring engine, and provider interfaces don't need to change at all. That
swap, plus wiring `Search`/`SearchResult` persistence so repeat searches
don't re-fetch, is Phase 2 work.

## Provider abstraction

Nothing in `app/` or `components/` imports a vendor SDK or knows the word
"Google" or "Yelp." Real integrations implement the interfaces in
`lib/providers/*/types.ts`; call sites only depend on those interfaces.
Switching providers is a matter of instantiating a different class in
`lib/leads/get-leads.ts` (Phase 2 should promote this to a small factory
keyed by a `BUSINESS_DATA_PROVIDER` env var, per `.env.example`).

## Data confidence, enforced structurally

Every fact-bearing model/type carries a `DataConfidence` field
(`VERIFIED | OBSERVED | INFERRED | NOT_VERIFIED`). The mock provider
never returns `VERIFIED` — that value is reserved for data a real
provider actually confirmed, so the distinction stays meaningful once a
real provider is wired in. The UI renders `null` fields as the literal
string `NOT VERIFIED` rather than hiding them or guessing (see
`leads/[id]/page.tsx`'s `nv()` helper).

## Scoring

`calculateScores()` is a pure function: `(business, findings) => ScoreBreakdown`.
It never touches review count in isolation — profile score blends
category/phone/website presence, rating, and a log-scaled, capped review
count contribution (see `tests/scoring.test.ts` for the explicit
regression test on this). Each sub-score records its own
`ScoreExplanationEntry[]` so the "why" is structured data, not a
freeform LLM sentence.

## AI proposal generation

`MockAiProposalProvider` is intentionally non-LLM: it's a deterministic
function over real, `verified` findings only. It sorts by severity, takes
the top 3, and every `ProposalObservation` carries the originating
`findingId`. If there are no verified findings, it returns a proposal
that says so instead of inventing pain points. `AiProposalProvider` is
the seam Phase 4 replaces with a real LLM call — the interface (and this
verified-findings-only constraint) doesn't change.

## Security posture implemented in Phase 1

- No API keys or DB credentials in any client component; `lib/db`,
  `lib/auth`, and all providers are server-only modules
- All external input (search form, API routes) validated with Zod before
  it reaches any business logic
- Outreach send actions (Email/WhatsApp) are rendered disabled in the UI
  with an explanatory note — no send path exists yet at all, so there's
  nothing to accidentally trigger
- `crawlAllowed` is a first-class, explicit parameter on
  `WebsiteAuditProvider.auditWebsite()` — a real implementation is
  structurally required to decide robots.txt permission before crawling,
  not just remember to check it

## Phase 2 additions

- `lib/providers/factory.ts` is now the single place that decides which
  `BusinessDataProvider` is active, keyed by `BUSINESS_DATA_PROVIDER`.
  `get-leads.ts` calls `getBusinessDataProvider()` instead of
  constructing `MockBusinessDataProvider` directly — switching providers
  is a one-line env change, not a code change.
- `lib/geo/` holds distance math (`haversineMiles`/`withinRadius`, pure
  functions) and the `Geocoder` interface. Radius filtering runs as a
  second pass after the provider's own keyword/location search: geocode
  the searched location, then keep only businesses whose returned
  lat/lon actually falls inside the radius. A business with no
  coordinates is excluded from a radius-filtered result rather than
  assumed to be inside it — silence is treated as `NOT_VERIFIED`, not a
  pass.
- `searchLeads()` now returns `PaginatedLeads` (`items`, `total`, `page`,
  `pageSize`, `radiusApplied`) instead of a flat array. `radiusApplied`
  tells the UI whether real distance filtering actually ran (only true
  when the location geocoded) — the search page surfaces this honestly
  rather than implying every result was distance-checked.
- `lib/db/repository.ts` is the first piece of code in this project that
  touches Postgres from the request path (previously only
  `prisma/seed.ts` did, offline). It's additive and non-blocking by
  design: `searchLeads()` calls it and swallows any failure, so a
  misconfigured or absent database degrades to "the mock/live search
  still works, nothing got saved" rather than a broken page.

## Phase 3 additions

- `lib/providers/website-audit/` now has a real implementation alongside
  the mock: `robots.ts` (permission check, fail-closed), `fetch-page.ts`
  (bounded HTTP fetch), `checks.ts` (five pure, independently-testable
  finding generators operating on a `cheerio` DOM), `real-provider.ts`
  (wires the three together behind the same `WebsiteAuditProvider`
  interface the mock implements — `get-leads.ts` doesn't care which one
  it's talking to).
- `get-leads.ts` gained `resolveCrawlPermission()`, the one place that
  reconciles a structural tension: the mock provider's crawl-permission
  concept doesn't apply to its own fake fixture domains (a real
  robots.txt fetch against `pinebeltfamilydental.example` would always
  fail and hide every mock finding), while the real provider must always
  honor an actual check. Selecting the audit provider is one env var;
  this function is the only place that knows both modes exist.
- Security posture extended: `fetch-page.ts` enforces a timeout and byte
  cap (the "don't let a slow or huge page hang/exhaust the crawler"
  half of treating crawled content as untrusted); `checks.ts` never
  executes or evaluates anything from the fetched page — it only reads
  tag presence, attribute values, and text length. JSON-LD parsing is
  wrapped in try/catch so malformed structured data degrades to "schema
  absent" rather than crashing the audit.

## Phase 4 additions

- `lib/providers/ai/real-provider.ts` + `resilient-provider.ts` +
  `sanitize.ts` follow the same shape as every other real/mock pair in
  this codebase, wired through `lib/providers/factory.ts`
  (`getAiProposalProvider()`). The one addition to the pattern:
  `ResilientAiProposalProvider` is a decorator, not a third
  implementation — it composes any two `AiProposalProvider`s so the
  factory can wrap "real" with "mock" as a fallback without a special
  case in `get-leads.ts`.
- The anti-hallucination guarantee lives in code, in one specific place:
  `real-provider.ts`'s `.filter((o) => validFindingIds.has(o.findingId))`.
  Everything else (the system prompt's rules, the sanitizer) is
  defense-in-depth; this filter is what actually makes it true
  regardless of what the model does. Treat this line as load-bearing if
  touching this file later.
- `lib/db/prisma.ts` changed from eager to lazy construction (`Proxy`-
  based). This is the fix that resolved the Prisma/build blocker
  standing since Phase 1 — worth knowing if extending anything that
  imports `authOptions` or `prisma`: importing either is now always
  safe; only an actual query can fail, and only when the client truly
  isn't generated/configured.
- `lib/db/repository.ts`'s `persistSearchResults` now takes an optional
  `userId` and creates `Search` + `SearchResult` rows when present,
  alongside the `Business`/`BusinessLocation` upserts it already did.
  `src/app/search/page.tsx` is the only caller that supplies it, via
  `getServerSession(authOptions)`.

## Phase 5 additions

- `lib/export/` is a new, self-contained module: `csv.ts` (generic,
  reusable `toCsv()`), `leads-csv.ts` (the one place that knows which
  lead fields become which CSV columns), `audit-pdf.ts` (the one place
  that knows the PDF layout). Neither export route talks to `pdf-lib` or
  does string-escaping directly — they call into `lib/export/`.
- `leadExportInputSchema` exists as a sibling to `leadSearchInputSchema`
  specifically because export and UI pagination have different, correct
  constraints on the same underlying search (see the Phase 5 bug in
  progress.md). Don't reuse `leadSearchInputSchema` for a future export
  or bulk-operation endpoint without checking whether its `pageSize` cap
  is actually appropriate there.
- `Topbar` gained an optional `actions` slot (a `ReactNode` rendered on
  its right side) specifically to host these export buttons without
  every page inventing its own header-button layout.

## Phase 6 additions

- The CRM write functions in `lib/db/repository.ts` establish a pattern
  worth keeping consistent if extended: **reads that support a page
  degrade silently** (empty array / null), **writes that the user
  directly triggered throw**. Mixing these up in either direction is a
  usability bug: a silently-failing note-save loses the user's work with
  no feedback; a throwing search-persistence call would break a page the
  user never asked to write anything from.
- Status is now genuinely two-layered: `buildLeadListItem`/`getLeadDetail`
  compute a derived default (`NEW`/`AUDITED`, from whether any audit
  findings exist) and then check `getLeadStatusOverride` for a
  CRM-set value, using the override when present. This means the
  mock-mode demo (no DB) still shows sensible statuses with zero setup,
  while a connected deployment gets real, user-controlled status
  tracking on the exact same code path — no branching in the UI layer.

## Known simplifications (intentional, Phase 1 scope)

- One `Website` per `Business` (schema supports revisiting this if a
  business has multiple relevant domains later)
- Radius search is accepted and validated but not applied by the mock
  provider (no real geocoding yet — a real provider is responsible for
  this)
- No pagination on the leads table yet (dataset is small in Phase 1)
