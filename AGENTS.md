# Agents & AI Collaboration

This project was built with the assistance of Antigravity, an advanced agentic coding assistant powered by Google DeepMind.

## Role of the AI Assistant
- **Planning**: The AI assistant analyzed the `BRIEF.md`, understood the requirements, and proposed an architecture utilizing a 2-pass LLM pipeline combined with deterministic JavaScript logic.
- **Code Generation**: The AI generated the Node.js application structure, the `Express` server, the reconciliation logic, and the prompt engineering for the Groq API.
- **Documentation**: The AI drafted the `DECISIONS.md` and this `AGENTS.md` file.

## Tools Used
- `groq-sdk` (Using `llama-3.3-70b-versatile` for both extraction and report generation due to its speed and free-tier reliability).
- Node.js environment for execution.

## Prompts and Strategy
The core of the LLM strategy lies in `src/services/llm.js`. We used a two-pass approach to constrain the LLM's creativity:
1. **Extraction**: Forced Groq's Llama model to return a strict JSON array representing events from free-text using `json_object` response format.
2. **Generation**: Instructed Groq to act as a Night Auditor, taking pre-reconciled structured data and formatting it, explicitly requiring source citations (grounding) for every sentence.
