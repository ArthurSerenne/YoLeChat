const socket = io();
const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typing');
const feedbackEl = document.getElementById('feedback');
const formEl = document.getElementById('sendForm');
const inputEl = document.getElementById('messageInput');

function renderMessage(m) {
  const li = document.createElement('li');
  const name = m.author?.username || 'Inconnu';
  const color = m.author?.displayColor || '#e6e9ef';
  li.innerHTML = `<div class="msg"><span class="author" style="color:${color}">${name}</span> <span class="content">${m.content}</span></div>`;
  messagesEl.appendChild(li);
}

async function loadHistory() {
  try {
    const res = await fetch('/chat/messages');
    if (!res.ok) throw new Error('Chargement de l\'historique échoué');
    const data = await res.json();
    messagesEl.innerHTML = '';
    data.forEach(renderMessage);
    feedbackEl.textContent = '';
  } catch (e) {
    feedbackEl.textContent = 'Impossible de charger l\'historique';
  }
}

socket.on('connect_error', () => { feedbackEl.textContent = 'Connexion socket échouée'; });
socket.on('disconnect', () => { feedbackEl.textContent = 'Déconnecté'; });
socket.on('connect', () => { feedbackEl.textContent = ''; });

socket.emit('chat:join', null, (res) => {
  if (!res || res.status !== 'ok') feedbackEl.textContent = res?.error || 'Échec de la jonction du salon';
});

socket.on('message.new', renderMessage);

let typingTimeout;
function startTyping() {
  socket.emit('typing.start', null, (res) => {
    if (!res || res.status !== 'ok') feedbackEl.textContent = res?.error || 'Erreur de saisie';
  });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing.stop', null, (r) => {
      if (!r || r.status !== 'ok') feedbackEl.textContent = r?.error || 'Erreur de saisie';
    });
  }, 2500);
}

socket.on('typing.update', ({ users }) => {
  if (!users || users.length === 0) { typingEl.textContent = ''; return; }
  const label = users.length === 1 ? `${users[0]} écrit…` : `${users.join(', ')} écrivent…`;
  typingEl.textContent = label;
});

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  socket.emit('message.send', { content }, (res) => {
    if (!res || res.status !== 'ok') {
      feedbackEl.textContent = res?.error || 'Échec de l\'envoi';
      return;
    }
    feedbackEl.textContent = '';
  });
  inputEl.value = '';
});

inputEl.addEventListener('input', startTyping);

loadHistory();