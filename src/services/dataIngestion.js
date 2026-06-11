const fs = require('fs/promises');
const path = require('path');
const log = require('./logger');

const dataDir = path.join(__dirname, '../../data');

/**
 * Reads structured events from events.json and returns both
 * the hotel metadata and the events array.
 */
async function getStructuredEvents() {
    try {
        const rawData = await fs.readFile(path.join(dataDir, 'events.json'), 'utf-8');
        const data = JSON.parse(rawData);

        const hotel = data.hotel || { id: 'unknown', name: 'Unknown Hotel', timezone: '+08:00' };
        const events = data.events || [];

        log.info('ingestion', `Loaded ${events.length} structured events from events.json`, {
            hotel_id: hotel.id,
            event_count: events.length,
            date_range: events.length > 0
                ? { first: events[0].timestamp, last: events[events.length - 1].timestamp }
                : null
        });

        return { hotel, events };
    } catch (error) {
        log.error('ingestion', 'Failed to read events.json', { error: error.message });
        return { hotel: { id: 'unknown', name: 'Unknown Hotel', timezone: '+08:00' }, events: [] };
    }
}

/**
 * Reads the free-text night log markdown.
 */
async function getUnstructuredLogs() {
    try {
        const content = await fs.readFile(path.join(dataDir, 'night-logs.md'), 'utf-8');
        log.info('ingestion', `Loaded night-logs.md (${content.length} chars)`);
        return content;
    } catch (error) {
        log.error('ingestion', 'Failed to read night-logs.md', { error: error.message });
        return '';
    }
}

module.exports = {
    getStructuredEvents,
    getUnstructuredLogs
};
