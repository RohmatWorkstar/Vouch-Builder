const dataIngestion = require('../services/dataIngestion');
const llm = require('../services/llm');
const reconciliation = require('../services/reconciliation');

async function generateHandover(req, res) {
    try {
        const targetDateStr = req.query.date || '2026-05-30'; // Default to Saturday morning

        // 1. Ingest Data
        console.log('Ingesting data...');
        const structuredEvents = await dataIngestion.getStructuredEvents();
        const unstructuredLogs = await dataIngestion.getUnstructuredLogs();

        // 2. Extract from unstructured (LLM Pass 1)
        console.log('Extracting events from unstructured logs...');
        const extractedEvents = await llm.extractEventsFromMarkdown(unstructuredLogs);

        // Combine all events
        const allEvents = [...structuredEvents, ...extractedEvents];

        // 3. Reconcile across nights
        console.log('Reconciling threads...');
        const reconciledThreads = reconciliation.reconcileEvents(allEvents, targetDateStr);

        // 4. Generate Report (LLM Pass 2)
        console.log('Generating final handover report...');
        const reportMarkdown = await llm.generateHandoverReport(reconciledThreads);

        res.json({
            success: true,
            targetDate: targetDateStr,
            report: reportMarkdown,
            meta: {
                totalEventsProcessed: allEvents.length,
                threads: {
                    newTonight: reconciledThreads.newTonight.length,
                    newlyResolved: reconciledThreads.newlyResolved.length,
                    stillOpen: reconciledThreads.stillOpen.length
                }
            }
        });
    } catch (error) {
        console.error('Error in generateHandover:', error);
        
        let errorMessage = error.message;
        if (error.status === 429) {
             errorMessage = "Groq API Rate Limit Exceeded (429). Please wait a moment and try again.";
        } else if (error.message.includes('API key not valid') || error.status === 401) {
             errorMessage = "Invalid Groq API Key. Please verify your GROK_API_KEY in the .env file.";
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
}

module.exports = {
    generateHandover
};
