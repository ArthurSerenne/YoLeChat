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

  const container = document.createElement('div');
  container.className = 'msg-container';
  li.appendChild(container);

  const body = document.createElement('div');
  body.className = 'msg';
  body.innerHTML = `<span class="author" style="color:${color}">${name}</span> <span class="content">${m.content}</span> <button class="add-reaction" title="Ajouter une réaction" onclick="addReaction('${m.id}')">+</button>`;
  container.appendChild(body);

  const reactionsEl = document.createElement('div');
  reactionsEl.className = 'reactions';
  reactionsEl.id = `reactions-${m.id}`;
  container.appendChild(reactionsEl);

  if (m.reactions && Array.isArray(m.reactions)) {
    const counts = {};
    m.reactions.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    Object.entries(counts).forEach(([emoji, count]) => {
      addReactionToUi(m.id, emoji, count, false);
    });
  }

  messagesEl.appendChild(li);
  lastAuthorId = authorId;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

let currentMessageIdForReaction = null;
const reactionModal = document.getElementById('reactionModal');
const reactionClose = document.getElementById('reactionClose');
const emojiBtns = document.querySelectorAll('.emoji-btn');

function openReactionModal(msgId) {
  currentMessageIdForReaction = msgId;
  if (!reactionModal) return;
  reactionModal.classList.add('show');
  reactionModal.setAttribute('aria-hidden', 'false');
}

function closeReactionModal() {
  if (!reactionModal) return;
  reactionModal.classList.remove('show');
  reactionModal.setAttribute('aria-hidden', 'true');
  currentMessageIdForReaction = null;
}

if (reactionClose) reactionClose.addEventListener('click', closeReactionModal);
if (reactionModal) reactionModal.addEventListener('click', (e) => {
  if (e.target === reactionModal) closeReactionModal();
});

emojiBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const emoji = btn.dataset.emoji;
    if (currentMessageIdForReaction && emoji) {
      socket.emit('message.react', { messageId: currentMessageIdForReaction, emoji }, (res) => {
        if (res && res.status !== 'ok') {
          showToast('Erreur réaction', 'err');
        }
      });
      closeReactionModal();
    }
  });
});

function addReaction(msgId) {
  openReactionModal(msgId);
}

function addReactionToUi(msgId, emoji, count = 1, append = true) {
  const container = document.getElementById(`reactions-${msgId}`);
  if (!container) return;

  let pill = Array.from(container.children).find(c => c.dataset.emoji === emoji);
  if (pill) {
    const countSpan = pill.querySelector('.count');
    if (countSpan) {
      const current = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = append ? current + 1 : count;
    }
  } else {
    pill = document.createElement('span');
    pill.className = 'reaction-pill';
    pill.dataset.emoji = emoji;
    pill.innerHTML = `${emoji} <span class="count">${count}</span>`;
    container.appendChild(pill);
  }
}

socket.on('message.reaction.new', ({ messageId, emoji }) => {
  addReactionToUi(messageId, emoji, 1, true);
});

function openCreateServerModal() {
  if (!modalEl || !modalForm) return;
  modalEl.classList.add('show');
  modalEl.setAttribute('aria-hidden', 'false');
  modalFeedbackEl && (modalFeedbackEl.textContent = '');
  try { modalForm.reset(); } catch { }
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
  if (!users || !currentUser) { typingEl.textContent = ''; return; }
  const others = users.filter(u => u !== currentUser.username);
  if (others.length === 0) { typingEl.textContent = ''; return; }

  const label = others.length === 1 ? `${others[0]} écrit…` : `${others.join(', ')} écrivent…`;
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
          } catch { }
        }
      }
      closeCreateServerModal();
      window.location.assign(`/chat?server=${encodeURIComponent(newServerId)}`);
    } catch (err) {
      modalFeedbackEl.innerHTML = '<span class="err">Création du serveur échouée.</span>';
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (e) { }
    try { socket.disconnect(); } catch { }
    window.location.assign('/home?tab=login');
  });
}

if (toggleBtn && chatContainer) {
  toggleBtn.addEventListener('click', () => {
    const collapsed = chatContainer.classList.toggle('users-collapsed');
    const label = collapsed ? 'Afficher utilisateurs' : 'Masquer utilisateurs';
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);
  });
}

const myAvatarEl = document.getElementById('myAvatar');
const myUsernameEl = document.getElementById('myUsername');
const editProfileBtn = document.getElementById('editProfileBtn');
const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const profileFeedback = document.getElementById('profileFeedback');
const profileClose = document.getElementById('profileClose');
const profileCancel = document.getElementById('profileCancel');
const colorPicker = document.getElementById('colorPicker');
const colorText = document.getElementById('colorText');

let currentUser = null;

async function loadMe() {
  try {
    const res = await fetch('/users/me', { credentials: 'same-origin' });
    if (!res.ok) return;
    const user = await res.json();
    currentUser = user;
    if (myUsernameEl) myUsernameEl.textContent = user.username;
    if (myAvatarEl) {
      myAvatarEl.style.backgroundColor = user.displayColor || 'var(--bg-700)';
      myAvatarEl.textContent = (user.username || '?').charAt(0).toUpperCase();
      myAvatarEl.style.color = getContrastColor(user.displayColor || '#12161c');
    }
  } catch { }
}

