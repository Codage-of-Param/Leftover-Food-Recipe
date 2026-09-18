# 🍽️ Left over food recipe generator

> **"Don't ask what you want to cook. Ask what food you can rescue."**

midnight chef is an **AI-powered food rescue application** that identifies ingredients users already have through **image scanning or manual entry** and recommends the most **feasible recipes** they can actually cook.

Instead of asking users to search for a recipe first, midnight chef works in the opposite direction:

**What do you already have? → What can you actually cook?**

The system combines **Computer Vision, structured recipe retrieval, deterministic feasibility analysis, Rescue Scoring, nutrition data, and narrowly scoped LLM assistance** to turn available ingredients into practical cooking options.

---

## ✨ Why midnight chef?

Many recipe applications start with:

> "What recipe do you want to cook?"

But users often have a different problem:

> "I have some leftover ingredients. What can I make with them?"

midnight chef solves this uncertainty by analyzing the user's available ingredients and determining:

* 🥕 What recipes can be cooked with the available ingredients
* 🛒 Which recipes require only 1–2 additional ingredients
* ⏱️ Whether the recipe fits the user's available cooking time
* ⭐ Which ingredients should be prioritized using **Use First**
* 🥗 Available nutrition information

The system is intentionally **not designed as a general-purpose cooking chatbot**. AI is used internally for specific tasks while recipe retrieval and scoring remain structured and deterministic.

---

## 🎯 Problem

Home cooks frequently have usable leftovers or random ingredients but don't know what they can realistically prepare.

Existing approaches have limitations:

| Approach            | Problem                                                              |
| ------------------- | -------------------------------------------------------------------- |
| Recipe search apps  | Users need to know what dish they want first                         |
| General AI chatbots | Can generate recipes but don't perform structured inventory matching |
| Pantry apps         | Track ingredients but don't necessarily rank recipes by feasibility  |
| Manual searching    | Time-consuming and difficult with irregular ingredients              |

midnight chef addresses this by connecting:

**Available Food → Ingredient Matching → Feasibility → Recipe**

---

## 🚀 Core Features

### 📸 1. Image-Based Ingredient Detection

Take a photo of your fridge, kitchen ingredients, or food items.

The system:

1. Validates the uploaded image
2. Preprocesses it using computer vision
3. Sends it to a Computer Vision inference service
4. Filters predictions using confidence scores
5. Maps detected labels to canonical ingredients
6. Allows the user to confirm, remove, correct, or add ingredients

Low-confidence detections are explicitly flagged for confirmation instead of being silently trusted.

---

### ✍️ 2. Manual Ingredient Entry

Users can manually add ingredients when:

* Camera access is unavailable
* Detection fails
* An ingredient was missed
* A detected ingredient is incorrect

Ingredients can also include:

* Quantity
* Unit
* **Use First** priority

---

### 🧠 3. Ingredient Normalization

Ingredient names can appear in many forms.

For example:

```text
tomatoes
Tomato
tamatar
```

The system first attempts deterministic matching using ingredient aliases.

If no match is found, an LLM fallback can suggest a canonical ingredient, which is then validated against the database before being accepted.

---

### 🔎 4. Structured Recipe Retrieval

The system retrieves a candidate set of up to 6 recipes and sends those candidates through the feasibility and scoring engines.

This makes the recommendation process:

* Faster
* More predictable
* Auditable
* Less expensive

---

### ⚙️ 5. Feasibility Engine

Every candidate recipe is analyzed based on required and optional ingredients.

Recipes are classified into four categories:

| Class | Meaning                                   |
| ----- | ----------------------------------------- |
| **A** | Fully feasible                            |
| **B** | Feasible with substitution                |
| **C** | Feasible if 1–2 ingredients are purchased |
| **D** | Not recommended                           |

The system does **not** force an unsuitable recipe when no reliable option exists.

Instead, it can return:

> **"No reliable recipe found."**

This is an intentional part of the product design.

---

### 🛒 6. Cook Now vs Buy 1–2

Recipes are separated into two practical groups:

