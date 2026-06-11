require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateHandover } = require('./controllers/handoverController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint
app.get('/api/handover', generateHandover);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
