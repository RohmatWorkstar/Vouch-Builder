# Vouch Night-Shift Handover Generator

An automated service that generates **action-first, grounded handover reports** for hotel morning managers. Ingests both structured event logs and free-text relief-staff notes, reconciles issues across multiple nights, and produces a report organized by urgency — not chronology.

Built for the [Vouch Builder Test](./BRIEF.md).

---

## Quick Start

### 1. Prerequisites
- Node.js v18+
- A [Groq API Key](https://console.groq.com/keys) (free tier works)

### 2. Setup
```bash
git clone https://github.com/RohmatWorkstar/Vouch-Builder.git
cd Vouch-Builder
npm install
```

Create a `.env` file (or copy `.env.example`):
```env
GROK_API_KEY=your_groq_api_key_here
PORT=3000
```

### 3. Run
```bash
npm start
```

### 4. Generate a Handover

**Via curl:**
```bash
curl "http://localhost:3000/api/handover?date=2026-05-30"
```

**Via browser:**
Open [http://localhost:3000](http://localhost:3000) and click "Generate Handover."

The `date` parameter controls which morning handover to generate (format: `YYYY-MM-DD`). Defaults to `2026-05-30`.

---

## Architecture

```
Free-text log ──► [LLM Pass 1: Extract] ──► Structured events
                                                    │
Structured events (events.json) ────────────────────┤
                                                    ▼
                                          [Reconciliation Engine]
                                          (Deterministic JavaScript)
                                                    │
                                          Categorized threads:
                                          • Still Open
                                          • Newly Resolved
                                          • New Tonight
                                          + Contradiction flags
                                                    │
                                                    ▼
                                          [LLM Pass 2: Report]
                                                    │
                                                    ▼
                                          Action-first handover:
                                          🔴 On Fire
                                          🟡 Pending
                                          ℹ️ FYI
                                          ⚠️ Requires Review
```

**Key design choice:** Reconciliation is deterministic (JavaScript), not LLM-driven. The LLM handles what it's good at — parsing messy text and writing concise summaries — while code handles status tracking, contradiction detection, and chronological ordering.

---

## Documentation

- [DECISIONS.md](./DECISIONS.md) — Tradeoffs, reconciliation strategy, grounding, hallucination prevention, prompt injection handling
- [AGENTS.md](./AGENTS.md) — AI collaboration details
- [AI_CONVERSATION.md](./AI_CONVERSATION.md) — Exported AI development session

---

## Sample Output

The API returns JSON with the report in Markdown format:

```json
{
  "success": true,
  "hotel": { "id": "lumen-sg", "name": "Lumen Boutique Hotel" },
  "targetDate": "2026-05-30",
  "report": "# Morning Handover — 2026-05-30\n\n## 🔴 ON FIRE...",
  "meta": {
    "totalEventsProcessed": 33,
    "extractedFromFreeText": 7,
    "threads": {
      "newTonight": 4,
      "newlyResolved": 2,
      "stillOpen": 5
    }
  }
}
```

---

## Structured Logging

The server outputs JSON-structured logs to stdout for production debugging:

```json
{"timestamp":"2026-05-30T07:01:23.456Z","level":"info","phase":"reconciliation","hotel_id":"lumen-sg","target_date":"2026-05-30","message":"Reconciliation complete","details":{"new_tonight":4,"newly_resolved":2,"still_open":5}}
```

Each log entry includes `hotel_id`, `target_date`, `phase`, and structured `details` — designed so another builder or AI agent can trace exactly why a handover looked the way it did.
