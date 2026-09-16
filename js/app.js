(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');

  let WA = '5215512345678';
  let WA_LIST = ['5215512345678'];
  let EMAILS = [];
  let AGENDA_MANUAL = false;
  let AGENDA_HOJA = false;
  let PANEL_KEY = '';

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
    AGENDA_MANUAL = String(cfg.agenda || '').toLowerCase() === 'manual';
    AGENDA_HOJA = String(cfg.agenda || '').toLowerCase() === 'hoja';
    PANEL_KEY = String(cfg.panel || '').trim();
    const f = $('#waFloat');
    if (f) f.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola! vi su página y quiero agendar.');
    const ol = $('#ownerLink');
    if (ol) ol.hidden = !(PANEL_KEY && supa);
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

  const NOMBRES_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  function horarioDesdeSlots(ds) {
    const slots = (ds && ds.slots) || [];
    const cerrado = (ds && ds.cerrado) || {};
    if (!slots.length) return '';
    const dias = [...new Set(slots.map((s) => Number(s.weekday)))].filter((d) => !cerrado[d]).sort((a, b) => a - b);
    if (!dias.length) return '';
    let diaTxt;
    if (dias.length === 1) diaTxt = NOMBRES_DIA[dias[0]];
    else if (dias.length === 7) diaTxt = 'Todos los días';
    else if (dias[dias.length - 1] - dias[0] + 1 === dias.length) diaTxt = NOMBRES_DIA[dias[0]] + ' a ' + NOMBRES_DIA[dias[dias.length - 1]];
    else diaTxt = dias.map((d) => NOMBRES_DIA[d]).join(', ');
    const horas = slots
      .filter((s) => !cerrado[Number(s.weekday)] && /^\d{1,2}:\d{2}$/.test(String(s.time)))
      .map((s) => Number(String(s.time).split(':')[0]) * 60 + Number(String(s.time).split(':')[1]));
    if (!horas.length) return diaTxt;
    const fmtH = (m) => String(Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0');
    return diaTxt + ' · ' + fmtH(Math.min.apply(null, horas)) + ' a ' + fmtH(Math.max.apply(null, horas));
  }
  function aplicarConfigDatos(src) {
    const c = src && src.config;
    if (!c) return;
    ['nombre', 'direccion', 'estrellas', 'reseñas_count'].forEach((k) => {
      const v = String(c[k] || '').trim();
      if (v) src[k] = v;
    });
    const h = String(c.horario || '').trim();
    if (h) src.horario = h;
  }
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
    const cerrado = (DATA && DATA.cerrado) || {};
    if (!slots.length) { slotGrid.innerHTML = ''; return; }
    const now = new Date();
    const dayBase = new Date(now); dayBase.setHours(0, 0, 0, 0);
    const hoyHoja = (now.getDay() + 6) % 7 + 1; // 1=lunes … 7=domingo, igual que la hoja
    const diasLaborales = slots.map((s) => Number(s.weekday));
    const ultimoDia = Math.max.apply(null, diasLaborales);
    const mismaSemana = hoyHoja <= ultimoDia ? 0 : 7; // 0 = quedan días en esta semana, 7 = se pasa a la siguiente
    const list = [];
    slots.forEach((s) => {
      if (cerrado[Number(s.weekday)]) return;
      const sWd = Number(s.weekday);
      let diff = sWd - hoyHoja + mismaSemana;
      if (diff < 0 || diff > 13) return; // día ya pasado esta semana, no se muestra
      const cand = new Date(dayBase.getTime() + diff * 86400000);
      const parts = String(s.time).split(':').map(Number);
      const dt = new Date(cand); dt.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
      if (dt.getTime() > now.getTime()) list.push({ dt, cap: s.cap == null ? 3 : Number(s.cap), fijo: s.left == null ? null : Number(s.left), time: String(s.time), sfull: !!s.full });
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

    list.forEach(({ dt, cap, fijo, time, sfull }) => {
      const key = fmtFecha(dt) + '|' + time;
      const usados = reservados[key] || 0;
      const left = supa ? cap - usados : ((fijo == null ? cap - usados : fijo));
      const full = AGENDA_MANUAL ? false : (AGENDA_HOJA ? sfull : (left <= 0));
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'slot' + (full ? ' off' : '');
      const day = dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeL = dt.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
      el.innerHTML = '<b class="slot-day">' + day + '</b><span class="slot-time">' + timeL + '</span>' +
        '<small class="slot-note">' + (full ? 'Lleno — ya no hay' : (AGENDA_MANUAL || AGENDA_HOJA ? 'Disponible · toca' : (left === 1 ? 'Queda 1 lugar · toca' : 'Quedan ' + left + ' · toca'))) + '</small>';
      if (!full) {
        el.addEventListener('click', async () => {
          if (supa) {
            try {
              const { error } = await supa.from('reservas').insert([{ nombre: '', servicio: '', fecha: fmtFecha(dt), hora: time, estado: 'pendiente', notify: EMAILS[0] || '' }]);
              if (error) { toast('No se pudo reservar — inténtalo otra vez.'); return; }
              renderSlots();
            } catch (e) { toast('Sin conexión — confirma directo por WhatsApp.'); }
          }
          const msg = 'Hola, quiero agendar para el ' + day + ' a las ' + timeL + (AGENDA_MANUAL || AGENDA_HOJA ? ' (solicitud)' : ' (quedan ' + left + ' lugares)') + '. ¿Me confirman?';
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
  function horasDeDia(diaSel) {
    const slots = (DATA && DATA.slots) || [];
    const cerrado = (DATA && DATA.cerrado) || {};
    if (!diaSel) return [];
    const d = new Date(diaSel + 'T00:00:00');
    if (isNaN(d.getTime())) return [];
    const diaHoja = (d.getDay() + 6) % 7 + 1;
    if (cerrado[diaHoja]) return [];
    return slots
      .filter((s) => Number(s.weekday) === diaHoja)
      .map((s) => String(s.time))
      .sort();
  }
  function poblarHoras() {
    const sel = $('#bkHour');
    const dias = horasDeDia($('#bkDay').value);
    sel.innerHTML = dias.length
      ? dias.map((h) => '<option>' + h + '</option>').join('')
      : '<option disabled selected>Elige un día con servicio…</option>';
  }

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
    bkDay.addEventListener('change', poblarHoras);
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
    const cerrado = {};
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
        const dayTxt = String(r[0]).trim();
        const timeTxt = String(r[1] || '').trim();
        const capRaw = String(r[2] || '').trim().toLowerCase();
        const isNum = /^\d+$/.test(dayTxt);
        if (isNum && /^(no|cerrado)$/i.test(timeTxt)) { cerrado[Number(dayTxt)] = true; continue; }
        if (isNum && /^\d{1,2}:\d{2}$/.test(timeTxt)) {
          let cap = null, full = false;
          if (/^\d+$/.test(capRaw)) cap = Number(capRaw);
          else if (/^(no|lleno|ocupado|agotado)$/.test(capRaw)) full = true;
          else if (!capRaw || /^(si|libre|disponible)$/.test(capRaw)) cap = 1;
          slots.push({ weekday: Number(dayTxt), time: timeTxt, cap, full });
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
    return { items, config, slots, cerrado };
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
        const r = await fetch(CSV_URL + '?t=' + Date.now(), { cache: 'no-store' });
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
        if (fb && fb.slots && fb.slots.length) { DATA.slots = fb.slots; DATA.cerrado = DATA.cerrado || {}; }
      } catch (e) { /* sin respaldo */ }
    }

    aplicarConfigDatos(DATA);
    if (!DATA.horario) DATA.horario = horarioDesdeSlots(DATA) || DATA.horario;

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
    poblarHoras();
    renderReviews();
    stateBanner();
    renderSlots();
    const ci = $('#contactInfo');
    if (ci) ci.textContent = (DATA && DATA.horario) ? DATA.horario.toUpperCase() : 'LUN A SÁB · 9:00–21:00';
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

  /* ---------------- panel del dueño ---------------- */
  const panel = $('#panel');
  const panelMain = $('#panelMain');
  const panelList = $('#panelList');
  let panelFiltro = 'prox';
  let panelTimer = null;

  const panelOk = () => sessionStorage.getItem('panel_ok') === PANEL_KEY;

  function openPanel() {
    panel.hidden = false;
    const ok = panelOk();
    $('#panelLock').hidden = ok;
    panelMain.hidden = !ok;
    $('#panelPass').value = '';
    if (ok) { cargarPanel(); clearInterval(panelTimer); panelTimer = setInterval(cargarPanel, 30000); }
  }
  function closePanel() {
    panel.hidden = true;
    clearInterval(panelTimer);
  }
  $('#ownerLink').addEventListener('click', (e) => { e.preventDefault(); openPanel(); });
  $('#panelX').addEventListener('click', closePanel);
  if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });

  $('#panelUnlock').addEventListener('click', () => {
    if (String($('#panelPass').value).trim() === PANEL_KEY) {
      sessionStorage.setItem('panel_ok', PANEL_KEY);
      $('#panelErr').hidden = true;
      openPanel();
    } else {
      $('#panelErr').hidden = false;
    }
  });
  if (document.documentElement.classList.contains('js')) setTimeout(() => { if (panelOk()) openPanel(); }, 300);

  $$('.panel-bar [data-f]').forEach((b) => b.addEventListener('click', () => {
    panelFiltro = b.dataset.f;
    $$('.panel-bar [data-f]').forEach((x) => x.classList.toggle('active', x === b));
    cargarPanel();
  }));
  $('#panelRef').addEventListener('click', cargarPanel);

  function fmtDay(t) {
    const p = String(t).split('-').map(Number);
    const dt = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
    return dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  async function cargarPanel() {
    if (!supa || panel.hidden || panelMain.hidden) return;
    panelList.innerHTML = '<p class="p-empty">Cargando citas…</p>';
    const hoy = fmtFecha(new Date());
    try {
      const asc = panelFiltro !== 'todas';
      const q = supa.from('reservas').select('*').order('fecha', { ascending: asc }).order('hora');
      const { data, error } = await q;
      if (error) { panelList.innerHTML = '<p class="p-empty">No se pudieron cargar las citas.</p>'; return; }
      const rows = (data || []).filter((r) => {
        if (panelFiltro === 'hoy') return r.fecha === hoy;
        if (panelFiltro === 'prox') return r.fecha >= hoy && r.estado !== 'cancelada';
        return true;
      }).slice(0, panelFiltro === 'todas' ? 60 : 40);
      if (!rows.length) { panelList.innerHTML = '<p class="p-empty">Sin citas por aquí.</p>'; return; }
      let lastFecha = null;
      rows.forEach((r) => {
        if (r.fecha !== lastFecha) {
          lastFecha = r.fecha;
          const p = document.createElement('p');
          p.className = 'p-date';
          p.textContent = fmtDay(r.fecha);
          panelList.appendChild(p);
        }
        const est = r.estado || 'pendiente';
        const item = document.createElement('div');
        item.className = 'p-item';
        item._id = r.id;
        item._fecha = r.fecha;
        item._hora = r.hora;
        const etiqueta = est === 'confirmada' ? 'Confirmada' : (est === 'cancelada' ? 'Cancelada' : 'Pendiente');
        item.innerHTML =
          '<span class="p-badge ' + est + '">' + etiqueta + '</span>' +
          '<b>' + r.hora + '</b>' +
          '<span>' + (r.servicio || 'Hora en agenda') + (r.nombre ? ' · ' + r.nombre : '') + '</span>' +
          '<div class="p-actions">' +
          '<button class="p-wa" data-act="wa" type="button">WhatsApp</button>' +
          (est === 'cancelada'
            ? '<button class="p-ok" data-act="confirmar" type="button">Reactivar</button>'
            : '<button class="p-ok" data-act="confirmar" type="button">Confirmar</button><button class="p-no" data-act="cancelar" type="button">Liberar</button>') +
          '</div>';
        panelList.appendChild(item);
      });
    } catch (e) { panelList.innerHTML = '<p class="p-empty">Sin conexión con la base.</p>'; }
  }

  panelList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const rowEl = btn.closest('.p-item');
    if (!rowEl || !supa) return;
    const act = btn.dataset.act;
    if (act === 'wa') {
      const msg = 'Hola, sobre tu cita del ' + fmtDay(rowEl._fecha) + ' a las ' + rowEl._hora + ':';
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      return;
    }
    const estado = act === 'confirmar' ? 'confirmada' : 'cancelada';
    try {
      const { error } = await supa.from('reservas').update({ estado }).eq('id', rowEl._id);
      if (error) { toast('No se pudo actualizar — inténtalo otra vez.'); return; }
      toast(act === 'confirmar' ? 'Cita confirmada ✓' : 'Cita liberada — el horario vuelve a estar disponible');
      cargarPanel();
      renderSlots();
    } catch (err) { toast('Sin conexión con la base.'); }
  });

  window.__sucursalReady = true;
})();