function getContrastColor(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

function openProfileModal() {
  if (!profileModal || !currentUser) return;
  profileModal.classList.add('show');
  profileModal.setAttribute('aria-hidden', 'false');
  profileFeedback.textContent = '';
  const nameInput = profileForm.querySelector('input[name="username"]');
  if (nameInput) nameInput.value = currentUser.username;
  if (colorText) colorText.value = currentUser.displayColor;
  if (colorPicker) colorPicker.value = currentUser.displayColor || '#000000';
}
function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.remove('show');
  profileModal.setAttribute('aria-hidden', 'true');
}

if (editProfileBtn) editProfileBtn.addEventListener('click', openProfileModal);
if (profileClose) profileClose.addEventListener('click', closeProfileModal);
if (profileCancel) profileCancel.addEventListener('click', closeProfileModal);
if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfileModal(); });
if (colorPicker && colorText) {
  colorPicker.addEventListener('input', (e) => { colorText.value = e.target.value; });
  colorText.addEventListener('input', (e) => {
    const v = e.target.value;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) colorPicker.value = v;
  });
}

if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileFeedback.textContent = '';
    const formData = new FormData(profileForm);
    const username = formData.get('username').trim();
    const displayColor = formData.get('displayColor').trim();

    try {
      const res = await fetch('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayColor }),
        credentials: 'same-origin'
      });
      if (res.ok) {
        showToast('Profil mis à jour !', 'ok');
        closeProfileModal();
        await loadMe();
      } else {
        profileFeedback.textContent = 'Erreur lors de la mise à jour.';
      }
    } catch {
      profileFeedback.textContent = 'Erreur réseau.';
    }
  });
}

updateServerTitle();
loadServers();
loadHistory();
loadMe();

if (createServerBtn) {
  createServerBtn.addEventListener('click', () => {
    openCreateServerModal();
  });
}

if (inputEl) {
  inputEl.addEventListener('input', () => {
    startTyping();
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const event = new Event('submit', { cancelable: true });
      formEl.dispatchEvent(event);
    }
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (!confirm('Voulez-vous vraiment effacer tout l’historique de ce salon ?')) return;
    try {
      const url = serverId ? `/chat/messages?server=${encodeURIComponent(serverId)}` : '/chat/messages';
      const res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'ok') {
        messagesEl.innerHTML = '';
        showToast('Historique effacé.', 'ok');
      } else {
        showToast('Impossible d’effacer (Permissions ?)', 'err');
      }
    } catch {
      showToast('Erreur réseau.', 'err');
    }
  });
}

let inviteTimer;
let inviteCtrl;
function openInviteModal() {
  if (!inviteModalEl || !inviteForm) return;
  inviteModalEl.classList.add('show');
  inviteModalEl.setAttribute('aria-hidden', 'false');
  inviteFeedbackEl && (inviteFeedbackEl.textContent = serverId ? '' : 'Sélectionnez un serveur pour inviter.');
  try { inviteForm.reset(); } catch { }
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
      } catch { }
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

const createInvitesInput = document.getElementById('createInvitesInput');
const createServerSuggestions = document.getElementById('createServerSuggestions');
let createInviteTimer;
let createInviteCtrl;

if (createInvitesInput && createServerSuggestions) {
  createInvitesInput.addEventListener('input', () => {
    const val = createInvitesInput.value;
    const parts = val.split(',');
    const lastPart = parts[parts.length - 1].trim();

    clearTimeout(createInviteTimer);
    createServerSuggestions.innerHTML = '';

    if (lastPart.length < 2) return;

    createInviteTimer = setTimeout(async () => {
      try {
        if (createInviteCtrl) createInviteCtrl.abort();
        createInviteCtrl = new AbortController();
        const res = await fetch(`/users/search?q=${encodeURIComponent(lastPart)}&limit=5`, { credentials: 'same-origin', signal: createInviteCtrl.signal });
        const list = await res.json().catch(() => []);

        createServerSuggestions.innerHTML = '';
        list.forEach(u => {
          const li = document.createElement('li');
          const color = u.displayColor || '#e6e9ef';
          li.innerHTML = `<span class="presence" style="background:${color}"></span><span class="username" style="color:${color}">${u.username}</span>`;

          li.addEventListener('click', () => {
            // Replace last part with username
            parts[parts.length - 1] = ' ' + u.username;
            createInvitesInput.value = parts.join(',') + ', ';
            createServerSuggestions.innerHTML = '';
            createInvitesInput.focus();
          });
          createServerSuggestions.appendChild(li);
        });
      } catch { }
    }, 250);
  });

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!createInvitesInput.contains(e.target) && !createServerSuggestions.contains(e.target)) {
      createServerSuggestions.innerHTML = '';
    }
  });
}
