const log = require('./logger');

/**
 * Reconciles all events into threads and categorizes them relative to a target morning.
 *
 * @param {Array} allEvents - Combined structured + extracted events
 * @param {string} targetMorningDateStr - e.g. '2026-05-30'
 * @param {string} timezone - e.g. '+08:00'
 * @returns {{ newTonight: Array, newlyResolved: Array, stillOpen: Array }}
 */
function reconcileEvents(allEvents, targetMorningDateStr, timezone = '+08:00') {
    const threads = {};

    // Sort events chronologically
    const sortedEvents = [...allEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const targetMorning = new Date(targetMorningDateStr + `T07:00:00${timezone}`);
    // Night shift runs ~23:00–07:00, so "tonight" = the 8 hours before target morning
    const currentShiftStart = new Date(targetMorning.getTime() - 8 * 60 * 60 * 1000);

    log.info('reconciliation', `Reconciling ${sortedEvents.length} events for ${targetMorningDateStr} morning`, {
        target_morning: targetMorning.toISOString(),
        shift_start: currentShiftStart.toISOString(),
        total_events: sortedEvents.length
    });

    for (const event of sortedEvents) {
        const eventTime = new Date(event.timestamp);
        if (eventTime > targetMorning) continue; // Ignore future events

        const threadKey = deriveThreadKey(event);

        if (!threads[threadKey]) {
            threads[threadKey] = {
                id: threadKey,
                room: event.room,
                guest: event.guest,
                events: [],
                sourceIds: [],
                status: 'open',
                flags: [],
                isNewTonight: false,
                isNewlyResolved: false
            };
        }

        threads[threadKey].events.push(event);
        threads[threadKey].sourceIds.push(event.id);

        // Update room/guest if a later event provides it
        if (event.room) threads[threadKey].room = event.room;
        if (event.guest) threads[threadKey].guest = event.guest;

        // Track status transitions for contradiction detection
        const previousStatus = threads[threadKey].status;
        const newStatus = (event.status === 'resolved') ? 'resolved' : 'open';

        // Detect contradiction: status flipped back from resolved to open
        if (previousStatus === 'resolved' && newStatus === 'open') {
            const flag = `Contradiction: was resolved, then re-opened by ${event.id} ("${truncate(event.description, 80)}")`;
            threads[threadKey].flags.push(flag);
            log.warn('reconciliation', `Contradiction detected in thread "${threadKey}"`, {
                thread: threadKey,
                flag,
                event_id: event.id
            });
        }

        threads[threadKey].status = newStatus;

        // Categorization logic
        const happenedTonight = eventTime >= currentShiftStart && eventTime <= targetMorning;

        if (happenedTonight) {
            if (threads[threadKey].events.length === 1) {
                threads[threadKey].isNewTonight = true;
            }
            if (event.status === 'resolved') {
                threads[threadKey].isNewlyResolved = true;
            }
        }
    }

    // Detect missing-info flags
    for (const key in threads) {
        const thread = threads[key];
        const hasRoom = thread.events.some(e => e.room);
        const hasGuest = thread.events.some(e => e.guest);
        if (!hasRoom && !hasGuest) {
            thread.flags.push('Missing info: no room or guest identified');
        }

        // Detect ambiguous status: thread has both resolved and unresolved events
        const statuses = new Set(thread.events.map(e => e.status));
        if (statuses.has('resolved') && (statuses.has('unresolved') || statuses.has('pending'))) {
            if (thread.flags.length === 0 || !thread.flags.some(f => f.startsWith('Contradiction'))) {
                thread.flags.push('Ambiguous status: thread contains both resolved and unresolved events — verify final state');
            }
        }
    }

    // Categorize threads
    const categorized = {
        newTonight: [],
        newlyResolved: [],
        stillOpen: []
    };

    for (const key in threads) {
        const thread = threads[key];

        // Skip threads resolved before tonight with no activity tonight
        const lastEventTime = new Date(thread.events[thread.events.length - 1].timestamp);
        if (thread.status === 'resolved' && lastEventTime < currentShiftStart) {
            log.info('reconciliation', `Skipping old resolved thread: "${key}"`, { sourceIds: thread.sourceIds });
            continue;
        }

        if (thread.isNewTonight && thread.status !== 'resolved') {
            categorized.newTonight.push(thread);
        } else if (thread.status === 'resolved' && thread.isNewlyResolved) {
            categorized.newlyResolved.push(thread);
        } else if (thread.status !== 'resolved' && !thread.isNewTonight) {
            categorized.stillOpen.push(thread);
        } else if (thread.isNewTonight && thread.status === 'resolved') {
            categorized.newlyResolved.push(thread);
        } else {
            categorized.stillOpen.push(thread);
        }
    }

    log.info('reconciliation', 'Reconciliation complete', {
        new_tonight: categorized.newTonight.length,
        newly_resolved: categorized.newlyResolved.length,
        still_open: categorized.stillOpen.length,
        threads_with_flags: Object.values(threads).filter(t => t.flags.length > 0).map(t => ({
            thread: t.id,
            flags: t.flags
        }))
    });

    return categorized;
}

/**
 * Derives a thread key from an event using room, guest, or type.
 * Uses description keywords to group related events (e.g., all "leak" events together).
 */
function deriveThreadKey(event) {
    const desc = (event.description || '').toLowerCase();

    // Group by common issue keywords across events
    if (desc.includes('leak') || desc.includes('water') && desc.includes('corridor')) {
        return 'Facility - Corridor Water Leak';
    }
    if ((event.type === 'compliance' || desc.includes('scanner') || desc.includes('passport')) && desc.includes('immigration')) {
        return 'Compliance - Immigration Scanner';
    }

    if (event.room) {
        return `Room ${event.room}`;
    }
    if (event.guest) {
        return `Guest ${event.guest}`;
    }
    return `General - ${event.type}`;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

module.exports = {
    reconcileEvents
};
