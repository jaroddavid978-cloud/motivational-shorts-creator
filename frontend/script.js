// frontend/script.js
const generateBtn = document.getElementById('generateBtn');
const topicInput = document.getElementById('topic');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const scriptText = document.getElementById('scriptText');
const titleAText = document.getElementById('titleAText');
const titleBText = document.getElementById('titleBText');
const titleCText = document.getElementById('titleCText');
const descriptionText = document.getElementById('descriptionText');
const hashtagsText = document.getElementById('hashtagsText');
const wordCountSpan = document.getElementById('wordCount');

const API_URL = '/api/generate-script';

// Rate limiting for frontend - 20 seconds between requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20000; // 20 seconds

generateBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    alert('Please enter a topic');
    return;
  }

  // Check rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitSeconds = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
    alert(`Please wait ${waitSeconds} seconds before generating another script.`);
    return;
  }
  lastRequestTime = now;

  loadingDiv.classList.remove('hidden');
  resultDiv.classList.add('hidden');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    // Handle rate limit error
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait 20 seconds before trying again.');
    }

    if (!res.ok || !data || data.success === false) {
      const msg = data?.error || `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    scriptText.textContent = data.script || '';
    titleAText.textContent = data.titleA || '';
    titleBText.textContent = data.titleB || '';
    titleCText.textContent = data.titleC || '';
    descriptionText.textContent = data.description || '';

    const ht = Array.isArray(data.hashtags) ? data.hashtags.join(' ') : String(data.hashtags || '');
    hashtagsText.textContent = ht;

    const wordCount = Number(data.wordCount) || (data.script ? data.script.trim().split(/\s+/).length : 0);
    const secondsEstimate = Math.max(1, Math.round(wordCount / 2.5));
    wordCountSpan.innerHTML = `📊 ${wordCount} words | ~${secondsEstimate} seconds (target: 55–60)`;
    wordCountSpan.style.color = (secondsEstimate < 50 || secondsEstimate > 65) ? '#ff6b6b' : '#4ecdc4';

    resultDiv.classList.remove('hidden');
  } catch (error) {
    console.error('Generate error:', error);
    alert(error.message || 'Failed to generate script. Please try again.');
  } finally {
    loadingDiv.classList.add('hidden');
  }
});

// Copy buttons
document.getElementById('copyScriptBtn').addEventListener('click', () => {
  copyToClipboard(scriptText.textContent, 'Script copied!');
});
document.getElementById('copyTitleABtn').addEventListener('click', () => {
  copyToClipboard(titleAText.textContent, 'Title A copied!');
});
document.getElementById('copyTitleBBtn').addEventListener('click', () => {
  copyToClipboard(titleBText.textContent, 'Title B copied!');
});
document.getElementById('copyTitleCBtn').addEventListener('click', () => {
  copyToClipboard(titleCText.textContent, 'Title C copied!');
});
document.getElementById('copyDescBtn').addEventListener('click', () => {
  copyToClipboard(descriptionText.textContent, 'Description copied!');
});
document.getElementById('copyHashtagsBtn').addEventListener('click', () => {
  copyToClipboard(hashtagsText.textContent, 'Hashtags copied!');
});

function copyToClipboard(text, successMessage) {
  if (!text) {
    alert('Nothing to copy');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    alert(successMessage);
  }).catch(() => {
    alert('Failed to copy');
  });
      }
