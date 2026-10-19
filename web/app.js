const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const cats = document.getElementById('cats');
const q = document.getElementById('q');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');

let data = null;
let activeCat = 'all';
let query = '';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

async function load() {
  const res = await fetch('./registry.json');
  data = await res.json();
  renderCats();
  render();
}

function renderCats() {
  cats.replaceChildren();
  const all = el('button', 'cat' + (activeCat === 'all' ? ' active' : ''), 'All');
  all.addEventListener('click', () => { activeCat = 'all'; renderCats(); render(); });
  cats.append(all);
  const set = [...new Set(data.servers.map(s => s.category))].sort();
  for (const c of set) {
    const b = el('button', 'cat' + (activeCat === c ? ' active' : ''), c);
    b.addEventListener('click', () => { activeCat = c; renderCats(); render(); });
    cats.append(b);
  }
}

function matches(s) {
  if (activeCat !== 'all' && s.category !== activeCat) return false;
  const qq = query.trim().toLowerCase();
  if (!qq) return true;
  const hay = `${s.id} ${s.name} ${s.description} ${(s.tags || []).join(' ')} ${s.category} ${s.author || ''}`.toLowerCase();
  return hay.includes(qq);
}

function card(s) {
  const c = el('article', 'card');
  const head = el('div', 'card-head');
  const tile = el('span', 'tile');
  tile.style.setProperty('--hue', hue(s.id));
  tile.textContent = s.name[0];
  const info = el('div', 'card-info');
  info.append(el('h3', null, s.name));
  info.append(el('p', 'desc', s.description));
  head.append(tile, info);
  const meta = el('div', 'card-meta');
  meta.append(el('span', 'badge', s.category));
  if (s.verified) meta.append(el('span', 'badge verified', 'verified'));
  if (s.featured) meta.append(el('span', 'badge featured', 'featured'));
  const tags = el('div', 'tags');
  for (const t of (s.tags || []).slice(0, 4)) tags.append(el('span', 'tag', t));
  const foot = el('div', 'card-foot');
  const cmd = el('code', null, `mcp-bazaar install ${s.id}`);
  const btn = el('button', 'btn', 'Details');
  btn.addEventListener('click', () => openModal(s));
  foot.append(cmd, btn);
  c.append(head, meta, tags, foot);
  return c;
}

function hue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function render() {
  const list = data.servers.filter(matches);
  grid.replaceChildren(...list.map(card));
  empty.hidden = list.length !== 0;
}

function openModal(s) {
  document.getElementById('mName').textContent = s.name;
  document.getElementById('mDesc').textContent = s.description;
  const meta = document.getElementById('mMeta');
  meta.replaceChildren();
  const rows = [
    ['ID', s.id],
    ['Category', s.category],
    ['Author', s.author || '-'],
    ['Runtime', s.runtime],
    ['Package', s.package || '-'],
    ['Version', s.version || '-'],
    ['License', s.license || '-'],
    ['Verified', s.verified ? 'yes' : 'no'],
  ];
  for (const [k, v] of rows) {
    const r = el('div', 'meta-row');
    r.append(el('span', 'mk', k), el('span', 'mv', v));
    meta.append(r);
  }
  const env = document.getElementById('mEnv');
  env.replaceChildren();
  if (s.env && Object.keys(s.env).length) {
    env.append(el('h4', null, 'Environment variables'));
    for (const [k, m] of Object.entries(s.env)) {
      const r = el('div', 'env-row');
      r.append(el('code', null, k), el('span', null, m.description + (m.required ? ' (required)' : '')));
      env.append(r);
    }
  }
  document.getElementById('mCmd').textContent = `mcp-bazaar install ${s.id}`;
  modal.showModal();
}

closeModal.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

document.getElementById('copyCmd').addEventListener('click', async () => {
  const cmd = document.getElementById('mCmd').textContent;
  try { await navigator.clipboard.writeText(cmd); } catch {}
  const b = document.getElementById('copyCmd');
  const t = b.textContent; b.textContent = 'Copied!'; setTimeout(() => b.textContent = t, 1200);
});

q.addEventListener('input', () => { query = q.value; render(); });

load().catch(err => { console.error(err); });
