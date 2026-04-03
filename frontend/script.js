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

generateBtn.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    
    if (!topic) {
        alert('Please enter a topic');
        return;
    }
    
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic: topic })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        scriptText.textContent = data.script;
        titleAText.textContent = data.titleA;
        titleBText.textContent = data.titleB;
        titleCText.textContent = data.titleC;
        descriptionText.textContent = data.description;
        hashtagsText.textContent = data.hashtags.join(' ');
        
        const wordCount = data.wordCount || data.script.split(/\s+/).length;
        const secondsEstimate = Math.round(wordCount / 2.5);
        wordCountSpan.innerHTML = `📊 ${wordCount} words | ~${secondsEstimate} seconds (target: 55-60)`;
        
        if (secondsEstimate < 50 || secondsEstimate > 65) {
            wordCountSpan.style.color = '#ff6b6b';
        } else {
            wordCountSpan.style.color = '#4ecdc4';
        }
        
        resultDiv.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate script. Please try again.');
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
    navigator.clipboard.writeText(text).then(() => {
        alert(successMessage);
    }).catch(() => {
        alert('Failed to copy');
    });
          }
