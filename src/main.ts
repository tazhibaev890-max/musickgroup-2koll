import './style.css';

const API = 'https://inai-col3.fishrungames.com';
// JWT variant: access token is short-lived; refresh token is kept for this browser tab.
const app = document.querySelector<HTMLDivElement>('#app')!;

type Profile = {
  first_name: string;
  specialization: string;
  specialization_display: string;
  bio: string;
  fee: string;
};
type User = { id: number; username: string; profile: Profile };
type Specialization = { value: string; label: string };
type ApiError = { detail?: string; [field: string]: unknown };

let accessToken = '';
let refreshToken = sessionStorage.getItem('band_refresh_token') ?? '';
let currentUser: User | null = null;
let specializations: Specialization[] = [
  { value: 'vocals', label: 'Р’РѕРєР°Р»' }, { value: 'guitar', label: 'Р“РёС‚Р°СЂР°' },
  { value: 'bass', label: 'Р‘Р°СЃ-РіРёС‚Р°СЂР°' }, { value: 'drums', label: 'РЈРґР°СЂРЅС‹Рµ' },
  { value: 'keys', label: 'РљР»Р°РІРёС€РЅС‹Рµ' }, { value: 'other', label: 'Р”СЂСѓРіРѕРµ' },
];

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  if (response.status === 401 && authenticated) {
    const refreshed = await refreshAccess();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      const retry = await fetch(`${API}${path}`, { ...init, headers });
      if (retry.ok) return retry.status === 204 ? undefined as T : await retry.json() as T;
      throw await readError(retry);
    }
  }
  if (!response.ok) throw await readError(response);
  return response.status === 204 ? undefined as T : await response.json() as T;
}

