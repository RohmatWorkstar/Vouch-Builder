const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');

async function getStructuredEvents() {
    try {
        const rawData = await fs.readFile(path.join(dataDir, 'events.json'), 'utf-8');
        const data = JSON.parse(rawData);
        return data.events || [];
    } catch (error) {
        console.error('Error reading events.json', error);
        return [];
    }
}

async function getUnstructuredLogs() {
    try {
        return await fs.readFile(path.join(dataDir, 'night-logs.md'), 'utf-8');
    } catch (error) {
        console.error('Error reading night-logs.md', error);
        return '';
    }
}

module.exports = {
    getStructuredEvents,
    getUnstructuredLogs
};
