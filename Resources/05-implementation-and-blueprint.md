# CROSS-DOCUMENT CONSISTENCY MATRIX, VIBE CODING IMPLEMENTATION PLAN, FINAL BUILD BLUEPRINT
## Food Rescue AI

---

# PART A — CROSS-DOCUMENT CONSISTENCY MATRIX

| Requirement | PRD section | TRD implementation | Workflow | UI screen |
|---|---|---|---|---|
| Image ingredient detection | §11.1, §17 FR1 | §10–12 CV pipeline | #6, #7 | Detection Processing, Detection Result |
| Manual ingredient entry | §11.2, §17 FR1 | §15 search architecture | #9 | Manual Ingredient Search |
| Ingredient normalization | §11.3 | §13, LLM guardrails §20 | #8 | Ingredient Confirmation |
| Recipe retrieval | §11.4, §17 FR3 | §14 SQL retrieval | #12 | Recipe Loading |
| Feasibility Engine | §11.5 | §16 | #13 | Recipe Detail (feasibility badge) |
| Rescue Scoring | §11.6, §17 FR4 | §17 formula | #14, #15 | Rescue Score Explanation modal |
| Cook Now / Buy 1-2 | §11.7, §17 FR5 | §14 candidate split | #15 | Recommendations (both sections) |
| Use First | §11.8, §17 FR6 | §17 priority bonus | #11 | Use First Selection |
| Recipe adaptation | §11.9 | §18-20 | #17 | Missing Ingredient Section |
| Nutrition | §11.10, §17 FR7 | §21-22 | #18 | Nutrition Section |
| Saved recipes | §11.11 | DB `saved_recipes` §8 | #19 | Saved Recipes |
| Auth | §11.12 | §29 Supabase Auth | #19, #24 | Profile/Settings |
| No-recipe honesty | §16 | §16 Feasibility class D | #22 | No Reliable Recipe state |

Every AI component's purpose: CV = ingredient detection only; LLM = normalization fallback + adaptation suggestion only; neither computes nutrition or the Rescue Score.
Every external data source's role: INDoRI = recipe corpus; USDA FDC = nutrition corpus (curated subset); Supabase = DB/Auth/Storage; CV/LLM providers = inference only, stateless.
Every score has a defined calculation: Rescue Score, TRD §17 (deterministic, auditable).
Every major failure case has a recovery path: TRD §35 + Workflow §21–27.

---

# PART B — TESTING DETAIL (TRD §46–51 reference)

## Rescue Engine test cases

| Case | Available ingredients | Recipe A | Recipe B | Expected ranking |
|---|---|---|---|---|
| 1 | Rice, Tomato, Paneer, Onion | Uses all 4, missing 0 | Uses 2, missing 4 | A > B |
| 2 | Rice, Tomato | Uses 2, missing 0, 30 min | Uses 2, missing 0, 15 min, user max time 20 | B > A (time compatibility) |
| 3 | Tomato, Onion (Use First: Tomato) | Uses tomato + 2 others | Uses onion + 2 others, no tomato | A > B (priority bonus) |
| 4 | Rice only | Recipe needing 5 ingredients | — | Classified D, excluded from ranked list |
| 5 | Rice, Dal, Onion (qty rice = 50g, recipe needs 200g) | Quantity insufficient | — | Quantity Feasibility = 0, score reduced, not silently "feasible" |
| 6 | Any set where no recipe scores ≥ class C | — | — | System returns "No Reliable Recipe Found," never forces a class D recipe |

## Other module test coverage (summary)

- **CV:** precision/recall per class on a held-out labeled set; confidence-threshold false-positive rate.
- **LLM normalization/adaptation:** JSON schema validity rate; rejection rate of unresolvable substitutes.
- **Nutrition:** correct partial-estimate flagging when ≥1 ingredient lacks data.
- **API:** contract tests per endpoint in §28 (request/response shape, error codes).
- **Security:** oversized file rejected, non-image MIME rejected, unauthenticated save attempt rejected.
- **Performance:** load test retrieval+scoring endpoint (no external API dependency) to confirm it doesn't become the bottleneck as recipe catalog grows.

---

# PART C — VIBE CODING IMPLEMENTATION PLAN

### Phase 0 — Project Setup
**Goal:** working skeleton, deployable end-to-end with a placeholder response.
**Tasks:** init Next.js app (Vercel), init FastAPI app (Railway/Fly), create Supabase project, wire env vars, deploy "hello world" on both ends, set up GitHub Actions skeleton.
**Files/modules:** `/frontend`, `/backend/app/main.py`, `.env.example`, `.github/workflows/deploy.yml`.
**Dependencies:** none.
**API requirements:** `GET /health`.
**DB changes:** none.
**Testing:** health check reachable from deployed frontend.
**DoD:** frontend calls backend `/health` successfully in production.

