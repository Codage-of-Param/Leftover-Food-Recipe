# DOCUMENT 1 — PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Food Rescue AI
**"Don't ask what you want to cook. Ask what food you can rescue."**

Version: 1.0 (Production-Track)
Architecture stance: Cost-effective, fast-to-ship, managed-services-first, monolith-first.

---

## 1. Executive Summary

Food Rescue AI is a mobile-first application that identifies the food a user already has (via photo or manual entry) and tells them the most *feasible* way to use it — not the most creative recipe, the most realistically cookable one. It solves ingredient waste caused by uncertainty ("I have random stuff, I don't know what to make"), not by recipe scarcity. The product is deliberately **not** a chat-based AI assistant: it is a structured utility app where AI (computer vision + LLM) is an internal component, not the interface.

Production goal: ship a real, usable V1 — not just a demo — using managed infrastructure (Vercel, Supabase, a pay-per-call inference provider) so that infra cost stays near-zero at low usage and scales predictably.

---

## 2. Product Vision

Become the default "what can I actually cook right now" utility for home cooks — the layer between "I have food" and "I know what to do with it" — by combining deterministic feasibility logic with narrowly-scoped AI assistance.

## 3. Problem Statement

Home cooks routinely have usable ingredients (leftovers, partial quantities, near-random combinations) that go unused because:
- They don't know what recipes those ingredients support.
- Generic recipe search requires already knowing what dish to search for.
- General-purpose LLMs (ChatGPT/Gemini) can generate *a* recipe, but cannot reliably tell the user whether they **actually have** what's needed, in what quantity, or how close they are to a complete, cookable meal — because LLMs don't do structured inventory-matching or verified nutrition lookups.

## 4. Target Users

| Segment | Description |
|---|---|
| Primary | Home cooks, 20–40, urban/semi-urban, cook 4+ times/week, moderate cooking skill |
| Secondary | Students / shared housing with small, irregular ingredient stock |
| Tertiary | Budget-conscious households trying to reduce grocery waste and spend |

## 5. User Personas

**Priya, 29, working professional.** Cooks on weeknights with whatever's left in the fridge. Doesn't want to browse recipe blogs. Wants: "tell me what I can make in 20 minutes with this."

**Rahul, 22, student sharing a flat.** Limited, inconsistent pantry. Wants: "what's the minimum I need to buy to cook something tonight."

**Anita, 45, home manager.** Cooks for a family, wants to avoid throwing out vegetables nearing use. Wants: prioritize ingredients that should be used soonest.

## 6. User Pain Points

- Doesn't know what's "enough" of an ingredient to cook with.
- Recipe apps assume you already picked a dish.
- LLM chat answers feel generic and untrustworthy for "can I actually make this."
- No visibility into *why* a recipe was suggested.

## 7. Goals

- Let a user go from "photo of fridge" to "a cookable recipe" in under 60 seconds of interaction.
- Make every recommendation explainable (ingredient coverage, missing items, time).
- Keep the system honest: say "no good recipe found" rather than force a bad one.
- Keep infra cost low enough to run indefinitely on a small user base without a funding-dependent budget.

## 8. Non-Goals

- Not a general cooking chatbot.
- Not a meal-planning / grocery-delivery platform (V2+ candidate only).
- Not a social/recipe-sharing network.
- Not a food-safety or expiry-date authority (no expiry claims).
- Not attempting to recognize arbitrary/unlimited food classes in V1.

## 9. Product Value Proposition

"We tell you what you can actually cook, with what you actually have, and how close you are if you don't — something a generic AI chatbot cannot verify."

## 10. Competitive Differentiation

| Competitor type | Gap Food Rescue AI fills |
|---|---|
| ChatGPT/Gemini | No structured inventory match, no verified nutrition, no feasibility scoring, conversational overhead |
| Recipe apps (search-first) | Require the user to already know the dish name |
| Pantry-tracking apps | Track inventory but don't rank recipes by rescue/feasibility |

## 11. Core Features (MVP → Production V1)

