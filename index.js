const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload-survey', (req, res) => {
  const { filename = 'survey-001', questions } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Invalid survey format' });
  }

  const filePath = path.join(__dirname, 'public', 'surveys', `${filename}.json`);
  fs.writeFile(filePath, JSON.stringify({ questions }, null, 2), (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save survey' });
    res.json({ status: 'success', url: `/surveys/${filename}.json` });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