### Phase 1 — Database
**Goal:** schema live in Supabase.
**Tasks:** write Alembic migrations for all tables in TRD §8; enable `pg_trgm`; set up RLS policies for `saved_recipes`/`rescue_sessions`.
**Files:** `/backend/app/models/*.py`, `/backend/alembic/versions/*`.
**Dependencies:** Phase 0.
**DB changes:** full schema creation.
**Testing:** migration up/down runs cleanly; RLS policy denies cross-user access in a test.
**DoD:** all tables exist in Supabase, verified via a seed-and-query script.

### Phase 2 — Backend APIs (skeleton)
**Goal:** route structure and schemas in place before logic.
**Tasks:** define Pydantic schemas for all endpoints in TRD §28; stub each route returning mock data.
**Files:** `/backend/app/api/*.py`, `/backend/app/schemas/*.py`.
**Dependencies:** Phase 1.
**Testing:** contract tests against mock responses.
**DoD:** frontend can integrate against stable mock API shapes.

### Phase 3 — Recipe Ingestion (INDoRI)
**Goal:** real recipe data in Postgres.
**Tasks:** write `/scripts/seed_recipes.py`; parse INDoRI; resolve ingredient text via alias table (create aliases as needed); load `recipes`/`recipe_ingredients`.
**Dependencies:** Phase 1.
**DB changes:** populated `recipes`, `recipe_ingredients`, `ingredients`, `ingredient_aliases`.
**Testing:** row counts sane, no orphaned FKs, spot-check 10 recipes manually.
**DoD:** recipe catalog queryable via the retrieval SQL (TRD §14) with real results.

### Phase 4 — Ingredient Normalization
**Goal:** raw text/CV labels reliably map to canonical ingredients.
**Tasks:** implement `services/normalization.py` (alias match first, LLM fallback second per TRD §13); wire `llm_client` wrapper.
**Dependencies:** Phase 3.
**API requirements:** internal only (used by detect/manual-add endpoints).
**Testing:** unresolvable input correctly falls to "unrecognized" rather than a bad guess.
**DoD:** ≥95% of a manual test ingredient list resolves correctly.

### Phase 5 — Rescue Engine (Feasibility + Scoring)
**Goal:** the core differentiator, fully deterministic and tested.
**Tasks:** implement `services/feasibility.py` and `services/rescue_score.py` exactly per TRD §16–17; implement candidate retrieval SQL (§14).
**Dependencies:** Phase 3, 4.
**Testing:** all Rescue Engine test cases in Part B pass; formula components sum to displayed total.
**DoD:** `/api/v1/recommendations` returns correctly ranked, correctly split (Cook Now/Buy 1-2) real data.

### Phase 6 — Computer Vision
**Goal:** working image-to-ingredient-list pipeline.
**Tasks:** implement OpenCV preprocessing (`services/vision.py`); select and integrate a pretrained/fine-tuned pay-per-call inference provider for the ~25–40 class list; wire confidence filtering and ingredient mapping.
**Dependencies:** Phase 4 (normalization needed to map labels → ingredient_id).
**API requirements:** `POST /api/v1/detect`.
**Testing:** CV evaluation on held-out labeled images (precision/recall); timeout fallback tested.
**DoD:** detect endpoint returns real confidence-scored ingredient lists within performance targets (TRD §39).

### Phase 7 — LLM Integration (Adaptation)
**Goal:** validated substitution suggestions.
**Tasks:** implement `services/adaptation.py`; enforce JSON schema validation and per-session call caps; implement caching by `(ingredient_set_hash, recipe_id)`.
**Dependencies:** Phase 5.
**Testing:** invalid LLM output correctly discarded/falls back; cache hit avoids duplicate calls.
**DoD:** Recipe Detail can show a validated substitution suggestion end-to-end.

### Phase 8 — Nutrition
**Goal:** accurate, honestly-labeled nutrition output.
**Tasks:** run `/scripts/seed_nutrition.py` (USDA subset ETL); implement `services/nutrition.py` aggregation with partial-estimate flagging.
**Dependencies:** Phase 3.
**Testing:** partial-estimate flag triggers correctly when data is missing for any matched ingredient.
**DoD:** Recipe Detail nutrition section renders correct, appropriately-caveated values.

