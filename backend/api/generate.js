// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Simple test endpoint
router.get('/test-gemini', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.json({ success: false, error: 'No API key' });
  }
  
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const response = await axios.get(testUrl, { timeout: 10000 });
    res.json({ success: true, modelsFound: response.data?.models?.length || 0 });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 🔥 VARIED PROMPT TEMPLATES for high retention (150-170 words = 50-60 seconds)
const PROMPT_TEMPLATES = [
  // Template 1: Story-driven hook
  `Create a motivational YouTube Short script about "{topic}" that runs 50-60 seconds.

STRUCTURE (150-170 words):
• HOOK (first 2-3 lines): Start with "I used to think..." or "Most people believe..." - make it personal and intriguing
• BUILD: Add 6-8 short punchy lines that reveal the truth about {topic} with specific examples
• PAYOFF: A powerful realization or mindset shift with emotional weight
• CTA: End with ONE specific, actionable step for today

FORMAT: One sentence per line. No markdown. No fluff. Keep pacing fast.

Return ONLY this JSON:
{
  "script": "line1\\nline2\\nline3...",
  "titles": {
    "a": "hook-based title under 55 chars",
    "b": "curiosity title under 55 chars",
    "c": "benefit title under 55 chars"
  },
  "description": "Unique description under 170 chars - mention what viewer will learn specifically about {topic}",
  "hashtags": ["#shorts", "#motivation", "#{topicTag}"]
}`,

  // Template 2: Contrarian/Shock hook
  `Write a 50-60 second YouTube Short script about "{topic}" using a CONTRARIAN hook.

REQUIREMENTS:
• First 2-3 lines MUST challenge common advice (e.g., "Stop trying to be motivated" or "The secret to {topic} isn't what you think")
• 150-170 words total
• Each sentence on a new line
• Include at least one counterintuitive insight
• End with ONE micro-commitment the viewer can do right now

Return ONLY valid JSON:
{
  "script": "...",
  "titles": {
    "a": "controversial title under 55 chars",
    "b": "question title under 55 chars",
    "c": "list-style title under 55 chars"
  },
  "description": "Description under 170 chars that teases the counterintuitive twist about {topic}",
  "hashtags": ["#shorts", "#motivation", "#{topicTag}"]
}`,

  // Template 3: Relatable struggle hook
  `Create a 50-60 second motivational script about "{topic}" that HOOKS viewers by naming their exact struggle.

OPEN with one of these patterns (2-3 lines):
- "That feeling when..."
- "Nobody talks about how..."
- "Here's why you keep..."

SCRIPT RULES:
• 150-170 words
• One line per sentence
• Make it feel like a conversation with a trusted friend
• Include a vulnerable moment or admission
• End with: "Start with [specific tiny action] today"

Return ONLY JSON:
{
  "script": "...",
  "titles": {
    "a": "relatable title under 55 chars",
    "b": "how-to title under 55 chars",
    "c": "emotional title under 55 chars"
  },
  "description": "Unique description under 170 chars that resonates with viewer's struggle with {topic}",
  "hashtags": ["#shorts", "#mindset", "#{topicTag}"]
}`,

  // Template 4: Urgency/Now hook
  `Generate a 50-60 second YouTube Short script about "{topic}" with URGENCY.

HOOK must include "now," "today," or "this is it" in first 2-3 lines

FLOW:
• Hook (urgency)
• 4-5 consequences of waiting
• 2-3 benefits of acting now
• 1 simple shift in perspective
• Call to action for RIGHT NOW

150-170 words. One sentence per line. Keep tension building throughout.

Return ONLY JSON:
{
  "script": "...",
  "titles": {
    "a": "urgent title under 55 chars",
    "b": "warning title under 55 chars",
    "c": "challenge title under 55 chars"
  },
  "description": "Description under 170 chars with time-sensitive language about {topic}",
  "hashtags": ["#shorts", "#motivation", "#{topicTag}"]
}`,

  // Template 5: Transformation arc hook (NEW)
  `Write a 50-60 second YouTube Short script about "{topic}" showing a BEFORE vs AFTER transformation.

STRUCTURE:
• HOOK: "X months ago, I was [struggling with {topic}]" or similar
• THE TURNING POINT: The ONE thing that changed everything
• THE SHIFT: 4-5 lines about new mindset/habits
• THE RESULT: Where you are now (or could be)
• CTA: The first step they can take today

150-170 words. One sentence per line. Make it inspiring but realistic.

Return ONLY JSON:
{
  "script": "...",
  "titles": {
    "a": "transformation title under 55 chars",
    "b": "timeline title under 55 chars",
    "c": "breakthrough title under 55 chars"
  },
  "description": "Unique description under 170 chars hinting at the transformation about {topic}",
  "hashtags": ["#shorts", "#motivation", "#{topicTag}"]
}`
];

// Helper: Get random template
function getRandomTemplate() {
  return PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
}

