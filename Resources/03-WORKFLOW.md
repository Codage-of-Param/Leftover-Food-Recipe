# DOCUMENT 3 — SYSTEM & USER WORKFLOW DOCUMENT
## Food Rescue AI

Each workflow includes: Trigger, Actor, Preconditions, Step-by-step flow, Decision points, Success state, Failure state, Recovery.

---

## 1. First-Time User

**Trigger:** App opened for the first time.
**Actor:** New user (anonymous).
**Preconditions:** None.
**Flow:**
```
Open app → Splash → Home screen
Home shows: "What's in your kitchen?" with [Scan Food] [Add Ingredients]
No forced sign-up (auth deferred until Save/History is used)
```
**Success:** User reaches Home and initiates a scan or manual add.
**Failure:** App fails to load → cached splash + retry.
**Recovery:** Retry button; offline banner if no network.

## 2. Returning User

**Trigger:** App reopened.
**Actor:** Returning user (may or may not be authenticated).
**Flow:** Home screen loads directly; if authenticated, "Recent rescues" surfaces last session as a quick-resume card.
**Success:** User resumes or starts new session.
**Failure:** Session data fetch fails → Home still renders with scan/manual entry available (non-blocking).

## 3. Scan Food (Entry Point)

```
Home → [Scan Food] tap
  ↓
Camera permission check
  ├─ Granted → Camera interface
  └─ Denied → Fallback: [Upload from gallery] / [Add Ingredients manually]
```
**Decision point:** camera availability.
**Success:** Camera or upload interface shown.
**Failure:** No camera + no gallery access → route directly to manual entry with explanatory microcopy.

## 4. Upload Image

**Trigger:** User selects existing photo.
**Flow:** File picker → client-side size/type check → upload to backend → Image Preview screen → [Retake/Choose again] or [Confirm].
**Failure states:** file too large → inline error, prompt to choose smaller image; unsupported format → inline error listing accepted formats.

## 5. Camera Capture

**Flow:** Live camera view → capture → Image Preview → Confirm.
**Failure:** low light detected client-side (basic brightness heuristic) → non-blocking tip "try better lighting" but allow proceeding regardless.

## 6. OpenCV Preprocessing

**Actor:** System.
**Flow:** Validate → resize → normalize → color convert → pass to inference.
**Failure:** corrupt/unreadable image → reject before inference call, return error to client, user redirected to Image Preview to retry.

## 7. Object Detection

**Flow:** Preprocessed image → CV inference API → predictions with confidence.
**Decision points:**
- No objects detected → "No ingredients detected" state → offer manual add.
- All detections <70% confidence → all flagged, user must confirm each.
**Failure:** Inference API timeout/down → error state: "Detection unavailable right now — add ingredients manually" (never a dead end).

## 8. Ingredient Confirmation

```
Detected list shown with confidence badges
  ↓
User can: confirm item / remove item / correct label (opens manual search) / add missed item
  ↓
[Continue] enabled once ≥1 confirmed ingredient exists
```
**Edge case — 50+ detections:** list is capped/paginated; system flags "large number detected, please review" and encourages trimming to relevant items.
**Edge case — duplicate detections:** deduplicated by ingredient_id before display, confidence shown = max of duplicates.

## 9. Manual Ingredient Addition

**Flow:** Search box (trigram search against ingredients+aliases) → select → set quantity/unit → optionally mark Use First → add to list.
**Failure:** ingredient not found in DB → offer "add as custom item" flagged as unscored-for-nutrition, still usable for text-matching against recipes' free-text ingredient names where possible; otherwise excluded from scoring with a clear note.

## 10. Quantity Editing

**Flow:** Tap ingredient → quantity stepper + unit dropdown → save.
**Edge case:** quantity left blank → stored as null, Feasibility Engine treats as "unknown," never assumed sufficient.

## 11. Use First Selection

**Flow:** Toggle star icon per ingredient → reflected immediately in scoring preview (if shown) and in final Rescue Score.

## 12. Recipe Retrieval

**Actor:** System.
**Flow:** Confirmed ingredients + constraints → SQL candidate query (≤50 recipes) → passed to Feasibility Engine.
**Failure:** DB unavailable → error state, retry with backoff, generic "can't load recipes right now" message.

## 13. Feasibility Analysis