### Phase 9 — Frontend
**Goal:** full UI per UI/UX spec.
**Tasks:** build all screens in Document 4, wired to real endpoints from Phases 2–8; implement camera/upload flow, confirmation/edit flows, recommendations screen with Cook Now/Buy split, Recipe Detail with score breakdown modal.
**Dependencies:** Phases 2, 5, 6, 7, 8.
**Testing:** manual QA against every edge case in PRD §23 and Workflow §21–27.
**DoD:** full journey (Scan → Confirm → Constraints → Recommendations → Detail → Cook/Save) usable end-to-end on mobile viewport.

### Phase 10 — Integration
**Goal:** all modules working together under real conditions.
**Tasks:** end-to-end test of full flow with real image, real LLM calls, real DB; verify auth-gated save flow; verify RLS enforcement.
**Dependencies:** all prior phases.
**Testing:** full E2E test suite (Playwright/Cypress) covering the core journey plus 2–3 edge cases (no detection, no recipe found).
**DoD:** E2E suite green on staging.

### Phase 11 — Testing (hardening pass)
**Goal:** confidence before production traffic.
**Tasks:** run full unit/integration/load test suites (TRD §45); fix any performance regressions against §39 targets; security pass (upload validation, RLS, rate limiting) verified.
**Dependencies:** Phase 10.
**DoD:** all target thresholds in TRD §39 met or consciously documented as exceptions.

### Phase 12 — Deployment
**Goal:** live production V1.
**Tasks:** finalize CI/CD (TRD §43); configure production env vars/secrets; enable Supabase automated backups; set up basic monitoring (Sentry free tier recommended); deploy.
**Dependencies:** Phase 11.
**DoD:** production URL live, health check green, core journey verified in production.

---

# PART D — FINAL BUILD BLUEPRINT

**Build first:** DB schema (Phase 1) → recipe ingestion (Phase 3) → Rescue Engine (Phase 5, pure logic, no external APIs, fastest to test and validate) → then CV (Phase 6) and LLM (Phase 7) as the two external-dependency layers → frontend last, wired to a already-working backend.

**Do not build:** Food.com integration, multi-instance ingredient counting, vector/embedding search, custom auth server, Kubernetes/microservices, dedicated Redis cache, full AWS stack, social/sharing features. All explicitly deferred to V2 with reasoning documented in TRD §2, §17 note, §27, §42.

**Core architecture:** modular monolith (FastAPI) + managed data/auth/storage (Supabase) + pay-per-call external AI (CV + LLM), deployed on serverless/low-tier PaaS (Vercel + Railway/Fly). No self-hosted model inference.

**Core database:** `ingredients`, `ingredient_aliases`, `recipes`, `recipe_ingredients`, `nutrition_data`, `users`, `rescue_sessions`, `inventory_items`, `saved_recipes` — 9 tables, each independently justified (TRD §8).

**Core APIs:** `POST /detect`, `POST /ingredients` (manual add), `POST /recommendations`, `GET /recipes/{id}`, `GET /recipes/{id}/score-breakdown`, `POST /recipes/{id}/save`.

**Core algorithms:** Feasibility Engine (A/B/C/D classification, TRD §16) and Rescue Scoring Engine (deterministic weighted formula, TRD §17) — both pure, testable, non-AI logic. This determinism is the product's core defensibility.

**Core screens:** Home, Scan/Camera, Detection Result+Confirm, Manual Add, Preferences, Recommendations (Cook Now/Buy 1-2), Recipe Detail (with Score breakdown + Nutrition + Missing ingredients), Saved Recipes, Error/Empty states.

**Core AI components:** (1) pretrained/fine-tuned CV classifier via pay-per-call API — ingredient detection only; (2) LLM via pay-per-call API, capped and cached — ingredient normalization fallback + recipe adaptation suggestion only. Neither AI component computes scores or nutrition.

**Deployment:** Vercel (frontend) + Railway/Fly.io (backend) + Supabase (DB/Auth/Storage) — no AWS required for V1; documented AWS migration path exists for scale (TRD §42).

**Testing:** unit tests on Rescue Engine (exhaustive case coverage, Part B), integration tests per API, CV/LLM evaluation metrics, E2E on core journey, load test on the non-AI-dependent retrieval+scoring path.

**Demo (3–5 min):** Open app → Scan real ingredients → correct one low-confidence detection → mark one Use First → set constraints → show Cook Now vs Buy 1-2 split → tap Rescue Score for breakdown → open Recipe Detail → show validated substitution suggestion → show nutrition with partial-estimate label if applicable → close with "no reliable recipe found" example to prove the system doesn't force bad answers. Backup flow if CV fails live: switch to manual ingredient entry seamlessly — same downstream flow, no separate code path to demo.
