# DOCUMENT 4 — UI/UX DESIGN SPECIFICATION
## Food Rescue AI

Mobile-first. Design direction: modern, clean, food-focused, trustworthy. Explicitly **not** a chatbot or "AI experiment" look — feels like a simple food utility.

---

## Design System

**Color palette**
- Primary: warm green (`#2F7D5A`) — freshness/trust, used for primary CTAs and "Cook Now."
- Accent: warm amber (`#E8A23D`) — used for "Buy 1–2" and attention states, not alarming.
- Neutral background: off-white (`#FAF9F6`), text `#1F2421`.
- Semantic: success `#2F7D5A`, warning `#E8A23D`, error `#C64A3A` — always paired with icon/text, never color alone.

**Typography:** one clean humanist sans-serif (e.g., Inter). Headings semi-bold, body regular. Base size 16px mobile.

**Spacing/grid:** 8px base unit; 16/24/32 spacing scale; single-column mobile layout, 2-column max on tablet.

**Border radius:** 12px cards/buttons — soft but not overly rounded/toy-like.

**Components:** primary/secondary buttons, ingredient chip (with confidence dot + remove ×), recipe card, badge (feasibility class), progress/loading skeleton, bottom nav (Home / Saved / Profile), modal (score breakdown), toast (non-blocking errors), confirmation dialog (destructive actions only).

---

## Screens

### 1. Splash/Loading
Purpose: brand load state. Logo + tagline. Auto-transitions to Home.

### 2. Home
Purpose: entry point. Header: app name. Main content: "What's in your kitchen?" headline + two primary CTAs `[Scan Food]` `[Add Ingredients]`. Secondary: "Recent rescue" resume card if applicable. Empty state: first-time messaging. Bottom nav visible.

### 3. Scan Food
Purpose: choose capture method. `[Open Camera]` `[Upload Photo]`. Error state: camera permission denied → explanatory microcopy + fallback link to manual entry.

### 4. Camera Interface
Purpose: live capture. Full-screen viewfinder, shutter button, gallery-upload icon alternative. Loading state: N/A (instant). 

### 5. Image Preview
Purpose: confirm before processing. Captured image, `[Retake]` `[Use Photo]`. 

### 6. Detection Processing
Purpose: feedback during inference. Skeleton/spinner with short label ("Looking at your ingredients..."). Timeout state after threshold → routes to error/fallback.

### 7. Detection Result
Purpose: show raw detections before confirmation. List of ingredient chips with confidence % and color-coded badge (high/med/low). Tapping a low-confidence chip opens correction search.

### 8. Ingredient Confirmation
Purpose: finalize ingredient list. Editable chip list, `[+ Add ingredient]`, `[Continue]` disabled until ≥1 confirmed. Empty state: "No ingredients detected" with prominent `[Add manually]`.

### 9. Manual Ingredient Search
Purpose: text-search add flow. Search bar with live-filtered results (trigram match), tap to add with default quantity, adjustable inline.

### 10. Quantity Editor
Purpose: set amount/unit per ingredient. Stepper + unit dropdown, inline on the ingredient row (not necessarily a separate full screen — implementation may render as an expandable row).

### 11. Use First Selection
Purpose: prioritize ingredients. Star toggle on each ingredient chip/row; selected items visually distinguished (filled star + subtle highlight).

### 12. Cooking Preferences
Purpose: set constraints. Time (chip select: 15/30/45/60+ min), servings (stepper), dietary preference (chip select), cuisine (optional chip select). `[Find Recipes]` CTA.

### 13. Recipe Loading
Purpose: feedback while retrieval+scoring runs. Skeleton recipe cards.

### 14. Recipe Recommendations
Purpose: primary results screen. Two clearly separated sections: **"Cook Now"** (green header) and **"Buy 1–2 Ingredients"** (amber header), each a scrollable card list. Empty/failure state: "No Reliable Recipe Found" screen (see below) shown instead when applicable.

### 15. Recipe Comparison
Purpose: optional side-by-side of 2 selected cards (Should Have, not Must — simple toggle/expand of two cards rather than a bespoke screen, to control scope).

### 16. Recipe Detail
Purpose: full recipe view. Hero area: title, Rescue Score badge (tappable), feasibility badge, time/servings. Ingredients section (owned vs missing, visually distinct). Steps section. `[Start Cooking]` primary CTA, `[Save]` secondary.

### 17. Nutrition Section
Purpose: nutrition breakdown, inline within Recipe Detail (not a separate screen) — calories/protein/carbs/fat, with a "partial estimate" note when applicable.

### 18. Rescue Score Explanation
Purpose: modal/bottom-sheet on score tap. Shows the exact component breakdown table (matches TRD §17 formula) — never a vague AI justification.

### 19. Missing Ingredient Section
Purpose: within Recipe Detail — lists missing required ingredients, and if applicable the AI-suggested substitute clearly labeled "AI-suggested, unverified" with its source ingredient from user inventory.

### 20. Cook Now
Purpose: section within Recommendations (§14), not a separate screen — see above.

### 21. Buy Ingredient
Purpose: section within Recommendations (§14) — see above.

### 22. Saved Recipes
Purpose: list of saved recipes (auth required). Card list, tap to open Recipe Detail. Empty state: "No saved recipes yet."

### 23. Rescue History
Purpose: list of past sessions (auth required, Should Have). Date + ingredient summary + recipe chosen, tap to view.

### 24. Profile/Settings
Purpose: minimal — sign in/out, image retention notice, app version. No feature bloat.

### 25. Error States
Purpose: consistent pattern across app — icon + one-line explanation + one clear recovery action (retry / manual entry / go home). Never a raw technical message.

### 26. Empty States
Purpose: consistent pattern — friendly illustration-free text (avoid over-designing for hackathon-gimmick feel), one clear CTA.

---

## Recipe Card Design

```
--------------------------------
[image]  Paneer Fried Rice
         ⭐ Rescue Score 94

         ✓ Uses 4/4 ingredients
         ⚠ Missing 1 ingredient

         ⏱ 15 min      🍽 2 servings
         Protein 18g · 420 kcal

         [ View Recipe ]
--------------------------------
```

## Rescue Score UX (breakdown modal)

```
Rescue Score 94

Ingredient coverage       40/40
Priority ingredients      15/15
Quantity feasibility      25/25
Time compatibility        10/10
Feasibility class         10/10
Missing ingredient         -5
Extra ingredient            0
                           ----
                            94/100
```
Values shown always sum exactly to the total displayed on the card — enforced by using the same backend response object for both card and modal.

## Design Principles (applied)

1. No chatbot visual language anywhere in the app.
2. Every screen has one obvious primary action.
3. Every AI-derived value (detection confidence, LLM substitution) is visually distinguished from verified data.
4. Uncertainty is never hidden — "unknown," "partial estimate," "unverified" are real UI states, not edge cases to suppress.
5. "Cook Now" vs "Buy 1–2" is the single most important visual distinction on the Recommendations screen.
