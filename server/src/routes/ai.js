const express = require('express');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 90000;

router.use(authenticate);

router.post('/messages', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { model, max_tokens, system, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: Math.min(max_tokens || 1024, 4096),
        system: system || undefined,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out' });
    }
    console.error('[AI proxy] error:', err.message);
    return res.status(500).json({ error: 'AI request failed' });
  }
});

module.exports = router;
