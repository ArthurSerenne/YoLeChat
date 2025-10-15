(() => {
  const heroButtons = document.querySelectorAll('.hero-btn');
  const registerBtn = document.querySelector('.hero-btn[data-tab="register"]');
  const loginBtn = document.querySelector('.hero-btn[data-tab="login"]');
  const tabs = document.querySelectorAll('.tab');
  const tabsContainer = document.querySelector('.tabs');
  const registerTab = document.getElementById('register');
  const loginTab = document.getElementById('login');
  const feedback = document.getElementById('feedback');

  function setActive(tabName) {
    tabs.forEach(t => t.classList.toggle('active', t.id === tabName));
    feedback.textContent = '';
    heroButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (registerBtn && loginBtn) {
      const activeBtn = tabName === 'register' ? registerBtn : loginBtn;
      const inactiveBtn = tabName === 'register' ? loginBtn : registerBtn;
      activeBtn.classList.add('primary');
      activeBtn.classList.remove('outline');
      inactiveBtn.classList.add('outline');
      inactiveBtn.classList.remove('primary');
    }
    ensureStableTabsHeight();
  }

  function measureTabHeight(el) {
    if (!el) return 0;
    const isVisible = el.classList.contains('active');
    if (isVisible) return el.offsetHeight;
    const prev = {
      display: el.style.display,
      visibility: el.style.visibility,
      position: el.style.position,
      zIndex: el.style.zIndex,
    };
    el.style.display = 'block';
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    el.style.zIndex = '-1';
    const h = el.offsetHeight;
    el.style.display = prev.display;
    el.style.visibility = prev.visibility;
    el.style.position = prev.position;
    el.style.zIndex = prev.zIndex;
    return h;
  }

  function ensureStableTabsHeight() {
    if (!tabsContainer || !registerTab || !loginTab) return;
    const maxH = Math.max(measureTabHeight(registerTab), measureTabHeight(loginTab));
    tabsContainer.style.minHeight = `${maxH}px`;
  }

  const debounce = (fn, wait = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  heroButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.dataset.tab;
      setActive(tab);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab');
  if (initialTab === 'login' || initialTab === 'register') {
    setActive(initialTab);
  }

  ensureStableTabsHeight();
  window.addEventListener('resize', debounce(ensureStableTabsHeight, 150));

  const apiBase = window.location.origin;

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }

  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.textContent = 'Inscription en cours…';
    const form = e.currentTarget;
    const dto = {
      username: form.username.value.trim(),
      password: form.password.value,
      displayColor: form.displayColor.value.trim() || undefined,
    };
    try {
      const { accessToken } = await postJson(`${apiBase}/auth/register`, dto);
      localStorage.setItem('token', accessToken);
      feedback.innerHTML = '<span class="ok">Compte créé ✔ — vous êtes connecté.</span>';
      setActive('login');
    } catch (err) {
      feedback.innerHTML = `<span class="err">${err.message}</span>`;
    }
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.textContent = 'Connexion en cours…';
    const form = e.currentTarget;
    const dto = {
      username: form.username.value.trim(),
      password: form.password.value,
    };
    try {
      const { accessToken } = await postJson(`${apiBase}/auth/login`, dto);
      localStorage.setItem('token', accessToken);
      feedback.innerHTML = '<span class="ok">Connecté ✔</span>';
    } catch (err) {
      feedback.innerHTML = `<span class="err">${err.message}</span>`;
    }
  });

  const displayColorInput = document.querySelector('input[name="displayColor"]');
  const swatches = document.querySelectorAll('.swatch');
  const colorPicker = document.getElementById('colorPicker');

  function setColor(hex) {
    if (!displayColorInput) return;
    displayColorInput.value = hex;
    swatches.forEach(s => s.classList.toggle('selected', s.dataset.color === hex));
    if (colorPicker) colorPicker.value = hex;
  }

  swatches.forEach(s => {
    s.addEventListener('click', () => setColor(s.dataset.color));
  });

  colorPicker?.addEventListener('input', (e) => {
    const hex = e.target.value;
    setColor(hex);
  });
  if (colorPicker) setColor(colorPicker.value);


  const gotoDivs = document.querySelectorAll('div[data-goto]');
  gotoDivs.forEach((el) => {
    const target = el.getAttribute('data-goto');
    if (!target) return;
    const navigate = () => window.location.assign(target);
    el.addEventListener('click', navigate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    });
  });
})();