| # | Feature | MoSCoW |
|---|---|---|
| 1 | Image-based ingredient detection | Must |
| 2 | Manual ingredient add/edit | Must |
| 3 | Ingredient normalization (LLM-assisted) | Must |
| 4 | Recipe retrieval (SQL, ingredient overlap) | Must |
| 5 | Feasibility Engine | Must |
| 6 | Rescue Scoring Engine | Must |
| 7 | Cook Now vs Buy 1–2 Ingredients split | Must |
| 8 | Use First prioritization | Should |
| 9 | Recipe adaptation via LLM (validated) | Should |
| 10 | Nutrition (curated ingredient subset) | Should |
| 11 | Saved recipes / rescue history | Could |
| 12 | User accounts (Supabase Auth) | Should (needed for persistence in production) |
| 13 | Multi-instance ingredient counting | Won't (V2) |
| 14 | Full recipe-level USDA matching | Won't (V2) |
| 15 | Food.com dataset integration | Won't (V2) |
| 16 | Social/sharing features | Won't |

## 12. Feature Priority Detail (representative examples)

### Feature: Image-based Ingredient Detection
- **Purpose:** Remove manual data-entry friction as the primary input path.
- **User problem:** Doesn't want to type every ingredient.
- **User flow:** Home → Scan Food → Camera/Upload → Preprocessing → Detected list with confidence scores → Confirm/correct.
- **System behavior:** OpenCV preprocess → hosted vision inference (pay-per-call) → confidence-filtered class list → map to canonical ingredient IDs.
- **Inputs:** JPEG/PNG image, max 8MB.
- **Outputs:** List of `{ingredient_id, label, confidence}`.
- **Edge cases:** no food detected, all low-confidence, >20 objects, blurry image, non-food image.
- **Acceptance criteria:** Detected list renders within target latency (see TRD); every item is editable/removable; confidence <70% visually flagged.
- **Priority:** Must Have.

### Feature: Rescue Scoring Engine
- **Purpose:** Rank feasible recipes by real-world usability of on-hand ingredients, not just keyword overlap.
- **User problem:** Wants to know *why* a recipe is the best choice, not just *that* it is.
- **User flow:** After ingredient confirmation + constraints → recipe list shows Rescue Score, tappable for breakdown.
- **System behavior:** Deterministic formula (defined in TRD) computed server-side per candidate recipe.
- **Inputs:** user ingredients + quantities, recipe ingredient requirements, user constraints, Use-First flags.
- **Outputs:** Score 0–100 + component breakdown.
- **Edge cases:** recipe with zero overlap (excluded, not scored), tie scores (defined tie-break), missing quantity data (feasibility marked "unknown" not assumed).
- **Acceptance criteria:** Score is reproducible for identical inputs; breakdown sums exactly to displayed score.
- **Priority:** Must Have.

*(Same level of detail applies to all Must/Should features; full set enumerated in the Vibe Coding Implementation Plan, Phase 5–9 task lists, to avoid duplicating here.)*

## 13. MVP Scope (Production V1, first shippable release)

Ingredient detection (curated ~25 classes) + manual entry, ingredient normalization, INDoRI-based recipe retrieval, Feasibility Engine, Rescue Scoring, Cook Now/Buy split, Use First, LLM-validated recipe adaptation, curated nutrition subset, Supabase Auth (lightweight), saved recipes.

## 14. Future Scope (V2+)

Food.com dataset expansion, broader CV class coverage, full recipe-level nutrition matching, meal planning, grocery list export, multi-day inventory tracking, expiry-aware prioritization (with proper data sourcing), social sharing.

## 15. User Stories (representative)

- As a user, I want to photograph my fridge so I don't have to type every ingredient.
- As a user, I want to correct a wrong detection so the system doesn't recommend based on bad data.
- As a user, I want to mark spinach as "use first" so recipes using it rank higher.
- As a user, I want to see why a recipe scored 92 so I trust the recommendation.
- As a user, I want to see "buy 1 ingredient" recipes separately from "cook now" recipes so I can decide fast.
- As a user, I want the app to tell me honestly when no good recipe exists instead of forcing a bad suggestion.

## 16. Acceptance Criteria (system-level)

- Every recommended recipe must show its full score breakdown on request.
- No recipe is shown as "feasible" if a required non-substitutable ingredient is missing.
- No nutrition value is shown without a data source; unavailable values show "not available," never a guess.
- LLM-suggested substitutions are visually distinguished as "AI-suggested, unverified" until matched to a canonical ingredient.

