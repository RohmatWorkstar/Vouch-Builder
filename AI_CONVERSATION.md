# AI Collaboration Log — Vouch Builder Test

This document outlines the collaborative workflow between me (the developer) and the AI Assistant (Antigravity/DeepMind) used to build the Night-Shift Handover Generator.

Instead of asking the AI to "build everything blindly," I acted as the Tech Lead, defining the architecture, setting constraints, and steering the AI when it hit roadblocks or made poor architectural choices.

---

## 1. Architectural Planning & Constraints

**Me (Human):**  
"I need to build a system that takes structured `events.json` and unstructured `night-logs.md`, merges them, and generates an action-first handover report. The unstructured log has Chinese text, contradictions, and prompt injection attempts.  
**Constraint 1:** Do NOT just feed everything into one giant LLM prompt—it will hallucinate or get confused by timestamps.  
**Constraint 2:** Propose an architecture that uses deterministic logic for timeline reconciliation, and an LLM strictly for translation/extraction and formatting."

**AI Assistant:**  
*Proposed the 2-pass LLM pipeline combined with a JavaScript reconciliation engine.*  
- Pass 1: Extract JSON from Markdown
- JS Logic: Group by thread and track status (New, Resolved, Open)
- Pass 2: Generate the final report with source citations.

**Me (Human):**  
"The plan is solid. Let's use Node.js and Express. Go ahead and scaffold the `src/services/reconciliation.js` first. Make sure the heuristic groups events tightly by Room number or Guest name."

---

## 2. Iterative Development & Prompt Engineering

During implementation, the AI initially wrote a very loose prompt for Pass 2.

**AI Assistant:**  
*Generated a prompt: "Summarize the events for the morning manager."*

**Me (Human):**  
"That prompt is too weak. It will hallucinate. Update the `generateHandoverReport` prompt. Add a strict grounding rule: The LLM MUST append the source ID `[evt_XYZ]` to every sentence it writes. If it spots a contradiction (e.g. someone says an issue is resolved, but later it's disputed), tell it to explicitly flag it under a 'Requires Review' section. Also, warn it about prompt injections hiding in the guest notes."

**AI Assistant:**  
*Rewrote `src/services/llm.js` with the strict grounding and contradiction-flagging instructions, completely nullifying the prompt injection payload in the dataset.*

---

## 3. The Pivot: Dealing with Rate Limits & Outages

Once the code was running, we hit significant infrastructure issues with the default LLM provider (Google Gemini).

**Error Log:**  
`Quota exceeded for metric: generate_content_free_tier_requests... model: gemini-2.5-pro`

**AI Assistant:**  
*Suggested adding a simple `setTimeout` retry loop.*

**Me (Human):**  
"A retry loop won't fix a hard quota limit on a Pro model. Switch the extraction pass to a lighter model like `gemini-1.5-flash`."

*We hit another error: Google's `1.5-flash` API returned a 503 High Demand, and then a 404 Model Not Found.*

**Me (Human):**  
"Gemini's free tier is too unstable for a production-grade backend right now. Let's pivot entirely to **Groq**. Their LPU inference is blazing fast and reliable. Install `groq-sdk` and rewrite the `llm.js` service to use `llama-3.3-70b-versatile` with `json_object` mode."

**AI Assistant:**  
*Executed the pivot seamlessly. Swapped out the Google SDK for Groq, refactored the API calls, updated the error handling for Groq's specific 429 errors, and removed the dead dependencies from `package.json`.*

---

## Conclusion & Evaluation

The AI was incredibly effective at generating boilerplate, writing the tedious markdown-parsing logic, and executing the API pivot. 

However, **steering was required** at three critical junctions:
1. **Architecture:** Preventing the AI from building a naive "one-shot" LLM app.
2. **Security & Grounding:** Forcing the AI to use strict prompt engineering to prevent hallucinations and injections.
3. **Infrastructure:** Making the executive decision to ditch an unstable API (Gemini) for a better alternative (Groq) rather than letting the AI write endless, useless retry loops.