```text
🍳 Cook Now
     ↓
0 missing required ingredients

🛒 Buy 1–2
     ↓
1–2 missing required ingredients
```

This allows users to immediately understand whether they can start cooking or need a small additional purchase.

---

### 🥬 7. Use First

Users can mark ingredients that should be prioritized.

For example:

```text
⭐ Spinach — Use First
Tomato
Rice
Paneer
```

Recipes using prioritized ingredients receive a scoring bonus.

---

### 🤖 8. AI Recipe Adaptation

When a recipe has one missing ingredient and a suitable ingredient exists in the user's inventory, the LLM can suggest a substitution.

Example:

```text
Missing:
Paneer

Available:
Tofu

AI Suggestion:
Tofu can replace paneer for this recipe.
```

AI suggestions are validated against the canonical ingredient database before being applied.

---

### 🥗 9. Nutrition Information

Nutrition is calculated from structured nutrition data rather than generated by the LLM.

The V1 architecture uses a curated subset of **USDA FoodData Central** data for supported ingredients.

Supported fields include:

* Calories
* Protein
* Carbohydrates
* Fat
* Fiber

---

### 🔐 10. Authentication & Saved Recipes

Users can browse and use the core scan → recommendation flow without being forced to sign up.

Authentication is required for features such as:

* Saving recipes
* Viewing rescue history
* Persistent user data

Supabase Auth handles authentication and user-scoped access.

---

## 🔄 Application Workflow

```text
                    ┌──────────────┐
                    │     HOME     │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        📸 Scan Food              ✍️ Add Ingredients
              │                         │
        Camera / Upload                  │
              │                         │
        OpenCV Processing                │
              │                         │
        CV Detection                     │
              │                         │
              └────────────┬─────────────┘
                           │
                  Confirm / Correct
                           │
                  Quantity + Use First
                           │
                 Set User Constraints
                           │
                 SQL Recipe Retrieval
                           │
                  Feasibility Engine
                           │
                           │
             ┌─────────────┴─────────────┐
             │                           │
         🍳 Cook Now                🛒 Buy 1–2
             │                           │
             └─────────────┬─────────────┘
                           │
                    Recipe Details
                           │
                ┌──────────┴──────────┐
                │                     │
         AI Adaptation           Nutrition
                │                     │
                └──────────┬──────────┘
                           │
                  🍳 Cook / Save
```

The complete workflow is designed so external service failures have non-blocking fallbacks rather than leaving users at a dead end.

---

## 🏗️ System Architecture

midnight chef follows a **modular monolith architecture** instead of starting with microservices.

```text
                    ┌───────────────────────┐
                    │   Next.js Frontend    │
                    │        Vercel         │
                    └──────────┬────────────┘
                               │
                          HTTPS / JSON
                               │
                    ┌──────────▼──────────┐
                    │    FastAPI Backend  │
                    │    Modular Monolith │
                    └──────────┬──────────┘
                               │
       ┌────────────┬──────────┼──────────┬
       │            │          │          │             
       ▼            ▼          ▼          ▼             
   Supabase       Recipe    Feasibility  Nutrition
   Postgres       Retrieval   Engine       Data
       │
       ├── Auth
       └── Storage

       ┌──────────────────┐
       │ External AI APIs │
       ├──────────────────┤
       │ CV Inference     │
       │ LLM              │
       └──────────────────┘
```

The architecture uses managed/serverless services and pay-per-call AI inference to minimize fixed infrastructure costs.

---

## 🛠️ Technology Stack

| Layer               | Technology                     |
| ------------------- | ------------------------------ |
| Frontend            | Next.js, Node.js, TypeScript     |
| Styling             | Tailwind CSS                   |
| Backend             | FastAPI, Supabase              |
| Language            | Python                         |
| Database            | PostgreSQL                     |
| Database Platform   | Supabase                       |
| Authentication      | Supabase Auth                  |
| Storage             | Supabase Storage               |
| Computer Vision     | OpenCV + external CV inference |
| AI/LLM              | Pay-per-call LLM API           |
| Recipe Dataset      | INDoRI                         |
| Nutrition Dataset   | USDA FoodData Central subset   |
| Frontend Deployment | Vercel                         |
| Backend Deployment  | Render                         |
| CI/CD               | GitHub Actions                 |