// Helper: Generate unique fallback responses (150-170 words = 50-60 secs)
function getDynamicFallback(topic) {
  const topicTag = topic.replace(/[^a-z]/gi, '').toLowerCase();
  
  // Multiple 50-60 second fallback scripts (150-170 words)
  const scripts = [
    // Fallback 1 - Personal story (162 words)
    `I used to think ${topic} was about talent or luck.\nI was wrong.\nFor years I watched others succeed at ${topic} while I stayed stuck.\nI kept waiting for the right moment.\nThe right mood.\nThe right circumstances.\nBut here's what nobody told me.\n${topic} isn't something you wait for.\nIt's something you build.\nOne awkward step at a time.\nOne imperfect attempt after another.\nThe people who are good at ${topic} aren't special.\nThey just started before they felt ready.\nThey kept going when it got hard.\nThey embraced the messy middle that everyone else avoids.\nAnd slowly, almost invisibly, they got better.\nNot because they had some secret formula.\nBut because they refused to let perfectionism win.\nSo here's my question for you.\nWhat's one tiny, almost laughably small action you can take for ${topic} today?\nNot tomorrow.\nNot next week.\nToday.\nDo that one thing.\nThen do it again tomorrow.\nThat's how ${topic} is actually mastered.\nNot in a single heroic moment.\nBut in a thousand small, consistent ones.\nStart your streak now.\nYour future self is already grateful.`,
    
    // Fallback 2 - Contrarian (158 words)
    `Stop trying to be motivated about ${topic}.\nSeriously.\nMotivation is a trap.\nIt comes and goes like the weather.\nAnd if you're waiting to feel inspired, you'll be waiting forever.\nThe people crushing it at ${topic} aren't more motivated than you.\nThey just stopped negotiating with their feelings.\nThey show up on the bad days.\nEspecially on the bad days.\nBecause here's the uncomfortable truth.\nAction creates motivation.\nNot the other way around.\nYou don't need to feel ready to start.\nYou need to start to feel ready.\nThe momentum comes after the movement.\nAlways has.\nAlways will.\nSo stop asking yourself if you feel like working on ${topic} today.\nThat's the wrong question.\nAsk yourself this instead.\nWhat would the person I want to become do right now?\nThey wouldn't scroll.\nThey wouldn't overthink.\nThey wouldn't wait for permission.\nThey'd take one small, imperfect action.\nThat's it.\nThat's the whole secret to ${topic}.\nConsistency over intensity.\nShowing up over showing off.\nNow close this video and do the thing.\nEven for five minutes.\nThat's how you win.`,
    
    // Fallback 3 - Relatable struggle (165 words)
    `That feeling when you know you're capable of so much more with ${topic}.\nBut something keeps stopping you.\nSomething invisible but heavy.\nI know that feeling intimately.\nI lived in it for years.\nAnd I kept telling myself I'd start tomorrow.\nNext week.\nWhen things calmed down.\nWhen I had more energy.\nWhen I felt more confident.\nBut tomorrow never came.\nBecause tomorrow is just today wearing a different name.\nWhat I eventually realized changed everything.\nThat thing stopping me wasn't laziness.\nIt was fear dressed up in grown-up clothes.\nFear of not being good enough.\nFear of what others might think.\nFear of trying and still failing.\nBut here's what fear doesn't want you to know.\nIt loses its power the moment you take action.\nAny action.\nEven a tiny, imperfect, shaky one.\nBecause action is proof that fear doesn't control you.\nSo ask yourself honestly right now.\nWhat's one small thing you've been avoiding with ${topic}?\nThat thing that sits in the back of your mind.\nDo it today.\nNot perfectly.\nJust done.\nThat's how you reclaim your power.\nThat's how ${topic} stops being a someday and becomes a today.\nYou've got this.\nNow go prove it to yourself.`,
    
    // Fallback 4 - Urgency (151 words)
    `This is your wake up call about ${topic}.\nNot next month.\nNot when you feel ready.\nNot when circumstances are perfect.\nNow.\nRight now.\nBecause here's the brutal math.\nEvery day you wait on ${topic} is a day you'll never get back.\nA day someone else is using to get better.\nA day your future self will wish you had used differently.\nTime doesn't care about your excuses.\nIt doesn't pause while you gather courage.\nIt just keeps moving.\nAnd the gap between where you are and where you want to be with ${topic} doesn't close itself.\nIt widens.\nSilently.\nDaily.\nBut here's the good news.\nThat same math works in your favor once you start.\nEvery small action compounds.\nEvery tiny effort adds up.\nThe version of you who has mastered ${topic} already exists.\nThey're just on the other side of the actions you're avoiding.\nOne step today.\nOne step tomorrow.\nThat's the whole game.\nNo magic required.\nJust momentum.\nStart building yours.\nNow.`,
    
    // Fallback 5 - Transformation arc (160 words)
    `Six months ago, ${topic} felt impossible to me.\nI was overwhelmed, inconsistent, and constantly comparing myself to others.\nI'd start strong for a few days then fall off completely.\nThe cycle was exhausting and demoralizing.\nBut then I made one tiny shift that changed everything.\nI stopped trying to transform overnight.\nI stopped looking at people years ahead of me.\nInstead, I committed to just five focused minutes a day on ${topic}.\nThat's it.\nFive minutes.\nAnyone can do five minutes.\nAnd here's what happened.\nThose five minutes became ten.\nThen twenty.\nThen something I actually looked forward to.\nNot because I became disciplined overnight.\nBut because I removed the pressure to be perfect.\nI gave myself permission to be a beginner.\nTo be messy.\nTo be inconsistent sometimes.\nAnd ironically, that freedom made me more consistent than ever.\nNow ${topic} isn't something I force.\nIt's something I am.\nAnd it all started with five minutes.\nSo here's my challenge to you.\nWhat's your five minutes today?\nDo that.\nJust that.\nThen watch what happens.`
  ];
  
  // Unique title sets for each fallback
  const titleSets = [
    { 
      a: `My Honest Truth About ${topic}`, 
      b: `${topic} Is Not What You Think`, 
      c: `Why I Stopped Chasing ${topic}` 
    },
    { 
      a: `Stop Trying to Be Motivated for ${topic}`, 
      b: `The Ugly Truth About ${topic} Success`, 
      c: `${topic} Advice You Need to Hear` 
    },
    { 
      a: `For Anyone Struggling With ${topic}`, 
      b: `That ${topic} Feeling Finally Explained`, 
      c: `What I Wish I Knew About ${topic}` 
    },
    { 
      a: `Your ${topic} Wake Up Call`, 
      b: `This Is It For ${topic}`, 
      c: `Don't Wait on ${topic} Anymore` 
    },
    { 
      a: `How I Finally Mastered ${topic}`, 
      b: `My ${topic} Transformation Story`, 
      c: `The ${topic} Shift That Changed Everything` 
    }
  ];
  
  // Unique descriptions for each fallback
  const descriptions = [
    `The truth about ${topic} that nobody tells you. Save this for when you need that push.`,
    `You're closer to ${topic} than you think. Here's what's actually holding you back.`,
    `This mindset shift changed everything for me with ${topic}. Watch till the end.`,
    `If you've been stuck with ${topic}, this is your sign to finally move. Don't scroll past.`,
    `From struggling to thriving with ${topic}. The one tiny habit that made all the difference.`
  ];
  
  const randomIndex = Math.floor(Math.random() * scripts.length);
  
  return {
    script: scripts[randomIndex],
    titleA: titleSets[randomIndex].a.slice(0, 55),
    titleB: titleSets[randomIndex].b.slice(0, 55),
    titleC: titleSets[randomIndex].c.slice(0, 55),
    description: descriptions[randomIndex],
    hashtags: ['#shorts', '#motivation', '#mindset', `#${topicTag}`],
    wordCount: scripts[randomIndex].split(/\s+/).length,
    fallback: true
  };
}

