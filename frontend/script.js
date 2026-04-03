const generateBtn = document.getElementById('generateBtn');
const topicInput = document.getElementById('topic');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const scriptText = document.getElementById('scriptText');
const titleText = document.getElementById('titleText');
const descriptionText = document.getElementById('descriptionText');
const hashtagsText = document.getElementById('hashtagsText');

// API URL - will update when deployed
const API_URL = 'http://localhost:3000/api/generate-script';

generateBtn.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    
    if (!topic) {
        alert('Please enter a topic');
        return;
    }
    
    // Show loading, hide previous result
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
        
        // Display results
        scriptText.textContent = data.script;
        titleText.textContent = data.title;
        descriptionText.textContent = data.description;
        hashtagsText.textContent = data.hashtags.join(' ');
        
        resultDiv.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate script. Please try again.');
    } finally {
        loadingDiv.classList.add('hidden');
    }
});

// Copy functions
document.getElementById('copyScriptBtn').addEventListener('click', () => {
    copyToClipboard(scriptText.textContent, 'Script copied!');
});

document.getElementById('copyTitleBtn').addEventListener('click', () => {
    copyToClipboard(titleText.textContent, 'Title copied!');
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
