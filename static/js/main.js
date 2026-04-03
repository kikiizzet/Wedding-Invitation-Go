// Check for URL Parameter "to"
const urlParams = new URLSearchParams(window.location.search);
const toGuest = urlParams.get('to');
if (toGuest) {
    document.getElementById('guest-receiver-name').innerText = toGuest;
}

// BGM Logic
const bgm = document.getElementById('bgm');
const musicControl = document.getElementById('music-control');
let isMusicPlaying = false;

function openInvitation() {
    const envelope = document.getElementById('envelope-overlay');
    const mainContent = document.getElementById('main-content');
    
    // Play music
    bgm.play().then(() => {
        isMusicPlaying = true;
        musicControl.classList.remove('hidden');
    }).catch(err => console.log("Autoplay blocked, waiting for interaction"));

    // Animate envelope
    envelope.classList.add('open');
    mainContent.classList.remove('hidden');

    // Re-trigger AOS
    setTimeout(() => {
        AOS.refresh();
    }, 500);
}

function toggleMusic() {
    if (isMusicPlaying) {
        bgm.pause();
        isMusicPlaying = false;
        document.querySelector('.music-icon').classList.remove('rotate');
    } else {
        bgm.play();
        isMusicPlaying = true;
        document.querySelector('.music-icon').classList.add('rotate');
    }
}

// WebSocket Chat Logic
let socket;
let guestName = "";

function joinChat() {
    const nameInput = document.getElementById('guest-name');
    guestName = nameInput.value.trim();

    if (guestName === "") {
        alert("Mohon masukkan namamu!");
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = function(e) {
        document.getElementById('join-section').classList.add('hidden');
        document.getElementById('msg-section').classList.remove('hidden');
        fetchHistory();
    };

    socket.onmessage = function(event) {
        const msg = JSON.parse(event.data);
        displayMessage(msg);
    };
}

function fetchHistory() {
    fetch('/api/messages')
        .then(res => res.json())
        .then(data => {
            data.reverse().forEach(msg => displayMessage(msg));
        });
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (content === "" || !socket) return;

    socket.send(JSON.stringify({
        guest_name: guestName,
        content: content,
        timestamp: new Date().toLocaleTimeString()
    }));
    input.value = "";
}

function displayMessage(msg) {
    const container = document.getElementById('messages-container');
    const msgDiv = document.createElement('div');
    const isSelf = msg.guest_name === guestName;
    
    msgDiv.style.padding = '15px';
    msgDiv.style.borderRadius = '15px';
    msgDiv.style.marginBottom = '10px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.textAlign = 'left';
    msgDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.03)';

    if (isSelf) {
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.style.backgroundColor = '#D4AF37';
        msgDiv.style.color = 'white';
    } else {
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.backgroundColor = 'white';
        msgDiv.style.border = '1px solid #eee';
    }

    msgDiv.innerHTML = `<small style="display:block;margin-bottom:5px;opacity:0.8;font-weight:600">${msg.guest_name}</small>${msg.content}`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// RSVP
function submitRSVP(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('rsvp-name').value,
        attend: true,
        quantity: parseInt(document.getElementById('rsvp-quantity').value),
        note: document.getElementById('rsvp-note').value
    };

    fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        alert("Terima kasih! Konfirmasi Anda telah kami terima.");
        document.getElementById('rsvp-form').reset();
    })
    .catch(() => alert("Gagal mengirim konfirmasi."));
}
