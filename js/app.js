(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');

  let WA = '5215512345678';
  let WA_LIST = ['5215512345678'];
  let EMAILS = [];

  function abrirWhatsApp(msg) {
    const txt = encodeURIComponent(msg);
    WA_LIST.forEach((num, i) => {
      setTimeout(() => window.open('https://wa.me/' + num + '?text=' + txt, '_blank', 'noopener'), i * 600);
    });
  }

  function applyConfig(cfg) {
    if (!cfg) return;
    const nums = [];
    ['wa', 'wa1', 'wa2', 'wa3'].forEach((k) => { const v = String(cfg[k] || '').replace(/[^0-9]/g, ''); if (v && v.length >= 10) nums.push(v); });
    if (nums.length) { WA = nums[0]; WA_LIST = nums; }
    EMAILS = ['email', 'email1', 'email2'].map((k) => String(cfg[k] || '').trim()).filter(Boolean);
    const f = $('#waFloat');
    if (f) f.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola! vi su página y quiero agendar.');
  }
  const SHEET_URL = '';
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/1Wg9htlRxihL6kd05ryrunMsLE85raNl0D10301xRUho/export?format=csv';
  const REVIEWS_SHEET_URL = '';
  const REFRESH_MS = 30000;

  let DATA = null;
  let RESENAS = [];

  const supa = (window.SUPABASE && window.SUPABASE.url && window.SUPABASE.anonKey && window.supabase)
    ? window.supabase.createClient(window.SUPABASE.url, window.SUPABASE.anonKey)
    : null;
  if (supa) console.log('[sucursal] Supabase conectado');

  /* ---------------- helpers ---------------- */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 350); }, 2600);
  }

  /* ---------------- hero: palabras rotando ---------------- */
  const cyc = $('#cyc');
  if (cyc) {
    const list = ['tu barbero.', 'tu estilo.', 'tu momento.'];
    const swapEl = (sp, arr, k) => {
      sp.classList.remove('swap');
      void sp.offsetWidth;
      sp.textContent = arr[k % arr.length];
      sp.classList.add('swap');
      return k;
    };
    let k = 0;
    setInterval(() => { k = swapEl(cyc, list, k + 1); }, 2600);
  }

  /* ---------------- reveal on scroll ---------------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------------- prueba social arriba (hero) ---------------- */
  const trustBar = $('#trustBar');
  function renderTrust() {
    const est = (DATA && DATA.estrellas) || '4.9';
    const n = (DATA && DATA.reseñas_count) || RESENAS.length || '128';
    const abierto = !DATA || DATA.open !== false;
    const hor = (DATA && DATA.horario) || 'Lunes a Sábado · 9:00 a 21:00';
    trustBar.innerHTML =
      '<span class="trust-stars">★ ' + est + '</span><span>' + n + ' reseñas en Google</span><span class="dot">·</span>' +
      '<span>' + (abierto ? 'Abiertos ahora' : 'Cerramos hoy') + '</span><span class="dot">·</span><span>' + hor + '</span>';
  }
  renderTrust();

  /* ---------------- agenda de 1 toque (escasez real) ---------------- */
  const slotGrid = $('#slotGrid');
  const fmtFecha = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  async function renderSlots() {
    slotGrid.innerHTML = '';
    const slots = ((DATA && DATA.slots) || []);
    if (!slots.length) { slotGrid.innerHTML = ''; return; }
    const now = new Date();
    const list = [];
    slots.forEach((s) => {
      const dayBase = new Date(now); dayBase.setHours(0, 0, 0, 0);
      for (let k = 0; k < 14; k++) {
        const cand = new Date(dayBase.getTime() + k * 86400000);
        if (cand.getDay() === Number(s.weekday)) {
          const parts = String(s.time).split(':').map(Number);
          const dt = new Date(cand); dt.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          if (dt.getTime() > now.getTime()) list.push({ dt, cap: s.cap == null ? 3 : Number(s.cap), fijo: s.left == null ? null : Number(s.left), time: String(s.time) });
          break;
        }
      }
    });
    list.sort((a, b) => a.dt - b.dt);
    list.length = Math.min(list.length, 6);

    const reservados = {};
    if (supa) {
      try {
        const { data, error } = await supa.from('reservas').select('fecha,hora,estado').not('estado', 'eq', 'cancelada');
        if (!error && data) data.forEach((r) => { const k = r.fecha + '|' + r.hora; reservados[k] = (reservados[k] || 0) + 1; });
      } catch (e) { /* sin base: se usan los datos de la hoja */ }
    }

    list.forEach(({ dt, cap, fijo, time }) => {
      const key = fmtFecha(dt) + '|' + time;
      const usados = reservados[key] || 0;
      const left = supa ? cap - usados : ((fijo == null ? cap - usados : fijo));
      const full = left <= 0;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'slot' + (full ? ' off' : '');
      const day = dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeL = dt.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
      el.innerHTML = '<b class="slot-day">' + day + '</b><span class="slot-time">' + timeL + '</span>' +
        '<small class="slot-note">' + (full ? 'Lleno — ya no hay' : (left === 1 ? 'Queda 1 lugar · toca' : 'Quedan ' + left + ' · toca')) + '</small>';
      if (!full) {
        el.addEventListener('click', async () => {
          if (supa) {
            try {
              const { error } = await supa.from('reservas').insert([{ nombre: '', servicio: '', fecha: fmtFecha(dt), hora: time, estado: 'pendiente', notify: EMAILS[0] || '' }]);
              if (error) { toast('No se pudo reservar — inténtalo otra vez.'); return; }
              renderSlots();
            } catch (e) { toast('Sin conexión — confirma directo por WhatsApp.'); }
          }
          const msg = 'Hola, quiero agendar para el ' + day + ' a las ' + timeL + ' (quedan ' + left + ' lugares). ¿Me confirman?';
          abrirWhatsApp(msg);
        });
      }
      slotGrid.appendChild(el);
    });
  }

  /* ---------------- banner texto estado ---------------- */
  const banner = $('#stateBanner');
  function stateBanner() {
    if (!DATA) return;
    const info = 'Horario: ' + (DATA.horario || 'Lunes a Sábado · 9:00 a 21:00');
    banner.className = 'banner ' + (DATA.open === false ? 'bad' : 'ok');
    banner.textContent = DATA.open === false ? 'Cerramos por hoy — agenda para mañana sin problema.' : 'Abiertos ahora · ' + info;
    banner.hidden = false;
  }

  /* ---------------- render de servicios ---------------- */
  const menuEl = $('#menu');
  function renderMenu() {
    const items = (DATA && DATA.items) || [];
    menuEl.innerHTML = '';
    items.forEach((m) => {
      const off = m.available === false;
      const it = document.createElement('article');
      it.className = 'menu-item' + (off ? ' off' : '');
      const priceHtml = (DATA.showPrices !== false) && m.price
        ? '<span class="mi-price">' + money(m.price) + '</span>'
        : '<span class="mi-price na">Pregunta precio</span>';
      const btnHtml = off
        ? '<span class="add-btn sold" style="cursor:default">Hoy no disponible</span>'
        : '<button class="add-btn" type="button">Agendar este</button>';
      it.innerHTML =
        '<img class="mi-img" src="' + m.img + '" alt="' + m.name + '" loading="lazy" onerror="this.classList.add(\'noimg\')" />' +
        '<div class="mi-body"><span class="mi-tag">' + (m.tag || '') + '</span><b class="mi-name">' + m.name + '</b>' +
        '<p class="mi-desc">' + (m.desc || '') + '</p><div class="mi-foot">' + priceHtml + btnHtml + '</div></div>';
      const btn = $('.add-btn', it);
      if (btn) {
        btn.addEventListener('click', () => pickService(m.name, btn));
      }
      menuEl.appendChild(it);
    });
  }

  function pickService(name, btn) {
    const sel = $('#bkService');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === name) { sel.value = name; break; }
    }
    $('#cita').scrollIntoView({ behavior: 'smooth' });
    if (btn) { btn.textContent = '✓ Elegido'; btn.classList.add('added'); setTimeout(() => { btn.textContent = 'Agendar este'; btn.classList.remove('added'); }, 1200); }
  }

  /* ---------------- agenda por WhatsApp ---------------- */
  function populateServices() {
    const sel = $('#bkService');
    const items = (DATA && DATA.items) || [];
    sel.innerHTML = '<option disabled selected>Elige tu servicio…</option>' +
      items.filter((i) => i.available !== false).map((i) => '<option value="' + i.name + '">' + i.name + ' · ' + (i.price ? money(i.price) : 'a consultar') + '</option>').join('');
  }

  const bkDay = $('#bkDay');
  if (bkDay) {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    bkDay.min = tm.toISOString().split('T')[0];
  }

  $('#bkSend').addEventListener('click', async () => {
    if (DATA && DATA.open === false) { toast('Cerramos por hoy — elige un día siguiente.'); return; }
    const sv = $('#bkService').value;
    const day = $('#bkDay').value;
    const hour = $('#bkHour').value;
    const name = $('#bkName').value.trim();
    if (!sv) { toast('Primero elige tu servicio 🙂'); return; }
    if (!day) { toast('Falta el día de tu cita'); return; }
    if (supa) {
      try {
        const { error } = await supa.from('reservas').insert([{ nombre: name, servicio: sv, fecha: day, hora: hour, estado: 'pendiente', notify: EMAILS[0] || '' }]);
        if (error) { toast('No se pudo registrar — inténtalo otra vez.'); return; }
        renderSlots();
      } catch (e) { toast('Sin conexión — confirma directo por WhatsApp.'); }
    }
    const neg = (DATA && DATA.nombre) || 'Barba Maestra';
    const msg = 'Hola, quiero agendar en ' + neg + ':\nServicio: ' + sv +
      '\nDía: ' + day.split('-').reverse().join('/') +
      '\nHora: ' + hour +
      (name ? '\nNombre: ' + name : '') +
      '\n¿Me confirman disponibilidad?';
    abrirWhatsApp(msg);
    toast('Cita registrada — confirma en WhatsApp');
  });

  /* ---------------- reseñas ---------------- */
  const reviewGrid = $('#reviewGrid');
  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }
  function renderReviews() {
    reviewGrid.innerHTML = '';
    RESENAS.slice(0, 6).forEach((r) => {
      const el = document.createElement('div');
      el.className = 'review-card';
      const ini = (r.name || '?').trim().charAt(0).toUpperCase();
      el.innerHTML =
        '<div class="review-top"><span class="review-ava">' + ini + '</span>' +
        '<span><b>' + (r.name || 'Cliente') + '</b><small>' + (r.date || '') + '</small></span></div>' +
        '<div class="review-stars">' + stars(Math.min(5, Math.max(1, parseInt(r.stars, 10) || 5))) + '</div>' +
        '<p>' + (r.text || '') + '</p>';
      reviewGrid.appendChild(el);
    });
    const badge = $('#resenasBadge');
    if (badge && (DATA && DATA.estrellas)) {
      badge.textContent = '★ ' + DATA.estrellas + ' · ' + (DATA.reseñas_count || RESENAS.length) + ' reseñas en Google';
    }
  }

  /* ---------------- datos: Sheets + respaldo ---------------- */
  function parseCSV(text) {
    const rows = [];
    let cur = '', row = [], q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') { q = true; }
      else if (ch === ',') { row.push(cur.trim()); cur = ''; }
      else if (ch === '\n' || ch === '\r') { row.push(cur.trim()); cur = ''; if (row.length) rows.push(row); row = []; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows;
  }
  function parseCarta(rows) {
    const items = [];
    const config = {};
    const slots = [];
    let bloque = 'carta'; // 'carta' | 'config' | 'slots'
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const head = String(r[0]).trim().toUpperCase();
      if (head === 'CONFIG') { bloque = 'config'; continue; }
      if (head === 'SLOTS') { bloque = 'slots'; continue; }
      if (bloque === 'config') {
        const k = String(r[0]).trim().toLowerCase();
        const v = (r[1] || '').trim();
        if (k && v) config[k] = v;
        continue;
      }
      if (bloque === 'slots') {
        const weekday = parseInt(String(r[0]).trim(), 10);
        const time = String(r[1] || '').trim();
        if (!isNaN(weekday) && /^\d{1,2}:\d{2}$/.test(time)) {
          slots.push({ weekday, time, cap: r[2] ? Number(String(r[2]).replace(/[^0-9]/g, '')) || null : null });
        }
        continue;
      }
      const price = Number((r[3] || '').replace(/[^0-9.]/g, ''));
      const av = String(r[5] || 'si').trim().toLowerCase();
      items.push({
        name: r[0], tag: r[1] || '', desc: r[2] || '',
        price: price > 0 ? price : null,
        img: r[4] || '',
        available: !(av === 'no' || av === 'n' || av === 'false' || av === '0' || av === 'agotado'),
      });
    }
    return { items, config, slots };
  }
  function resenasFromSheet(rows) {
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      out.push({ name: r[0], stars: parseInt(r[1], 10) || 5, text: r[2] || '', date: r[3] || '', img: r[4] || '' });
    }
    return out;
  }

  async function fetchData() {
    let src = null;
    if (SHEET_URL) {
      try { const r = await fetch(SHEET_URL, { cache: 'no-store' }); if (r.ok) src = (await r.json()); } catch (e) { src = null; }
    }
    if (!src && CSV_URL) {
      try {
        const r = await fetch(CSV_URL, { cache: 'no-store' });
        if (r.ok) src = parseCarta(parseCSV(await r.text()));
      } catch (e) { src = null; }
    }
    if (!src || !src.items || !src.items.length) {
      try {
        const r = await fetch('negocio.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) { src = await r.json(); if (src.config) applyConfig(src.config); }
      } catch (e) { src = null; }
    }
    if (!src || !src.items || !src.items.length) return;
    if (src.config) applyConfig(src.config);
    src.items = src.items.filter((i) => i && i.name);
    DATA = src;

    /* horarios: la hoja manda; si no trae bloque SLOTS, se usan los del respaldo */
    if (!DATA.slots || !DATA.slots.length) {
      try {
        const fb = await (await fetch('negocio.json?t=' + Date.now(), { cache: 'no-store' })).json();
        if (fb && fb.slots && fb.slots.length) DATA.slots = fb.slots;
      } catch (e) { /* sin respaldo */ }
    }

    if (REVIEWS_SHEET_URL) {
      try {
        const r = await fetch(REVIEWS_SHEET_URL, { cache: 'no-store' });
        if (r.ok) RESENAS = resenasFromSheet(parseCSV(await r.text()));
      } catch (e) { /* se queda el respaldo */ }
    }
    if (!RESENAS.length) {
      try {
        const r = await fetch('resenas.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) RESENAS = await r.json();
      } catch (e) { /* sin reseñas */ }
    }

    renderMenu();
    populateServices();
    renderReviews();
    stateBanner();
  }

  fetchData();
  setInterval(fetchData, REFRESH_MS);

  /* ---------------- asistente "El Peluco" ---------------- */
  const chat = $('#chat');
  const chatBody = $('#chatBody');
  const chatQs = $('#chatQs');
  const chatIn = $('#chatIn');
  const chatTxt = $('#chatTxt');
  let opened = false;

  const scrollChat = () => { chatBody.scrollTop = chatBody.scrollHeight; };
  function bot(text) { const m = document.createElement('div'); m.className = 'c-msg c-bot'; m.textContent = text; chatBody.appendChild(m); scrollChat(); }
  function me(text) { const m = document.createElement('div'); m.className = 'c-msg c-me'; m.textContent = text; chatBody.appendChild(m); scrollChat(); }
  function chips(arr) {
    chatQs.innerHTML = '';
    arr.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'q-chip';
      b.textContent = c.label;
      b.addEventListener('click', () => { me(c.label); c.run(); });
      chatQs.appendChild(b);
    });
  }
  const go = (sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); };

  const horario = () => (DATA && DATA.horario) || 'Lunes a Sábado · 9:00 a 21:00';
  const direccion = () => (DATA && DATA.direccion) || 'Av. Morelos 210, Centro';

  const TOP = () => {
    bot('Estos son nuestros servicios más pedidos:');
    const items = (DATA && DATA.items || []).slice(0, 4);
    items.forEach((i) => bot('• ' + i.name + ' · ' + (DATA.showPrices !== false && i.price ? money(i.price) : 'a consultar')));
    chips([{ label: 'Ver todo y agendar ✂', run: () => go('#servicios') }]);
  };

  function askCita() {
    bot('Con gusto. Elige el servicio abajo y te dejo el formulario de 15 segundos:');
    chips([{ label: 'Ir a agendar 📅', run: () => go('#cita') }]);
  }

  $('#cbFab').addEventListener('click', () => {
    chat.hidden = !chat.hidden;
    $('#cbFab').classList.remove('busy');
    if (!chat.hidden && !opened) {
      opened = true;
      setTimeout(() => {
        bot('¿Qué te acomodamos hoy? Te respondo con datos reales del local 👇');
        chips([
          { label: 'Quiero agendar', run: askCita },
          { label: '¿Horario?', run: () => bot('Atendemos ' + horario() + ' ☀️') },
          { label: '¿Dirección?', run: () => bot('Estamos en ' + direccion() + '. Toca el botón verde para guiarte. 🧭') },
          { label: 'Servicios y precios', run: TOP },
        ]);
        setTimeout(() => chatTxt.focus(), 300);
      }, 200);
    }
  });

  chatIn.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = chatTxt.value.trim();
    if (!v) return;
    me(v);
    chatTxt.value = '';
    const t = v.toLowerCase();
    if (t.includes('cita') || t.includes('agendar') || t.includes('turno')) { askCita(); return; }
    if (t.includes('horario') || t.includes('abren') || t.includes('cierran')) { bot('Atendemos ' + horario() + '. Sin cita también llegas, pero mejor nos avisas 😉'); return; }
    if (t.includes('donde') || t.includes('direc') || t.includes('ubic')) { bot('Estamos en ' + direccion() + '. Abre maps con el botón verde de WhatsApp. 🧭'); return; }
    if (t.includes('precio') || t.includes('cuanto') || t.includes('cuesta') || t.includes('servicios')) { TOP(); return; }
    if (t.includes('rese') || t.includes('google') || t.includes('opina')) { bot('Tenemos ★ ' + (DATA && DATA.estrellas ? DATA.estrellas : '4.9') + ' en Google, con ' + (DATA && DATA.reseñas_count ? DATA.reseñas_count : RESENAS.length) + ' reseñas. Las ves abajo 👇'); go('#resenas'); return; }
    let reply = 'No lo tengo claro 🤔 Prueba con "agendar", "horario", "precios" o "reseñas".';
    if (t.includes('hola') || t.includes('buenas')) reply = '¡Hola! ¿Qué te acomodamos hoy?';
    bot(reply);
    setTimeout(() => {
      chips([
        { label: 'Quiero agendar', run: askCita },
        { label: '¿Horario?', run: () => bot('Atendemos ' + horario() + ' ☀️') },
        { label: 'Servicios y precios', run: TOP },
      ]);
    }, 150);
  });

  /* ---------------- arranque del hero ---------------- */
  const heroImg = $('.hero-img');
  if (document.documentElement.classList.contains('js')) setTimeout(() => heroImg.classList.add('on'), 150);

  window.__sucursalReady = true;
})();