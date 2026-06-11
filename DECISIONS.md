# Decisions

## What was built and what was skipped
**Built**:
- A Node.js backend using Express to serve the handover generation.
- An ingestion pipeline that reads both structured `events.json` and unstructured `night-logs.md`.
- A 2-pass LLM pipeline using Groq (Llama 3.3):
  1. Pass 1: Extract unstructured text into structured JSON matching the `events.json` schema using `json_object` mode.
  2. Pass 2: Generate the final action-first handover report from the reconciled events.
- A simple frontend (`public/index.html`) to visualize the report.
- A reconciliation engine in JavaScript to group events by thread and track their lifecycle across nights.

**Skipped**:
- Advanced authentication and security on the API endpoint.
- Database integration (the data is read directly from the filesystem).
- Robust handling of edge cases in datetime parsing.
- A sophisticated frontend framework (used Vanilla JS and HTML).

## How reconciliation across nights is handled
- Events are loaded into memory and sorted chronologically.
- A custom logic layer (`src/services/reconciliation.js`) groups events into "threads" using a heuristic (Room number, Guest name, or Issue category).
- The logic determines the final status of each thread as of the target shift (e.g., Saturday 07:00 AM) and categorizes them into: `New tonight`, `Newly resolved`, and `Still open`.
- This ensures the LLM receives only the *latest* state of a thread and understands its history, preventing the LLM from hallucinating old issues as new ones.

## Grounding and Contradictions
- We avoid relying entirely on the LLM to figure out the chronology. The JavaScript logic handles grouping and chronological sorting, providing a structured summary to the LLM.
- **Prompt Engineering**: The LLM in Pass 2 is explicitly instructed to ground every claim by appending the source ID (e.g., `[evt_0012]`).
- **Contradiction Flagging**: The prompt specifically asks the LLM to highlight contradictions. For example, if `night-logs.md` says a no-show is settled, but `events.json` later says it's disputed, the LLM will flag this for the morning manager.
- **Prompt Injections**: The first LLM pass is instructed to extract facts without executing instructions. The second pass is warned about prompt injections (e.g., the guest note asking for SGD 1000 credit) and told to treat them as suspicious notes.

## AI Usage
- **Helped most**: Parsing the messy markdown log and translating Chinese text accurately without writing complex regex or translation logic. Summarizing the grouped threads into a human-readable action-first report.
- **Got in the way**: LLMs can sometimes be too creative. Enforcing strict schema output in Pass 1 required strict prompting. Enforcing grounding in Pass 2 required clear instructions to append IDs.

## What to do with more time (Hours 3-6)
- **Vector Database/Embeddings**: For a real production system spanning hundreds of hotels and years of data, I would use embeddings to group related events instead of basic heuristic string matching (Room, Guest).
- **Agentic Workflow**: Introduce a validation agent that reads the generated report and verifies every citation against the original source text before returning it to the user.
- **Automated Tests**: Add unit tests for the reconciliation logic to ensure edge cases (e.g., timezone daylight saving time changes) are handled correctly.
- **Deployment**: Set up a Docker container and deploy the service using Render or Fly.io.

## One surprising thing
I was surprised by how effectively the LLM can handle a prompt injection attempt hidden within a seemingly innocuous guest note when given simple, explicit instructions to treat all text as data, not commands.
