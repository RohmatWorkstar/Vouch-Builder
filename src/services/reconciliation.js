function reconcileEvents(allEvents, targetMorningDateStr) {
    // targetMorningDateStr is something like '2026-05-30' (Saturday morning)
    // We want to group events by a common thread key.
    // Thread key could be Room Number, or Guest Name, or a general category for facility issues.

    const threads = {};

    // Sort events chronologically to process them in order
    const sortedEvents = [...allEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const targetMorning = new Date(targetMorningDateStr + 'T07:00:00+08:00'); // 7 AM cut-off
    const previousShiftStart = new Date(targetMorning.getTime() - 24 * 60 * 60 * 1000); // 7 AM previous day
    // Actually the night shift starts at 23:00.
    // So "New tonight" means it happened between targetMorning - 8 hours (23:00) and targetMorning (07:00).
    const currentShiftStart = new Date(targetMorning.getTime() - 8 * 60 * 60 * 1000);

    for (const event of sortedEvents) {
        const eventTime = new Date(event.timestamp);
        if (eventTime > targetMorning) continue; // Ignore future events

        let threadKey = '';
        if (event.room) {
            threadKey = `Room ${event.room}`;
        } else if (event.guest) {
            threadKey = `Guest ${event.guest}`;
        } else {
            // For facility issues with no room/guest, try to use the type or a snippet of description
            threadKey = `General - ${event.type}`;
        }

        // Special handling for some thread grouping (e.g., corridor leak)
        if (event.description.toLowerCase().includes('leak') || event.description.toLowerCase().includes('water')) {
             threadKey = 'General - Water Leak 2nd Floor';
        }
        if (event.type === 'compliance' && event.description.toLowerCase().includes('scanner')) {
             threadKey = 'General - Immigration Scanner';
        }

        if (!threads[threadKey]) {
            threads[threadKey] = {
                id: threadKey,
                room: event.room,
                guest: event.guest,
                events: [],
                status: 'open',
                isNewTonight: false,
                isNewlyResolved: false
            };
        }

        threads[threadKey].events.push(event);
        
        // Update thread status based on latest event
        threads[threadKey].status = event.status === 'resolved' ? 'resolved' : 'open';

        // Logic for categorization:
        const happenedTonight = eventTime >= currentShiftStart && eventTime <= targetMorning;
        
        if (happenedTonight) {
            if (threads[threadKey].events.length === 1) {
                // First event in thread happened tonight
                threads[threadKey].isNewTonight = true;
            }
            if (event.status === 'resolved') {
                 threads[threadKey].isNewlyResolved = true;
            }
        }
    }

    // Now categorize the threads for the LLM
    const categorized = {
        newTonight: [],
        newlyResolved: [],
        stillOpen: []
    };

    for (const key in threads) {
        const thread = threads[key];
        
        // If the thread was resolved BEFORE tonight, and no new events happened tonight, we can ignore it
        // because it's an old resolved issue.
        const lastEventTime = new Date(thread.events[thread.events.length - 1].timestamp);
        if (thread.status === 'resolved' && lastEventTime < currentShiftStart) {
            continue; 
        }

        if (thread.isNewTonight && thread.status !== 'resolved') {
            categorized.newTonight.push(thread);
        } else if (thread.status === 'resolved' && thread.isNewlyResolved) {
            categorized.newlyResolved.push(thread);
        } else if (thread.status !== 'resolved' && !thread.isNewTonight) {
            categorized.stillOpen.push(thread);
        } else if (thread.isNewTonight && thread.status === 'resolved') {
             categorized.newlyResolved.push(thread); // Happened and resolved tonight
        } else {
             // Fallback
             categorized.stillOpen.push(thread);
        }
    }

    return categorized;
}

module.exports = {
    reconcileEvents
};