The selected architecture deliberately avoids unnecessary services such as dedicated vector databases, always-on GPUs, Kubernetes, and Redis in V1.

---

## 🗄️ Database

The main database is PostgreSQL through Supabase.

### Core Tables

```text
users
   │
   └── rescue_sessions
          │
          └── inventory_items
                    │
                    └── ingredients
                           │
                           ├── ingredient_aliases
                           └── nutrition_data

recipes
   │
   └── recipe_ingredients
             │
             └── ingredients

users
   │
   └── saved_recipes
             │
             └── recipes
```

Important tables include:

* `ingredients`
* `ingredient_aliases`
* `recipes`
* `recipe_ingredients`
* `nutrition_data`
* `users`
* `rescue_sessions`
* `inventory_items`
* `saved_recipes`

---

## 🔌 API Overview

The backend exposes versioned REST APIs under:

```text
/api/v1/
```

### Detect Ingredients

```http
POST /api/v1/detect
```

Accepts an image and returns detected ingredients with confidence values.

Example:

```json
{
  "session_id": "uuid",
  "detections": [
    {
      "ingredient_id": "uuid",
      "label": "tomato",
      "confidence": 0.96
    },
    {
      "ingredient_id": "uuid",
      "label": "paneer",
      "confidence": 0.64
    }
  ]
}
```

### Get Recommendations

```http
POST /api/v1/recommendations
```

Example request:

```json
{
  "session_id": "uuid",
  "constraints": {
    "max_time_minutes": 20,
    "servings": 2,
    "diet": "vegetarian"
  }
}
```

The response separates recipes into `cook_now` and `buy_one_or_two` categories.

### Get Score Breakdown

```http
GET /api/v1/recipes/{id}/score-breakdown
```

Returns the individual components contributing to the Rescue Score.

---

## 🔒 Security & Privacy

Food Rescue AI follows several security principles:

* JPEG/PNG/WebP image allowlist
* Maximum 1 MB image upload
* Image validation before paid inference
* OpenCV re-encoding of uploaded images
* Parameterized database queries
* Environment-based secret management
* Restricted CORS
* Supabase Row Level Security
* LLM output validation
* Rate limiting
* Correlation IDs for errors

Uploaded images are designed to be processed transiently and automatically deleted according to the configured retention policy.

---

## 💰 Cost-Efficient Architecture

The project is designed around **usage-based infrastructure**.

```text
Frontend       → Vercel
Backend        → Render
Database       → Supabase
CV             → Pay-per-call inference
LLM            → Limited pay-per-call usage
Recipes        → Preloaded PostgreSQL data
Nutrition      → Preloaded PostgreSQL data
```

Instead of maintaining an always-on GPU or multiple managed services, the architecture keeps AI inference pay-per-call and uses a single Supabase project for database, authentication, and storage.

---

## 🧠 What Makes It Different?

### Traditional Recipe Search

```text
Choose Recipe
     ↓
Check Ingredients
     ↓
Buy Missing Items
     ↓
Cook
```

### midnight chef

```text
See What You Already Have
          ↓
    Detect Ingredients
          ↓
     Match Recipes
          ↓
   Check Feasibility
          ↓
    Calculate Rescue Score
          ↓
 ┌────────┴─────────┐
 │                  │
Cook Now          Buy 1–2
 │                  │
 └────────┬─────────┘
          ↓
        Cook
```

The key idea is **feasibility-first recommendation**, rather than creativity-first recipe generation.

---

## 📊 Rescue Score

The scoring system is intentionally explainable.

| Component                  | Maximum |
| -------------------------- | ------: |
| Ingredient Coverage        |      40 |
| Priority Ingredient Bonus  |      15 |
| Quantity Feasibility       |      25 |
| Time Compatibility         |      10 |
| Recipe Feasibility         |      10 |
| Missing Ingredient Penalty |     -20 |
| Extra Ingredient Penalty   |      -5 |

