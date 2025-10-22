const socket = io();
const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typing');
const feedbackEl = document.getElementById('feedback');
const formEl = document.getElementById('sendForm');
const inputEl = document.getElementById('messageInput');
const userListEl = document.getElementById('userList');
const logoutBtn = document.getElementById('logoutBtn');
const clearBtn = document.getElementById('clearBtn');
const toggleBtn = document.getElementById('toggleUsers');
const chatContainer = document.querySelector('.chat');
const createServerBtn = document.getElementById('createServerBtn');
const serverTitleEl = document.getElementById('serverTitle');
const modalEl = document.getElementById('createServerModal');
const modalForm = document.getElementById('createServerForm');
const modalFeedbackEl = document.getElementById('createServerFeedback');
const modalCancelBtn = document.getElementById('createServerCancel');
const modalCloseBtn = document.getElementById('createServerClose');
const serverListEl = document.getElementById('serverList');
const inviteMemberBtn = document.getElementById('inviteMemberBtn');
const inviteModalEl = document.getElementById('inviteModal');
const inviteForm = document.getElementById('inviteForm');
const inviteInputEl = document.getElementById('inviteInput');
const inviteSuggestionsEl = document.getElementById('inviteSuggestions');
const inviteFeedbackEl = document.getElementById('inviteFeedback');
const inviteCancelBtn = document.getElementById('inviteCancelBtn');
const inviteCloseBtn = document.getElementById('inviteClose');

const params = new URLSearchParams(window.location.search);
const serverId = params.get('server');
if (!serverId && inviteMemberBtn) { inviteMemberBtn.remove(); }

let lastAuthorId = null;

function renderUsers(users) {
  if (!userListEl) return;
  userListEl.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'user';
    const name = u.username || 'Inconnu';
    const color = u.displayColor || '#e6e9ef';
    li.innerHTML = `<span class="presence online"></span><span class="username" style="color:${color}">${name}</span>`;
    userListEl.appendChild(li);
  });
}

function renderMessage(m) {
  const li = document.createElement('li');
  const name = m.author?.username || 'Inconnu';
  const color = m.author?.displayColor || '#e6e9ef';
  const authorId = m.author?.id || null;
  const isGroupStart = messagesEl.children.length > 0 && lastAuthorId !== authorId;
  if (isGroupStart) li.classList.add('group-start');
  li.innerHTML = `<div class="msg"><span class="author" style="color:${color}">${name}</span> <span class="content">${m.content}</span></div>`;
  messagesEl.appendChild(li);
  lastAuthorId = authorId;
}

function openCreateServerModal() {
  if (!modalEl || !modalForm) return;
  modalEl.classList.add('show');
  modalEl.setAttribute('aria-hidden', 'false');
  modalFeedbackEl && (modalFeedbackEl.textContent = '');
  try { modalForm.reset(); } catch {}
  const nameInput = modalForm.querySelector('input[name="name"]');
  if (nameInput) nameInput.focus();
}
function closeCreateServerModal() {
  if (!modalEl) return;
  modalEl.classList.remove('show');
  modalEl.setAttribute('aria-hidden', 'true');
}

async function updateServerTitle() {
  if (!serverTitleEl) return;
  if (!serverId) { serverTitleEl.textContent = 'Serveur général'; return; }
  try {
    const res = await fetch(`/servers/${encodeURIComponent(serverId)}`, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    serverTitleEl.textContent = data?.name || 'Serveur privé';
  } catch {
    serverTitleEl.textContent = 'Serveur privé';
  }
}

async function loadServers() {
  if (!serverListEl) return;
  serverListEl.innerHTML = '';
  try {
    const res = await fetch('/servers', { credentials: 'same-origin' });
    const servers = await res.json().catch(() => []);
    renderServersList(Array.isArray(servers) ? servers : []);
  } catch {
    // ignore
  }
}

function renderServersList(servers) {
  if (!serverListEl) return;
  serverListEl.innerHTML = '';
  const makeItem = (label, id) => {
    const li = document.createElement('li');
    li.textContent = label;
    if ((!serverId && !id) || (serverId && id === serverId)) li.classList.add('active');
    li.addEventListener('click', () => {
      const url = id ? `/chat?server=${encodeURIComponent(id)}` : '/chat';
      window.location.assign(url);
    });
    return li;
  };
  serverListEl.appendChild(makeItem('Général', null));
  servers.forEach(s => {
    serverListEl.appendChild(makeItem(s.name || 'Serveur', s.id));
  });
}

async function loadHistory() {
  try {
    const url = serverId ? `/chat/messages?server=${encodeURIComponent(serverId)}` : '/chat/messages';
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Chargement de l\'historique échoué');
    const data = await res.json();
    messagesEl.innerHTML = '';
    lastAuthorId = null;
    data.forEach(renderMessage);
    feedbackEl.textContent = '';
  } catch (e) {
    feedbackEl.textContent = 'Impossible de charger l\'historique';
  }
}

