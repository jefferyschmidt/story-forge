require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const WORD_TARGETS = {
  short: 400,
  medium: 900,
  long: 1800,
};

const GENRE_FLAVORS = {
  fantasy: 'epic fantasy with magic, mythical creatures, and heroic quests',
  scifi: 'science fiction with advanced technology, space exploration, or futuristic societies',
  romance: 'romantic story with emotional tension, connection, and heartfelt moments',
  mystery: 'mystery or thriller with clues, suspense, and a satisfying reveal',
  horror: 'horror story with building dread, atmosphere, and a shocking climax',
  comedy: 'comedic story full of humor, absurd situations, and witty banter',
  adventure: 'action-packed adventure with danger, exploration, and triumph',
  fairytale: 'whimsical fairy tale with enchanted settings, moral lessons, and wonder',
};

const TONE_FLAVORS = {
  whimsical: 'light, playful, and whimsical — like a bedtime story come to life',
  dramatic: 'dramatic and emotional, with high stakes and vivid character moments',
  dark: 'dark and moody, with serious themes and a gritty edge',
  silly: 'silly and over-the-top, prioritizing laughs and absurdity',
  epic: 'grand and epic in scope, with sweeping descriptions and heroic language',
  heartwarming: 'warm and uplifting, leaving the reader with a smile',
};

function buildPrompt(data) {
  const { genre, tone, length, characters, setting, timePeriod, plotPoints, storyIdea, audienceAge } = data;

  const wordTarget = WORD_TARGETS[length] || 900;
  const genreDesc = GENRE_FLAVORS[genre] || genre;
  const toneDesc = TONE_FLAVORS[tone] || tone;

  const characterList = characters
    .filter(c => c.name && c.name.trim())
    .map(c => {
      let desc = `- **${c.name}** (${c.role || 'character'})`;
      if (c.quirk) desc += ` — quirk/trait: ${c.quirk}`;
      if (c.description) desc += `. Description: ${c.description}`;
      return desc;
    })
    .join('\n');

  const plotList = plotPoints
    .filter(p => p.trim())
    .map((p, i) => `${i + 1}. ${p}`)
    .join('\n');

  let prompt = `Write an original, engaging ${genreDesc} story. The tone should be ${toneDesc}.

TARGET LENGTH: approximately ${wordTarget} words.
AUDIENCE: ${audienceAge === 'kids' ? 'children (keep it age-appropriate, no violence or scary content)' : audienceAge === 'teens' ? 'teenagers' : 'adults'}.`;

  if (storyIdea) {
    prompt += `\n\nCORE STORY IDEA:\n${storyIdea}`;
  }

  if (characterList) {
    prompt += `\n\nCHARACTERS (use these names and traits — make them vivid and true to their descriptions):\n${characterList}`;
  }

  if (setting) {
    prompt += `\n\nSETTING: ${setting}`;
    if (timePeriod) prompt += ` (time period: ${timePeriod})`;
  } else if (timePeriod) {
    prompt += `\n\nTIME PERIOD: ${timePeriod}`;
  }

  if (plotList) {
    prompt += `\n\nPLOT POINTS TO INCLUDE (weave these in naturally):\n${plotList}`;
  }

  prompt += `\n\nSTYLE NOTES:
- Open with a compelling hook that immediately draws the reader in
- Give the characters personality and voice through their dialogue and actions
- Build naturally toward a satisfying climax and resolution
- Write in flowing prose paragraphs — no bullet points or lists
- Use vivid, sensory descriptions to bring the world to life
- Make sure all named characters play a meaningful role in the story

Write the story now, starting directly with the narrative (no preamble like "Here is your story:").`;

  return prompt;
}

app.post('/api/generate', async (req, res) => {
  const data = req.body;

  if (!data.characters || !Array.isArray(data.characters)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const userPrompt = buildPrompt(data);

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a masterful storyteller who crafts vivid, imaginative, personalized stories. Your stories are engaging, well-paced, and emotionally resonant. You excel at weaving user-provided character names and details into narratives that feel tailor-made and special. Every story you write should feel like it was written just for the people reading it.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('finalMessage', () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Generation failed. Please try again.' })}\n\n`);
      res.end();
    });

  } catch (err) {
    console.error('Request error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Something went wrong.' })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✨ Story Forge running at http://localhost:${PORT}\n`);
});