async function readError(response: Response): Promise<Error> {
  let data: ApiError = {};
  try { data = await response.json() as ApiError; } catch { /* response has no JSON body */ }
  const detail = data.detail ?? Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : String(value)}`).join('\n');
  return new Error(detail || `РћС€РёР±РєР° Р·Р°РїСЂРѕСЃР° (${response.status})`);
}

async function refreshAccess(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const result = await request<{ access: string; refresh?: string }>('/api/token/refresh/', {
      method: 'POST', body: JSON.stringify({ refresh: refreshToken }),
    });
    accessToken = result.access;
    if (result.refresh) saveRefreshToken(result.refresh);
    return Boolean(accessToken);
  } catch {
    clearSession();
    return false;
  }
}

function saveRefreshToken(token: string): void {
  refreshToken = token;
  sessionStorage.setItem('band_refresh_token', token);
}

function clearSession(): void {
  accessToken = '';
  refreshToken = '';
  currentUser = null;
  sessionStorage.removeItem('band_refresh_token');
}

function escapeHtml(value: unknown = ''): string {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function showMessage(message: string, kind: 'error' | 'success' | 'info' = 'info'): void {
  const box = document.querySelector<HTMLElement>('#notice');
  if (!box) return;
  box.textContent = message;
  box.className = `notice notice--${kind}`;
  box.hidden = false;
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => {
    button.disabled = busy;
    button.dataset.label ??= button.textContent ?? '';
    button.textContent = busy ? 'РџРѕРґРѕР¶РґРёС‚РµвЂ¦' : button.dataset.label;
  });
}

function renderAuth(mode: 'login' | 'register' = 'login'): void {
  const registering = mode === 'register';
  app.innerHTML = `
    <main class="auth-layout">
      <section class="brand-panel">
        <a class="wordmark" href="#" aria-label="РЎРѕСЃС‚Р°РІ, РЅР° РіР»Р°РІРЅСѓСЋ"><span class="wordmark__icon">РЎ</span> РЎРћРЎРўРђР’<span class="wordmark__dot">.</span></a>
        <div class="brand-copy"><p class="eyebrow">РњРЈР—Р«РљРђ РЎРћР‘РР РђР•Рў РќРђРЎ</p><h1>РљР°Р¶РґС‹Р№ Р·РІСѓРє<br>РёРјРµРµС‚ <em>СЃРІРѕС‘ РјРµСЃС‚Рѕ.</em></h1><p class="brand-text">Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚ РјСѓР·С‹РєР°РЅС‚Р°. РќР°СЃС‚СЂРѕР№С‚Рµ СЃРІРѕР№ РїСЂРѕС„РёР»СЊ Рё РѕСЃС‚Р°РІР°Р№С‚РµСЃСЊ РЅР° СЃРІСЏР·Рё СЃ РіСЂСѓРїРїРѕР№.</p></div>
        <div class="sound-wave" aria-hidden="true">${Array.from({ length: 42 }, (_, i) => `<i style="--h:${12 + ((i * 31 + i * i * 7) % 70)}px"></i>`).join('')}</div>
        <p class="brand-foot">Р Р•РџР•РўРР РЈР•Рњ. РЎРћР—Р”РђРЃРњ. Р—Р’РЈР§РРњ.</p>
      </section>
      <section class="auth-panel">
        <div class="auth-top"><span class="status-dot"></span> РљРђР‘РРќР•Рў РЈР§РђРЎРўРќРРљРђ</div>
        <div class="auth-card">
          <p class="eyebrow">${registering ? 'РќРћР’Р«Р™ РЈР§РђРЎРўРќРРљ' : 'РЎ Р РђР”РћРЎРўР¬Р® РЎРќРћР’Рђ'}</p>
          <h2>${registering ? 'РџСЂРёСЃРѕРµРґРёРЅРёС‚СЊСЃСЏ' : 'РЎ РІРѕР·РІСЂР°С‰РµРЅРёРµРј'}</h2>
          <p class="subheading">${registering ? 'РЎРѕР·РґР°Р№С‚Рµ Р°РєРєР°СѓРЅС‚, С‡С‚РѕР±С‹ Р·Р°СЏРІРёС‚СЊ Рѕ СЃРµР±Рµ.' : 'Р’РѕР№РґРёС‚Рµ РІ СЃРІРѕР№ Р°РєРєР°СѓРЅС‚ Рё РЅР°СЃС‚СЂРѕР№С‚Рµ РїСЂРѕС„РёР»СЊ.'}</p>
          <div id="notice" class="notice" role="status" hidden></div>
          <form id="auth-form" class="form-stack">
            <label class="field"><span>РРјСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ</span><input name="username" autocomplete="username" minlength="1" maxlength="150" placeholder="РЅР°РїСЂРёРјРµСЂ, alex_music" required></label>
            <label class="field"><span>РџР°СЂРѕР»СЊ</span><input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" minlength="${registering ? '6' : '1'}" placeholder="${registering ? 'РќРµ РјРµРЅРµРµ 6 СЃРёРјРІРѕР»РѕРІ' : 'Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ'}" required></label>
            <button class="button button--primary" type="submit">${registering ? 'РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚' : 'Р’РѕР№С‚Рё'} <span aria-hidden="true">в†—</span></button>
          </form>
          <p class="switch-mode">${registering ? 'РЈР¶Рµ РµСЃС‚СЊ Р°РєРєР°СѓРЅС‚?' : 'Р’РїРµСЂРІС‹Рµ Р·РґРµСЃСЊ?'} <button class="text-button" id="switch-mode" type="button">${registering ? 'Р’РѕР№С‚Рё' : 'РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚'}</button></p>
        </div>
        <p class="auth-legal">Р›РР§РќР«Р™ РљРђР‘РРќР•Рў РњРЈР—Р«РљРђРќРўРђ <span>В·</span> 2026</p>
      </section>
    </main>`;

  document.querySelector<HTMLButtonElement>('#switch-mode')!.addEventListener('click', () => renderAuth(registering ? 'login' : 'register'));
  document.querySelector<HTMLFormElement>('#auth-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setBusy(form, true);
    try {
      const result = await request<{ access: string; refresh: string; user?: User }>(registering ? '/api/register/' : '/api/login/', {
        method: 'POST', body: JSON.stringify({ username: data.get('username'), password: data.get('password') }),
      });
      accessToken = result.access;
      if (!result.refresh) throw new Error('РЎРµСЂРІРµСЂ РЅРµ РІРµСЂРЅСѓР» refresh-С‚РѕРєРµРЅ.');
      saveRefreshToken(result.refresh);
      currentUser = result.user ?? await request<User>('/api/profile/', {}, true);
      await loadSpecializations();
      renderProfile();
      showMessage(registering ? 'РђРєРєР°СѓРЅС‚ СЃРѕР·РґР°РЅ. Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ!' : 'Р’С‹ РІРѕС€Р»Рё РІ Р°РєРєР°СѓРЅС‚.', 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ Р·Р°РїСЂРѕСЃ.', 'error');
      setBusy(form, false);
    }
  });
}

async function loadSpecializations(): Promise<void> {
  try { specializations = await request<Specialization[]>('/api/specializations/'); } catch { /* keep documented fallback list */ }
}

function renderProfile(): void {
  if (!currentUser) return renderAuth();
  const profile = currentUser.profile;
  const options = specializations.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === profile.specialization ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
  const initials = (profile.first_name || currentUser.username).slice(0, 1).toUpperCase();
  app.innerHTML = `
    <main class="dashboard">
      <header class="topbar"><a class="wordmark wordmark--dark" href="#"><span class="wordmark__icon">РЎ</span> РЎРћРЎРўРђР’<span class="wordmark__dot">.</span></a><div class="topbar__right"><span class="online-label"><i></i> Р’ РЎР•РўР</span><button class="logout-button" id="logout" type="button">Р’С‹Р№С‚Рё <span aria-hidden="true">в†—</span></button></div></header>
      <section class="profile-hero"><div><p class="eyebrow">Р›РР§РќР«Р™ РљРђР‘РРќР•Рў / РЈР§РђРЎРўРќРРљ</p><h1>РњРѕР№ <em>РїСЂРѕС„РёР»СЊ.</em></h1><p class="hero-copy">Р Р°СЃСЃРєР°Р¶РёС‚Рµ РіСЂСѓРїРїРµ Рѕ СЃРµР±Рµ Рё СЃРІРѕС‘Рј Р·РІСѓС‡Р°РЅРёРё.</p></div><div class="hero-mark" aria-hidden="true">в™«</div></section>
      <section class="profile-grid">
        <aside class="identity-card"><div class="avatar">${escapeHtml(initials)}</div><span class="member-tag"><i></i> РЈР§РђРЎРўРќРРљ Р“Р РЈРџРџР«</span><h2>${escapeHtml(profile.first_name || currentUser.username)}</h2><p class="identity-user">@${escapeHtml(currentUser.username)}</p><div class="identity-divider"></div><p class="member-number">РЈР§РђРЎРўРќРРљ в„– <strong>${String(currentUser.id).padStart(3, '0')}</strong></p><p class="identity-note">Р’Р°С€ РїСЂРѕС„РёР»СЊ РІРёРґРµРЅ РѕСЂРіР°РЅРёР·Р°С‚РѕСЂР°Рј РіСЂСѓРїРїС‹.</p></aside>
        <section class="edit-card"><div class="card-heading"><div><p class="eyebrow">Р’РђРЁРђ РРќР¤РћР РњРђР¦РРЇ</p><h2>Р”Р°РЅРЅС‹Рµ РїСЂРѕС„РёР»СЏ</h2></div><span class="edit-icon" aria-hidden="true">вњі</span></div>
          <div id="notice" class="notice" role="status" hidden></div>
          <form id="profile-form" class="profile-form">
            <label class="field"><span>РРјСЏ</span><input name="first_name" maxlength="100" value="${escapeHtml(profile.first_name)}" placeholder="РљР°Рє Рє РІР°Рј РѕР±СЂР°С‰Р°С‚СЊСЃСЏ"></label>
            <label class="field"><span>РРјСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ</span><input value="${escapeHtml(currentUser.username)}" disabled><small>РРјСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РЅРµР»СЊР·СЏ РёР·РјРµРЅРёС‚СЊ</small></label>
            <label class="field"><span>РЎРїРµС†РёР°Р»РёР·Р°С†РёСЏ</span><select name="specialization" required>${options}</select></label>
            <label class="field"><span>Р“РѕРЅРѕСЂР°СЂ Р·Р° РІС‹СЃС‚СѓРїР»РµРЅРёРµ</span><div class="input-suffix"><input name="fee" inputmode="decimal" pattern="^-?\\d{0,8}(?:\\.\\d{0,2})?$" value="${escapeHtml(profile.fee)}" placeholder="0.00"><span>СЃРѕРј</span></div></label>
            <label class="field field--wide"><span>Рћ СЃРµР±Рµ</span><textarea name="bio" rows="4" placeholder="Р Р°СЃСЃРєР°Р¶РёС‚Рµ Рѕ СЃРІРѕС‘Рј РѕРїС‹С‚Рµ, РёРЅСЃС‚СЂСѓРјРµРЅС‚Р°С… Рё РјСѓР·С‹РєРµвЂ¦">${escapeHtml(profile.bio)}</textarea></label>
            <div class="form-actions"><p>РР·РјРµРЅРµРЅРёСЏ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РІ РІР°С€РµРј РїСЂРѕС„РёР»Рµ.</p><button class="button button--primary" type="submit">РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ <span aria-hidden="true">в†—</span></button></div>
          </form>
        </section>
      </section>
      <footer class="page-footer"><span>РЎРћРЎРўРђР’. Р›РР§РќР«Р™ РљРђР‘РРќР•Рў РњРЈР—Р«РљРђРќРўРђ</span><span>РќРђРЎРўР РђРР’РђР™РўР• РџР РћР¤РР›Р¬ В· Р—Р’РЈР§РРўР• Р’РњР•РЎРўР•</span></footer>
    </main>`;

  document.querySelector<HTMLButtonElement>('#logout')!.addEventListener('click', async () => {
    const button = document.querySelector<HTMLButtonElement>('#logout')!;
    button.disabled = true;
    try {
      await request('/api/logout/', { method: 'POST', body: JSON.stringify({ refresh: refreshToken }) }, true);
    } catch { /* clear local session even when the refresh token has expired */ }
    clearSession();
    renderAuth();
    showMessage('Р’С‹ РІС‹С€Р»Рё РёР· Р°РєРєР°СѓРЅС‚Р°.', 'success');
  });

  document.querySelector<HTMLFormElement>('#profile-form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const payload = Object.fromEntries(['first_name', 'specialization', 'bio', 'fee']
      .map((key) => [key, String(data.get(key) ?? '').trim()] as const)
      .filter(([key, value]) => key !== 'fee' || value !== ''));
    setBusy(form, true);
    try {
      const result = await request<User>('/api/profile/', { method: 'PATCH', body: JSON.stringify(payload) }, true);
      currentUser = result;
      renderProfile();
      showMessage('РџСЂРѕС„РёР»СЊ СЃРѕС…СЂР°РЅС‘РЅ.', 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РїСЂРѕС„РёР»СЊ.', 'error');
      setBusy(form, false);
    }
  });
}

async function start(): Promise<void> {
  const hasSession = await refreshAccess();
  if (!hasSession) return renderAuth();
  try {
    currentUser = await request<User>('/api/profile/', {}, true);
    await loadSpecializations();
    renderProfile();
  } catch {
    clearSession();
    renderAuth();
  }
}

void start();