// Presence updates from server
socket.on('presence.update', ({ users }) => { renderUsers(users || []); });

socket.on('connect_error', () => { feedbackEl.textContent = 'Connexion socket échouée'; });
socket.on('disconnect', () => { feedbackEl.textContent = 'Déconnecté'; });
socket.on('connect', () => { feedbackEl.textContent = ''; });

socket.emit('chat:join', serverId || null, (res) => {
  if (!res || res.status !== 'ok') feedbackEl.textContent = res?.error || 'Échec de la jonction du salon';
});

socket.on('message.new', renderMessage);
socket.on('server.added', () => { loadServers(); showToast('Vous avez rejoint un nouveau serveur.', 'ok'); });

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
  inputEl.style.height = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalEl && modalEl.classList.contains('show')) closeCreateServerModal();
    if (inviteModalEl && inviteModalEl.classList.contains('show')) closeInviteModal();
  }
});

if (modalForm) {
  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!modalFeedbackEl) return;
    modalFeedbackEl.textContent = '';
    try {
      const formData = new FormData(modalForm);
      const name = (formData.get('name') || '').toString().trim();
      const invitesRaw = (formData.get('invites') || '').toString().trim();
      if (!name) {
        modalFeedbackEl.innerHTML = '<span class="err">Veuillez saisir un nom valide.</span>';
        return;
      }
      const createRes = await fetch('/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'same-origin',
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || createData?.error) {
        const code = createData?.error || 'error';
        const msg = code === 'invalid_name' ? 'Nom de serveur invalide.' : 'Création du serveur échouée.';
        modalFeedbackEl.innerHTML = `<span class="err">${msg}</span>`;
        return;
      }
      const newServerId = createData.id;
      // Handle invitations
      if (invitesRaw) {
        const list = invitesRaw.split(',').map(s => s.trim()).filter(Boolean);
        for (const username of list) {
          try {
            const res = await fetch(`/servers/${encodeURIComponent(newServerId)}/invite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username }),
              credentials: 'same-origin',
            });
            await res.json().catch(() => ({}));
          } catch {}
        }
      }
      closeCreateServerModal();
      window.location.assign(`/chat?server=${encodeURIComponent(newServerId)}`);
    } catch (err) {
      modalFeedbackEl.innerHTML = '<span class="err">Création du serveur échouée.</span>';
    }
  });
}

// Logout action
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {}
    try { socket.disconnect(); } catch {}
    window.location.assign('/home?tab=login');
  });
}

// Toggle users sidebar
if (toggleBtn && chatContainer) {
  toggleBtn.addEventListener('click', () => {
    const collapsed = chatContainer.classList.toggle('users-collapsed');
    const label = collapsed ? 'Afficher utilisateurs' : 'Masquer utilisateurs';
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);
  });
}
 
updateServerTitle();
loadServers();
loadHistory();

if (createServerBtn) {
  createServerBtn.addEventListener('click', () => {
    openCreateServerModal();
  });
}

// Invite autocomplete
let inviteTimer;
let inviteCtrl;
function openInviteModal() {
  if (!inviteModalEl || !inviteForm) return;
  inviteModalEl.classList.add('show');
  inviteModalEl.setAttribute('aria-hidden', 'false');
  inviteFeedbackEl && (inviteFeedbackEl.textContent = serverId ? '' : 'Sélectionnez un serveur pour inviter.');
  try { inviteForm.reset(); } catch {}
  if (inviteInputEl) inviteInputEl.focus();
}
function closeInviteModal() {
  if (!inviteModalEl) return;
  inviteModalEl.classList.remove('show');
  inviteModalEl.setAttribute('aria-hidden', 'true');
}

function showToast(message, type = 'ok') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}
if (inviteMemberBtn) {
  inviteMemberBtn.addEventListener('click', () => { openInviteModal(); });
}
if (inviteInputEl) {
  inviteInputEl.addEventListener('input', () => {
    const q = inviteInputEl.value.trim();
    clearTimeout(inviteTimer);
    inviteSuggestionsEl && (inviteSuggestionsEl.innerHTML = '');
    if (!serverId) { inviteFeedbackEl && (inviteFeedbackEl.textContent = 'Sélectionnez un serveur pour inviter.'); return; }
    if (q.length < 2) { inviteFeedbackEl && (inviteFeedbackEl.textContent = ''); return; }
    inviteTimer = setTimeout(async () => {
      try {
        if (inviteCtrl) inviteCtrl.abort();
        inviteCtrl = new AbortController();
        const res = await fetch(`/users/search?q=${encodeURIComponent(q)}&limit=8`, { credentials: 'same-origin', signal: inviteCtrl.signal });
        const list = await res.json().catch(() => []);
        if (!inviteSuggestionsEl) return;
        inviteSuggestionsEl.innerHTML = '';
        list.forEach(u => {
          const li = document.createElement('li');
          const color = u.displayColor || '#e6e9ef';
          li.innerHTML = `<span class="presence" style="background:${color}"></span><span class="username" style="color:${color}">${u.username}</span>`;
          li.addEventListener('click', async () => {
            await inviteUser(u.username);
          });
          inviteSuggestionsEl.appendChild(li);
        });
      } catch {}
    }, 250);
  });
  inviteInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstUserEl = inviteSuggestionsEl?.querySelector('li .username');
      if (firstUserEl) {
        const name = firstUserEl.textContent?.trim();
        if (name) inviteUser(name);
      }
    }
  });
}
// Soumission désactivée — cliquer une suggestion lance directement l’invitation.
if (inviteCancelBtn) {
  inviteCancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeInviteModal(); });
}
if (inviteCloseBtn) {
  inviteCloseBtn.addEventListener('click', (e) => { e.preventDefault(); closeInviteModal(); });
}
if (inviteModalEl) {
  inviteModalEl.addEventListener('click', (e) => { if (e.target === inviteModalEl) closeInviteModal(); });
}

async function inviteUser(username) {
  if (!serverId) { inviteFeedbackEl && (inviteFeedbackEl.textContent = 'Sélectionnez un serveur.'); return; }
  if (!username) return;
  inviteFeedbackEl && (inviteFeedbackEl.textContent = '');
  try {
    const res = await fetch(`/servers/${encodeURIComponent(serverId)}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    // Traite comme succès si HTTP OK et pas de statut d’erreur.
    if (res.ok && data?.status !== 'error') {
      inviteFeedbackEl && (inviteFeedbackEl.textContent = `Invitation envoyée à ${username}.`);
      if (inviteSuggestionsEl) inviteSuggestionsEl.innerHTML = '';
      closeInviteModal();
      showToast(`Invitation envoyée à ${username}.`, 'ok');
      return;
    }
    const code = data?.code || 'error';
    const msg = code === 'forbidden' ? 'Vous n’avez pas les droits.'
      : code === 'user_not_found' ? 'Utilisateur introuvable.'
      : code === 'not_found' ? 'Serveur introuvable.'
      : code === 'already_member' ? 'Déjà membre'
      : 'Invitation échouée.';
    inviteFeedbackEl && (inviteFeedbackEl.textContent = msg);
    if (code === 'already_member') showToast('Déjà membre', 'err');
  } catch {
    inviteFeedbackEl && (inviteFeedbackEl.textContent = 'Invitation échouée.');
    showToast('Invitation échouée.', 'err');
  }
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeCreateServerModal();
  });
}
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeCreateServerModal();
  });
}
if (modalEl) {
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeCreateServerModal();
  });
}