**Flow:** Each candidate classified A/B/C/D (TRD §16).
**Decision point:** if all candidates are class D → proceed to "No reliable recipe found" (workflow 22).

## 14. Rescue Scoring

**Flow:** Classes A/B/C scored via formula (TRD §17); class D excluded from ranked results entirely.

## 15. Recipe Ranking

**Flow:** Sort by Rescue Score desc, tie-break by fewer missing → shorter time. Split into `cook_now` (0 missing) and `buy_one_or_two` (1–2 missing) buckets for display.

## 16. Recipe Selection

**Flow:** User taps a recipe card → Recipe Detail screen loads (ingredients, steps, score breakdown, nutrition).

## 17. Recipe Adaptation

**Trigger:** Recipe has 1 missing required ingredient AND user has an unused inventory item.
**Flow:** LLM adaptation call (TRD §19) → validate substitute against `ingredients` table → if valid, show "swap X for Y" suggestion; if invalid/unavailable, show recipe as-is with missing ingredient listed plainly.
**Failure:** LLM timeout/down → skip adaptation, show recipe without substitution suggestion (non-blocking).

## 18. Nutrition Calculation

**Flow:** Sum `nutrition_data` for matched ingredients, scaled to servings → display; if any ingredient lacks data, show "partial estimate" label (TRD §21).

## 19. Save Recipe

**Precondition:** User authenticated.
**Flow:** [Save] tap → if not authenticated, prompt lightweight sign-in (magic link) → save row created.
**Failure:** not authenticated and user declines sign-in → recipe remains viewable, just not saved; no forced blocking.

## 20. Start Cooking

**Flow:** Recipe Detail → [Start Cooking] → step-by-step instructions view (from `recipes.instructions`), no additional AI call required.

## 21. Error Handling (general pattern)

Every external dependency (CV API, LLM API, DB, network) has a defined non-blocking fallback — the app never presents a dead-end screen with no next action.

## 22. No Recipe Found

**Trigger:** All candidates classified D, or zero candidates returned.
**Flow:** Explicit state: "No reliable recipe found with what you have." → Suggestions: [Loosen constraints] [Add more ingredients] [Browse Buy 1–2 anyway] (shown only if such recipes exist even if scored low).
**This is an intentional, honest terminal state — never auto-generated as a forced recipe.**

## 23. Low-Confidence Detection

**Flow:** Item shown with a "please confirm" badge; cannot silently pass into scoring without user acknowledgment (implicit acknowledgment = user proceeding past Confirmation screen without removing it).

## 24. API Failure (CV or LLM provider)

**Flow:** Timeout at configured threshold (TRD §39) → graceful fallback per that specific feature (manual entry / skip adaptation) → error logged with correlation ID, not shown to user.

## 25. Model Failure (bad/garbage output)

**Flow:** LLM output failing schema validation → one retry → discard and fall back (TRD §20). CV output with implausible values (e.g., 0 detections with high image entropy) → still shown as "no ingredients detected," never fabricated.

## 26. Dataset Missing Information

**Flow:** Recipe missing quantity/instructions field → recipe still retrievable/scorable using available fields; UI shows "instructions unavailable" rather than blocking display of the recipe card.

## 27. Unsupported Ingredient

**Flow:** Detected or entered ingredient not in `ingredients` table and not resolvable via LLM normalization fallback → shown as "unrecognized" chip, excluded from scoring, user can still keep it as a text-only note attached to the session.

---

## ASCII Flowchart — Core Journey

```
[Home]
   |
   +--> [Scan Food] --> [Camera/Upload] --> [Preprocess] --> [Detect]
   |                                                          |
   |                                             (low conf / fail)
   |                                                          |
   +--> [Add Ingredients] <-------------------------------- [Confirm/Correct]
                  |
           [Quantity + Use First]
                  |
           [Constraints: time/servings/diet]
                  |
           [Retrieve Candidates] --(none feasible)--> [No Reliable Recipe]
                  |
           [Feasibility Classify A/B/C/D]
                  |
           [Rescue Score A/B/C]
                  |
         [Cook Now]      [Buy 1-2]
             |                |
             +------[Recipe Detail]------+
                        |
              [LLM Adaptation if applicable]
                        |
                [Nutrition Calculation]
                        |
              [Cook / Save / Rescue Another]
```