## 17. Functional Requirements

FR1. System shall accept image input and manual input as parallel entry paths.
FR2. System shall normalize ingredient names to canonical IDs before retrieval.
FR3. System shall retrieve candidate recipes via structured ingredient-overlap query, not LLM generation.
FR4. System shall compute Rescue Score deterministically per the defined formula.
FR5. System shall separate "Cook Now" (0 missing) from "Buy 1–2" (1–2 missing) result sets.
FR6. System shall allow marking ingredients "Use First" and weight scoring accordingly.
FR7. System shall calculate nutrition only from structured data, never LLM inference.
FR8. System shall persist user inventory and saved recipes per authenticated user.
FR9. System shall degrade gracefully to manual entry if detection fails or is unavailable.

## 18. Non-Functional Requirements

- **Cost:** infra cost should scale near-linearly with usage; no fixed high-cost always-on GPU servers.
- **Latency:** see TRD performance targets.
- **Reliability:** core retrieval/scoring path (no external AI calls) must work even if CV or LLM providers are down.
- **Privacy:** uploaded images auto-deleted after processing (configurable retention, default short).
- **Accessibility:** WCAG AA color contrast, screen-reader labels on primary actions.

## 19. Success Metrics

- Time from app open to first recipe recommendation.
- % of sessions ending in "Cook Now" selection.
- % of detections requiring manual correction (data quality proxy).
- Recipe selection rate (recommendations shown → recipe opened).

## 20. Product KPIs

- Weekly active rescuers (sessions with ≥1 completed recommendation flow).
- Average Rescue Score of selected recipes (proxy for recommendation quality).
- Cook-Now conversion rate.

## 21. Business / Impact Metrics

- Estimated ingredients "rescued" per session (count only, no unverified environmental/CO2 claims without a stated methodology — none is claimed in V1).
- Cost per active user (infra spend / MAU) — tracked explicitly given the cost-effectiveness mandate.

## 22. User Journey (summary — full flow in Workflow doc)

Open app → Scan or Add → Confirm ingredients → Set constraints → View ranked recipes with Rescue Score → Select → View adapted recipe + nutrition → Cook / Save.

## 23. Edge Cases

No ingredients detected; single ingredient; large ingredient count (>20); duplicate detections; unknown/unsupported ingredient; low-confidence detection; poor lighting/blur; non-food image; missing quantity; no feasible recipe at all; recipes only available with many missing ingredients; nutrition data unavailable for an ingredient.

## 24. Failure Scenarios

Vision API timeout/down; LLM API timeout/down; database unavailable; malformed image upload; network loss mid-flow. All must degrade to a usable state (see Workflow doc §Error Handling).

## 25. Privacy Considerations

Images are processed transiently and deleted post-inference by default. No image is used for anything beyond the user's own session unless explicit opt-in for model improvement is added later (not in V1). Minimal PII: email/auth identifier only.

## 26. Accessibility

Mobile-first responsive layout; minimum tap target 44px; color is never the sole indicator of confidence/feasibility (icons/text always accompany color); alt text on all icons.

## 27. Risks

| Risk | Impact |
|---|---|
| CV accuracy insufficient for user trust | High — core UX depends on it |
| LLM cost creep from over-use in adaptation | Medium — directly conflicts with cost-effectiveness goal |
| Recipe dataset sparse for certain ingredient combos | Medium — "no recipe found" too frequent hurts retention |
| Vendor pricing changes (inference/LLM provider) | Medium |

## 28. Mitigation Strategy

- Cap CV to a curated, well-supported class list; always offer manual correction.
- Hard-limit LLM calls to 1 normalization + 1 adaptation call per recipe view; cache LLM outputs per ingredient/recipe pair.
- Expand dataset coverage prioritized by real usage gaps (log "no recipe found" cases).
- Abstract inference/LLM provider behind an internal interface to allow swapping providers without rearchitecting.

## 29. Future Roadmap

V1 (this doc) → V1.1 (Food.com expansion, broader CV classes) → V2 (meal planning, expiry-aware prioritization with sourced methodology, grocery export).
