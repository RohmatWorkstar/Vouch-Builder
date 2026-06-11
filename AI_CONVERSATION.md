# AI Conversation Export — Building the Night-Shift Handover

This document is an export of the AI-assisted development session used to build this project.  
**Tool used:** Antigravity (Google DeepMind Agentic Coding Assistant)

---

## Phase 1: Planning & Architecture (2 min)

**Me:** Read this project, what's the task, and create a plan.

**AI:** *(After reading BRIEF.md, README.md, events.json, and night-logs.md)*

The AI identified the core challenges:
1. Merging two data formats (structured JSON + messy free-text markdown with Chinese text)
2. Cross-night reconciliation (tracking issue lifecycles across multiple shifts)
3. Action-first reporting (not chronological retelling)
4. Strict grounding (every statement must trace to source data)

**Proposed Architecture:** A 2-pass LLM pipeline:
- **Pass 1:** Use LLM to extract structured events from the markdown log
- **Reconciliation Engine:** Deterministic JavaScript logic to group events into threads and track status
- **Pass 2:** Use LLM to generate the final grounded, action-first report

I approved the plan and the AI began implementation.

---

## Phase 2: Implementation (5 min)

The AI scaffolded the entire project in one pass:
- `src/index.js` — Express server
- `src/services/dataIngestion.js` — Reads both data files
- `src/services/llm.js` — LLM integration with structured prompts
- `src/services/reconciliation.js` — Thread grouping & status tracking
- `src/controllers/handoverController.js` — API endpoint logic
- `public/index.html` — Simple frontend to view the report
- `DECISIONS.md` and `AGENTS.md` — Documentation

---

## Phase 3: Debugging — The Most Interesting Part (15 min)

This is where the real problem-solving happened.

### Problem 1: API Key Not Loading
```
GEMINI_API_KEY is not set in .env. LLM calls will fail.
```
**Root cause:** The `.env` file wasn't saved to disk before starting the server.  
**Fix:** Saved the file and restarted the server.

### Problem 2: Gemini 2.5 Pro — Quota Exceeded (429)
```
Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro
```
**Root cause:** The free-tier API key had zero quota for `gemini-2.5-pro`.  
**Fix:** Switched the report generation model from `gemini-2.5-pro` to `gemini-2.5-flash`.

### Problem 3: Gemini 2.5 Flash — High Demand (503)
```
This model is currently experiencing high demand.
```
**Root cause:** Google's servers were overloaded for the 2.5-flash model.  
**Fix:** Added auto-retry logic (3 retries with 2s delay). Tried switching to `gemini-1.5-flash`.

### Problem 4: Gemini 1.5 Flash — Model Not Found (404)
```
models/gemini-1.5-flash is not found for API version v1beta
```
**Root cause:** The `@google/genai` SDK (v1beta) doesn't support the older `1.5-flash` model.  
**Pivotal Decision:** Switched the entire LLM provider from Google Gemini to **Groq** (using `groq-sdk`), which offers free, ultra-fast inference.

### Problem 5: Groq — Model Decommissioned (400)
```
The model `llama3-70b-8192` has been decommissioned
```
**Root cause:** The model ID I initially used was outdated.  
**Fix:** Queried the Groq API directly to get the list of currently active models:
```javascript
fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': 'Bearer ...' } })
```
This returned the active model list, and I switched to `llama-3.3-70b-versatile`.

**After this final fix, the project ran successfully.** ✅

---

## Phase 4: Documentation & Cleanup (5 min)

- Updated all documentation (`AGENTS.md`, `DECISIONS.md`) to reflect the Groq migration
- Removed unused `@google/genai` dependency from `package.json`
- Added `npm start` script
- Updated `.env.example`
- Created `EXPLANATION.md` with full project walkthrough

---

## Key Takeaway

The most valuable part of AI-assisted development wasn't the code generation — it was the **rapid debugging cycle**. When the Gemini API failed in 4 different ways, the AI was able to:
1. Diagnose each error precisely
2. Query the Groq API to discover available models programmatically
3. Rewrite the entire LLM integration layer in seconds
4. Keep all documentation consistent after the pivot

What would have taken significant manual research (reading docs, finding model IDs, rewriting SDK calls) was handled in minutes.
