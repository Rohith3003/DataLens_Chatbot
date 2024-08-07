// JavaScript to toggle visibility of dummy text
document.getElementById('userInput').addEventListener('input', function() {
    const userInput = this.value.trim();
    const chatBody = document.getElementById('chatBody');
    const instructions = document.querySelector('.instructions');
    
    if (userInput || chatBody.innerHTML.trim() !== '') {
        instructions.style.display = 'none';
    } else {
        instructions.style.display = 'block';
    }
});

let contextData = [];

document.getElementById('userInput').addEventListener('input', function () {
    const userInput = this.value.trim();
    const instructions = document.querySelector('.instructions');
    if (userInput) {
        instructions.style.display = 'none';
    } else {
        instructions.style.display = 'block';
    }
});

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExtension = getFileExtension(file.name);
        const reader = new FileReader();

        if (fileExtension === 'json') {
            reader.onload = function (e) {
                const content = e.target.result;
                const data = JSON.parse(content);
                console.log(`File ${i + 1}:`, data);
                contextData.push(data);
            };
            reader.readAsText(file);
        } else if (fileExtension === 'docx') {
            reader.onload = function (event) {
                const arrayBuffer = event.target.result;
                mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                    .then(function (result) {
                        const text = result.value;
                        contextData.push(text);
                    })
                    .catch(function (err) {
                        console.error("Error extracting text from DOCX file:", err);
                    });
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'pdf') {
            reader.onload = function (event) {
                const typedArray = new Uint8Array(event.target.result);
                pdfjsLib.getDocument(typedArray)
                    .promise.then(function (pdf) {
                        let text = '';
                        const numPages = pdf.numPages;
                        const promises = [];

                        for (let i = 1; i <= numPages; i++) {
                            promises.push(pdf.getPage(i));
                        }

                        Promise.all(promises).then(function (pages) {
                            pages.forEach(function (page) {
                                page.getTextContent().then(function (content) {
                                    content.items.forEach(function (item) {
                                        text += item.str + '\n';
                                    });
                                    console.log("Text extracted from PDF file:", text);
                                    contextData.push(text);
                                });
                            });
                        });
                    }).catch(function (err) {
                        console.error("Error extracting text from PDF file:", err);
                    });
            };
            reader.readAsArrayBuffer(file);
        }
    }
    window.quotationData = contextData;
}

async function sendMessage() {
    const userInput = document.getElementById('userInput').value.trim();
    if (!userInput) return;

    appendMessage(userInput, 'user');

    // Checking if the input relates to the context data.
    const keywords = ['quotation', 'amount', 'country', 'document', 'analysis', 'quote', 'account'];
    const isContextQuery = keywords.some(keyword => userInput.toLowerCase().includes(keyword));

    let prompt = userInput;
    if (isContextQuery && contextData.length > 0) {
        prompt = `Context: ${JSON.stringify(contextData)}\nUser Query: ${userInput}`;
    }

    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': '<authorization token>' 
        },
        body: JSON.stringify({
            model: 'gpt-4o', 
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,
            temperature: 0
        })
    })
        .then(response => response.json())
        .then(data => {
            const answer = data.choices[0].message.content.trim();
            appendMessage(answer, 'bot');
        })
        .catch(error => console.error('Error:', error));

    document.getElementById('userInput').value = ''; 
}

function appendMessage(message, sender) {
    const chatBody = document.getElementById('chatBody');
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
        messageContainer.appendChild(messageDiv);
    } else if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
        messageContainer.appendChild(messageDiv);
    }
    messageDiv.innerText = message;
    messageContainer.appendChild(messageDiv);
    chatBody.appendChild(messageContainer);
    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to bottom
}

function clearChat() {
    const chatBody = document.getElementById('chatBody');
    chatBody.innerHTML = ''; 
    const instructions = document.querySelector('.instructions');
    instructions.style.display = 'block';
}