// Main generate endpoint
router.post('/generate-script', async (req, res) => {
  const topic = (req.body?.topic || '').trim();

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Missing API key' });
  }

  console.log(`🎬 Generating 50-60 sec script for: ${topic}`);

  // Pick random template for variety
  const template = getRandomTemplate();
  const topicTag = topic.replace(/[^a-z]/gi, '').toLowerCase();
  const prompt = template.replace(/\{topic\}/g, topic).replace(/\{topicTag\}/g, topicTag);

  try {
    // Use gemini-2.0-flash directly
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,  // Higher temperature for more variety
        maxOutputTokens: 1000  // Increased for longer scripts
      }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`✅ Response received, length: ${responseText.length} chars`);
    
    // Clean and parse JSON
    let cleanJson = responseText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').replace(/^```\s*/, '');
    
    const parsed = JSON.parse(cleanJson);
    
    if (!parsed.script) {
      throw new Error('No script in response');
    }

    const wordCount = parsed.script.split(/\s+/).length;
    console.log(`📝 Script generated: ${wordCount} words`);

    return res.json({
      success: true,
      script: parsed.script,
      titleA: parsed.titles?.a || `${topic}: The Truth No One Tells You`,
      titleB: parsed.titles?.b || `Stop Waiting for ${topic} to Happen`,
      titleC: parsed.titles?.c || `The ${topic} Shift You Need Today`,
      description: parsed.description || `The real secret to ${topic} that most people miss. Save this.`,
      hashtags: parsed.hashtags || ['#shorts', '#motivation', '#mindset', `#${topicTag}`],
      wordCount: wordCount
    });
    
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    
    // Return DYNAMIC fallback - never repetitive
    const fallback = getDynamicFallback(topic);
    console.log(`🔄 Using fallback: ${fallback.wordCount} words`);
    
    return res.json({
      success: true,
      script: fallback.script,
      titleA: fallback.titleA,
      titleB: fallback.titleB,
      titleC: fallback.titleC,
      description: fallback.description,
      hashtags: fallback.hashtags,
      wordCount: fallback.wordCount,
      fallback: true
    });
  }
});

module.exports = router;
