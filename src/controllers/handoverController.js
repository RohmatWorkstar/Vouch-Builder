const dataIngestion = require('../services/dataIngestion');
const llm = require('../services/llm');
const reconciliation = require('../services/reconciliation');
const log = require('../services/logger');

async function generateHandover(req, res) {
    const targetDateStr = req.query.date || '2026-05-30';

    try {
        // 1. Ingest Data
        const { hotel, events: structuredEvents } = await dataIngestion.getStructuredEvents();
        const unstructuredLogs = await dataIngestion.getUnstructuredLogs();

        // Set logging context for all subsequent log calls
        log.setContext({
            hotelId: hotel.id,
            hotelName: hotel.name,
            targetDate: targetDateStr
        });

        log.info('api', `Handover requested for ${targetDateStr}`, {
            structured_events: structuredEvents.length,
            has_unstructured_logs: unstructuredLogs.length > 0
        });

        // 2. Extract from unstructured (LLM Pass 1)
        const extractedEvents = await llm.extractEventsFromMarkdown(unstructuredLogs, hotel.timezone);

        // Combine all events
        const allEvents = [...structuredEvents, ...extractedEvents];

        // 3. Reconcile across nights
        const reconciledThreads = reconciliation.reconcileEvents(allEvents, targetDateStr, hotel.timezone);

        // 4. Generate Report (LLM Pass 2)
        const reportMarkdown = await llm.generateHandoverReport(reconciledThreads, targetDateStr, hotel.name);

        log.info('api', 'Handover generation complete', {
            total_events: allEvents.length,
            threads: {
                new_tonight: reconciledThreads.newTonight.length,
                newly_resolved: reconciledThreads.newlyResolved.length,
                still_open: reconciledThreads.stillOpen.length
            }
        });

        res.json({
            success: true,
            hotel: { id: hotel.id, name: hotel.name },
            targetDate: targetDateStr,
            report: reportMarkdown,
            meta: {
                totalEventsProcessed: allEvents.length,
                extractedFromFreeText: extractedEvents.length,
                threads: {
                    newTonight: reconciledThreads.newTonight.length,
                    newlyResolved: reconciledThreads.newlyResolved.length,
                    stillOpen: reconciledThreads.stillOpen.length
                }
            }
        });
    } catch (error) {
        log.error('api', 'Handover generation failed', {
            error: error.message,
            status: error.status,
            target_date: targetDateStr
        });

        let errorMessage = error.message;
        if (error.status === 429) {
            errorMessage = 'Groq API Rate Limit Exceeded (429). Please wait a moment and try again.';
        } else if (error.message.includes('API key not valid') || error.status === 401) {
            errorMessage = 'Invalid Groq API Key. Please verify your GROK_API_KEY in the .env file.';
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
}

module.exports = {
    generateHandover
};
