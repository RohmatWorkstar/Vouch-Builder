/**
 * Structured logger for the handover pipeline.
 * Outputs JSON lines to stdout/stderr so that another builder (or AI agent)
 * can debug a bad handover in production.
 *
 * Each log entry includes:
 *  - timestamp   ISO 8601
 *  - level       info | warn | error
 *  - phase       ingestion | extraction | reconciliation | generation | api
 *  - hotel_id    which hotel this handover is for
 *  - target_date which morning handover we're generating
 *  - message     human-readable summary
 *  - details     structured data (reconciliation decisions, grounding notes, etc.)
 */

let _context = {};

function setContext({ hotelId, hotelName, targetDate }) {
    _context = { hotel_id: hotelId || 'unknown', hotel_name: hotelName || 'unknown', target_date: targetDate || 'unknown' };
}

function _log(level, phase, message, details) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        phase,
        ..._context,
        message,
    };
    if (details !== undefined && details !== null) {
        entry.details = details;
    }
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
}

function info(phase, message, details) {
    _log('info', phase, message, details);
}

function warn(phase, message, details) {
    _log('warn', phase, message, details);
}

function error(phase, message, details) {
    _log('error', phase, message, details);
}

module.exports = { setContext, info, warn, error };