Final score:

```text
0 ─────────────────────────────── 100
       │              │
     Lower          Higher
   compatibility   compatibility
```

The score is calculated server-side and does not depend on an LLM or ML model.

---

## 🧪 Testing

The project includes testing across multiple layers:

### Unit Testing

Focus areas:

* Feasibility Engine
* Rescue Score
* Ingredient normalization
* Nutrition calculations

### Integration Testing

* API endpoints
* Database interactions
* Authentication
* Recipe retrieval

### Computer Vision Evaluation

* Precision
* Recall
* Held-out labeled image dataset

### LLM Validation

* JSON schema compliance
* Invalid output handling
* Substitution validation

### Load Testing

Retrieval and scoring endpoints can be tested using tools such as:

```text
Locust
k6
```

---

## ⚠️ Current V1 Limitations

The first production version intentionally limits scope.

* Approximately 25–40 supported CV ingredient classes
* Presence-based detection rather than exact item counting
* Full recipe-level USDA matching is not included
* Food.com dataset integration is deferred
* No social/recipe-sharing functionality
* No meal-planning system
* No expiry-date authority
* No dedicated vector database
* No always-on GPU model hosting

These limitations are deliberate to keep V1 fast, affordable, and reliable.

---

## 🗺️ Roadmap

### V1

* [x] Image ingredient detection
* [x] Manual ingredient entry
* [x] Ingredient normalization
* [x] Structured recipe retrieval
* [x] Feasibility Engine
* [x] Rescue Scoring
* [x] Cook Now / Buy 1–2
* [x] Use First
* [x] LLM recipe adaptation
* [x] Curated nutrition
* [x] Authentication
* [x] Saved recipes

### V1.1

* [ ] Food.com dataset expansion
* [ ] Broader Computer Vision classes
* [ ] Improved ingredient coverage
* [ ] Improved detection accuracy

### V2+

* [ ] Meal planning
* [ ] Grocery list export
* [ ] Multi-day inventory
* [ ] Expiry-aware prioritization
* [ ] Full recipe-level nutrition matching
* [ ] Social sharing

The documented roadmap progresses from V1 to broader recipe/CV coverage and eventually meal-planning and grocery functionality.

---

## 🌱 Impact

midnight chef focuses on reducing food waste caused by **uncertainty and lack of practical recipe knowledge**.

Instead of claiming unverified environmental savings, V1 tracks measurable product-level indicators such as:

* Ingredients rescued per session
* Cook-Now conversion
* Recipe selection rate
* Detection correction rate
* Cost per active user

This keeps the project's impact claims measurable and evidence-based.

---

## 👨‍💻 Development Philosophy

Food Rescue AI follows three core principles:

### 1. Feasibility over Creativity

A recipe that sounds good but cannot be cooked with the available ingredients is not a useful recommendation.

### 2. Deterministic Logic over Unnecessary AI

AI is used where it adds value:

```text
Computer Vision → Ingredient Detection
LLM → Normalization Fallback
LLM → Recipe Adaptation
```

But core business decisions remain deterministic:

```text
Recipe Retrieval
Feasibility
Rescue Score
Nutrition
```

### 3. Honest Recommendations

If no reliable recipe exists, the system says so.

> **No reliable recipe found.**

It does not fabricate a recipe just to produce an answer.

---

## 📜 License

Add your preferred open-source license here, such as **MIT License**, before publishing the repository.

---

## ⭐ Project Summary

**midnight chef** turns:

```text
🥕 What I Have
       ↓
📸 Detect / ✍️ Add
       ↓
🧠 Understand
       ↓
🔎 Find Recipes
       ↓
⚙️ Check Feasibility
       ↓
⭐ Rescue Score
       ↓
🍳 Cook Now / 🛒 Buy 1–2
       ↓
🥗 Nutrition + AI Adaptation
       ↓
♻️ Rescue Food
```

### The goal is simple:

> **Don't ask what you want to cook. Ask what food you can rescue.**

# Live : **[midnight chef](https://midnightchef.vercel.app)**
