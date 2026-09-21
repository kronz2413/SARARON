/* =====================================================================
   SARARON Centro de Servicios · LUXURA Auto Import
   LÓGICA DE LA APLICACIÓN — conectada a Supabase
   ---------------------------------------------------------------------
   ÍNDICE
     1.  CLIENTE SUPABASE
     2.  CAPA DE DATOS (DB) ....... todas las consultas a la base
     3.  MARCA / NAVEGACIÓN ....... conmutador taller ↔ dealer
     4.  AUTENTICACIÓN ............ registro, login, sesión
     5.  CATÁLOGO ................. filtros, rejilla, ficha
     6.  ADMIN: VEHÍCULOS ......... formulario, fotos, videos, Storage
     7.  MANTENIMIENTO ............ registro y avisos de 15 días
     8.  PANEL ..................... cliente y administrador
     9.  CONTACTO / PDF / UTILIDADES
     10. ARRANQUE
   ===================================================================== */


/* =====================================================================
   1. CLIENTE SUPABASE
   ===================================================================== */
let sb = null;
let SB_OK = false;

function initSupabase() {
  const urlOk = CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('AQUI-SU');
  const keyOk = CONFIG.SUPABASE_KEY && !CONFIG.SUPABASE_KEY.includes('AQUI-SU');

  if (!urlOk || !keyOk) {
    SB_OK = false;
    return false;
  }
  sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  SB_OK = true;
  return true;
}

/* Aviso grande y claro si el sitio se abre sin configurar */
function showConfigWarning() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position:fixed; inset:auto 0 0 0; z-index:5000;
    background:#7a1320; color:#fff; padding:1rem 1.4rem;
    font-family:system-ui,sans-serif; font-size:.88rem; line-height:1.6;
    box-shadow:0 -6px 24px rgba(0,0,0,.5);`;
  bar.innerHTML = `<strong>⚠ Falta conectar la base de datos.</strong>
    Abra el archivo <code>config.js</code> y coloque su <code>SUPABASE_URL</code>
    y su <code>SUPABASE_KEY</code>. Mientras tanto el catálogo, el inicio de
    sesión y el panel no funcionarán.`;
  document.body.appendChild(bar);
}


/* =====================================================================
   2. CAPA DE DATOS
   ---------------------------------------------------------------------
   Todo lo que toca la base pasa por aquí. Si algún día cambia de
   proveedor, sólo se reescribe esta sección.
   ===================================================================== */
const DB = {

  /* ---------- Vehículos del catálogo ---------- */
  async getVehicles() {
    const { data, error } = await sb
      .from('dealer_vehicles').select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async getVehicle(id) {
    const { data, error } = await sb
      .from('dealer_vehicles').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  async insertVehicle(v) {
    const { data, error } = await sb
      .from('dealer_vehicles').insert(v).select().single();
    return { data, error };
  },

  async updateVehicle(id, v) {
    const { data, error } = await sb
      .from('dealer_vehicles').update(v).eq('id', id).select().single();
    return { data, error };
  },

  async deleteVehicle(id) {
    const { error } = await sb.from('dealer_vehicles').delete().eq('id', id);
    return { error };
  },

  /* ---------- Perfiles ---------- */
  async getProfile(id) {
    const { data, error } = await sb
      .from('profiles').select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  },

  async getClients() {
    const { data, error } = await sb
      .from('profiles').select('*').eq('role', 'cliente')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async updateProfile(id, patch) {
    const { error } = await sb.from('profiles').update(patch).eq('id', id);
    return { error };
  },

  /* ---------- Vehículos del cliente ---------- */
  async getClientVehicles(ownerId) {
    let q = sb.from('client_vehicles').select('*');
    if (ownerId) q = q.eq('owner_id', ownerId);
    const { data, error } = await q;
    if (error) { console.error(error); return []; }
    return data || [];
  },

  /* ---------- Mantenimientos ---------- */
  async getMaint(userId) {
    let q = sb.from('maintenance').select('*')
              .order('service_date', { ascending: false });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async insertMaint(m) {
    const { data, error } = await sb.from('maintenance').insert(m).select().single();
    return { data, error };
  },

  async completeMaint(id) {
    const { error } = await sb.from('maintenance').update({ done: true }).eq('id', id);
    return { error };
  },

  /* ---------- Solicitudes de cita ---------- */
  async getRequests() {
    const { data, error } = await sb
      .from('appointment_requests').select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async insertRequest(r) {
    const { error } = await sb.from('appointment_requests').insert(r);
    return { error };
  },

  async markRequestDone(id) {
    const { error } = await sb
      .from('appointment_requests').update({ status: 'atendida' }).eq('id', id);
    return { error };
  },

  /* ---------- Notificaciones ---------- */
  async getNotis(userId) {
    const { data, error } = await sb
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async markNotisRead(userId) {
    const { error } = await sb.from('notifications')
      .update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    return { error };
  },

  /* ---------- Ajustes (tasa de cambio) ---------- */
  async getSetting(key) {
    const { data, error } = await sb
      .from('settings').select('value').eq('key', key).single();
    if (error) return null;
    return data ? data.value : null;
  },

  async setSetting(key, value) {
    const { error } = await sb.from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return { error };
  },

  /* ---------- Storage: fotos y videos ---------- */
  async uploadMedia(file, prefix = 'veh') {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await sb.storage
      .from('vehicle-media')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) { console.error(error); return { url: null, error }; }

    const { data } = sb.storage.from('vehicle-media').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  }
};


/* =====================================================================
   3. MARCA Y NAVEGACIÓN
   ===================================================================== */
let BRAND = 'taller';

function setBrand(b) {
  BRAND = b;
  document.documentElement.setAttribute('data-brand', b);

  const esTaller = b === 'taller';
  document.getElementById('view-taller').classList.toggle('hide', !esTaller);
  document.getElementById('view-dealer').classList.toggle('hide',  esTaller);
  document.getElementById('nav-links-taller').classList.toggle('hide', !esTaller);
  document.getElementById('nav-links-dealer').classList.toggle('hide',  esTaller);
  document.getElementById('sw-taller').classList.toggle('on',  esTaller);
  document.getElementById('sw-dealer').classList.toggle('on', !esTaller);
  document.getElementById('nav-logo-img').src =
    esTaller ? 'img/logo-sararon.jpg' : 'img/logo-luxura.jpg';

  buildMobileMenu();
  if (!esTaller) renderCatalog();
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(observeReveals, 60);
}

function toggleMenu() { document.getElementById('mobile-menu').classList.toggle('open'); }

function buildMobileMenu() {
  const links = BRAND === 'taller'
    ? [['#servicios','Servicios'],['#domicilio','A Domicilio'],['#citas','Citas'],
       ['#pagos','Pagos'],['#contacto','Contacto'],['@dealer','Ver Dealer →']]
    : [['#catalogo','Catálogo'],['#importacion','Importación'],
       ['#dealer-ubicacion','Ubicación'],['#contacto','Contacto'],['@taller','← Ver Taller']];
  document.getElementById('mm-links').innerHTML = links.map(([h, t]) =>
    h.startsWith('@')
      ? `<a href="#" onclick="setBrand('${h.slice(1)}');toggleMenu();return false">${t}</a>`
      : `<a href="${h}">${t}</a>`
  ).join('');
}

window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('solid', window.scrollY > 40);
});


/* =====================================================================
   4. AUTENTICACIÓN  (Supabase Auth)
   ===================================================================== */
let SESSION = null;   // perfil del usuario conectado

function openAuth(mode) { switchAuth(mode); openModal('modal-auth'); }

function switchAuth(mode) {
  const esLogin = mode === 'login';
  document.getElementById('tab-login').classList.toggle('on',  esLogin);
  document.getElementById('tab-register').classList.toggle('on', !esLogin);
  document.getElementById('form-login').classList.toggle('hide',   !esLogin);
  document.getElementById('form-register').classList.toggle('hide', esLogin);
  document.getElementById('auth-title').textContent = esLogin ? 'Iniciar Sesión' : 'Crear Cuenta';
  document.getElementById('auth-msg').innerHTML = '';
}

async function doRegister() {
  if (!SB_OK) return msg('auth-msg', 'err', 'La base de datos no está configurada.');

  const name  = val('rg-name'), phone = val('rg-phone');
  const mail  = val('rg-mail').toLowerCase();
  const p1    = val('rg-pass'), p2 = val('rg-pass2');

  if (!name || !phone || !mail)     return msg('auth-msg','err','Complete nombre, teléfono y correo.');
  if (!/^\S+@\S+\.\S+$/.test(mail)) return msg('auth-msg','err','El correo no tiene un formato válido.');
  if (p1.length < 6)                return msg('auth-msg','err','La contraseña debe tener al menos 6 caracteres.');
  if (p1 !== p2)                    return msg('auth-msg','err','Las contraseñas no coinciden.');

  msg('auth-msg', 'info', 'Creando su cuenta...');

  // El rol SIEMPRE es 'cliente'. Lo asigna el trigger de la base de datos,
  // nunca el formulario — así nadie puede registrarse como administrador.
  const { data, error } = await sb.auth.signUp({
    email: mail,
    password: p1,
    options: {
      data: {
        name,
        phone,
        client_type: val('rg-type'),
        vehicle: val('rg-veh'),
        plate:   val('rg-plate').toUpperCase()
      }
    }
  });

  if (error) {
    const t = error.message || '';
    if (t.includes('already registered') || t.includes('already been'))
      return msg('auth-msg','err','Ya existe una cuenta con ese correo.');
    return msg('auth-msg','err','No se pudo crear la cuenta: ' + t);
  }

  // Si el proyecto exige confirmar el correo, no hay sesión todavía
  if (!data.session) {
    return msg('auth-msg','ok',
      'Cuenta creada. Revise su correo y confirme la dirección para poder entrar.');
  }

  msg('auth-msg','ok','Cuenta creada correctamente.');
  setTimeout(async () => { closeModal('modal-auth'); await loadSession(); openPanel(); }, 700);
}

async function doLogin() {
  if (!SB_OK) return msg('auth-msg', 'err', 'La base de datos no está configurada.');

  const mail = val('li-user').toLowerCase(), pw = val('li-pass');
  if (!mail || !pw) return msg('auth-msg','err','Ingrese su correo y su contraseña.');

  msg('auth-msg','info','Verificando...');
  const { error } = await sb.auth.signInWithPassword({ email: mail, password: pw });

  if (error) {
    const t = error.message || '';
    if (t.includes('Invalid login'))
      return msg('auth-msg','err','Correo o contraseña incorrectos.');
    if (t.includes('Email not confirmed'))
      return msg('auth-msg','err','Debe confirmar su correo antes de entrar.');
    return msg('auth-msg','err','No se pudo iniciar sesión: ' + t);
  }

  await loadSession();
  msg('auth-msg','ok','Bienvenido, ' + (SESSION?.name || '').split(' ')[0] + '.');
  setTimeout(() => { closeModal('modal-auth'); openPanel(); }, 500);
}

async function loadSession() {
  if (!SB_OK) { SESSION = null; renderNavAuth(); return; }
  const { data: { user } } = await sb.auth.getUser();
  SESSION = user ? await DB.getProfile(user.id) : null;
  renderNavAuth();
  if (SESSION) refreshBadge();
}

async function doLogout() {
  await sb.auth.signOut();
  SESSION = null;
  closePanel();
  renderNavAuth();
  renderCatalog();
  toast('Sesión cerrada', 'Hasta pronto.');
}

function renderNavAuth() {
  const box = document.getElementById('nav-auth');
  if (SESSION) {
    const ini = SESSION.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    box.innerHTML = `<button class="avatar" onclick="openPanel()" title="${esc(SESSION.name)}"
                       style="width:38px;height:38px;font-size:.85rem;border:none">${esc(ini)}</button>`;
  } else {
    box.innerHTML = `<button class="btn btn-line btn-sm" onclick="openAuth('login')">Iniciar Sesión</button>`;
  }
  const qa = document.getElementById('btn-quick-add');
  if (qa) qa.classList.toggle('hide', !isAdmin());
}

const isAdmin = () => !!SESSION && SESSION.role === 'admin';


/* =====================================================================
   5. CATÁLOGO DE VEHÍCULOS
   ===================================================================== */
let FILTRO_TIPO = 'todos';
let VEH_CACHE   = {};
let CARD_IDX    = {};
let TASA_USD    = 61;     // se lee de la base al arrancar

/* --------- Formato de precios en dos monedas --------- */
function precioPrincipal(v) {
  if (v.price && v.price > 0)          return 'US$' + fmtNum(v.price);
  if (v.price_dop && v.price_dop > 0)  return 'RD$' + fmtNum(v.price_dop);
  return 'Consultar';
}
function precioSecundario(v) {
  // Sólo si ambos están cargados, se muestra el segundo debajo
  if (v.price > 0 && v.price_dop > 0)  return 'RD$' + fmtNum(v.price_dop);
  return '';
}

async function renderTypeFilters() {
  const veh  = await DB.getVehicles();
  const cont = document.getElementById('type-filters');
  const cuenta = t => veh.filter(v => v.type === t).length;

  let html = `<button class="type-chip ${FILTRO_TIPO === 'todos' ? 'on' : ''}"
                onclick="setType('todos')">Todos <span class="cnt">${veh.length}</span></button>`;

  CONFIG.tiposVehiculo.forEach(t => {
    const n = cuenta(t.id);
    if (n === 0 && !isAdmin()) return;   // los tipos vacíos sólo los ve el admin
    html += `<button class="type-chip ${FILTRO_TIPO === t.id ? 'on' : ''}"
               onclick="setType('${t.id}')">${t.icon} ${t.label}
               <span class="cnt">${n}</span></button>`;
  });
  cont.innerHTML = html;
}

function setType(t) { FILTRO_TIPO = t; renderCatalog(); }

async function renderCatalog() {
  const grid = document.getElementById('veh-grid');
  if (!SB_OK) {
    grid.innerHTML = `<div class="empty-state"><div class="i">🔌</div>
      <p>El catálogo se activa al conectar la base de datos.</p></div>`;
    return;
  }

  await renderTypeFilters();

  let veh    = await DB.getVehicles();
  const q    = (document.getElementById('cat-search')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('cat-sort')?.value || 'recent';

  if (FILTRO_TIPO !== 'todos') veh = veh.filter(v => v.type === FILTRO_TIPO);
  if (q) veh = veh.filter(v =>
    (`${v.make} ${v.model} ${v.year} ${v.color || ''} ${v.tag || ''}`).toLowerCase().includes(q));

  const ord = {
    'recent':     (a, b) => new Date(b.created_at) - new Date(a.created_at),
    'price-asc':  (a, b) => (a.price || 1e12) - (b.price || 1e12),
    'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
    'year-desc':  (a, b) => (b.year || 0) - (a.year || 0),
    'km-asc':     (a, b) => (a.km || 1e12) - (b.km || 1e12)
  };
  veh.sort(ord[sort]);

  if (veh.length === 0) {
    grid.innerHTML = `<div class="empty-state">
        <div class="i">🔍</div>
        <p>No hay vehículos que coincidan con la búsqueda.</p>
        ${isAdmin() ? '<button class="btn btn-line btn-sm" style="margin-top:1rem" onclick="openVehicleForm()">+ Agregar vehículo</button>' : ''}
      </div>`;
    return;
  }

  veh.forEach(v => VEH_CACHE[v.id] = v);

  grid.innerHTML = veh.map((v, i) => {
    const tipo    = CONFIG.tiposVehiculo.find(t => t.id === v.type);
    const fotos   = v.photos || [];
    const idx     = CARD_IDX[v.id] || 0;
    const foto    = fotos[idx] || fotos[0];
    const vendido = v.status === 'vendido';
    const sec     = precioSecundario(v);

    return `
      <div class="veh-card" style="animation-delay:${i * 0.06}s" onclick="openVehicle('${v.id}')">
        <div class="veh-media">
          ${foto
            ? `<img id="veh-img-${v.id}" src="${esc(foto)}" alt="${esc(v.make)} ${esc(v.model)}" loading="lazy">`
            : `<div class="ph"><div class="i">${tipo ? tipo.icon : '🚗'}</div><div class="l">Sin fotos aún</div></div>`}

          ${fotos.length > 1 ? `
            <button class="cnav prev" onclick="cardStep('${v.id}',-1,event)" aria-label="Foto anterior">‹</button>
            <button class="cnav next" onclick="cardStep('${v.id}',1,event)"  aria-label="Foto siguiente">›</button>
            <div class="veh-dots" id="veh-dots-${v.id}">
              ${fotos.map((_, d) => `<span class="vdot ${d === idx ? 'on' : ''}"
                 onclick="cardGoTo('${v.id}',${d},event)"></span>`).join('')}
            </div>` : ''}

          <div class="veh-badges">
            ${v.tag ? `<span class="vbadge accent">${esc(v.tag)}</span>` : ''}
            ${vendido ? `<span class="vbadge sold">Vendido</span>` : ''}
            ${v.status === 'reservado' ? `<span class="vbadge">Reservado</span>` : ''}
            ${v.status === 'transito'  ? `<span class="vbadge">En tránsito</span>` : ''}
            ${v.condition ? `<span class="vbadge">${esc(v.condition)}</span>` : ''}
          </div>
          <div class="veh-count">
            <span>📷 ${fotos.length}</span>
            ${(v.videos || []).length ? `<span>🎬 ${v.videos.length}</span>` : ''}
          </div>
        </div>
        <div class="veh-body">
          <div class="veh-type">${tipo ? tipo.label : esc(v.type)}</div>
          <div class="veh-name">${esc(v.make)} ${esc(v.model)}</div>
          <div class="veh-year">${v.year || ''}${v.color ? ' · ' + esc(v.color) : ''}</div>
          <div class="veh-specs">
            ${v.km ? `<span>🛣️ ${fmtNum(v.km)} km</span>` : ''}
            ${v.transmission ? `<span>⚙️ ${esc(v.transmission)}</span>` : ''}
            ${v.fuel ? `<span>⛽ ${esc(v.fuel)}</span>` : ''}
          </div>
          <div class="veh-foot">
            <span class="veh-price">${precioPrincipal(v)}
              ${sec ? `<span class="price-alt">${sec}</span>` : ''}</span>
            <span class="veh-more">Ver ficha →</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* --------- Cambio de foto dentro de la tarjeta --------- */
function cardStep(id, dir, ev) {
  ev.stopPropagation();
  const v = VEH_CACHE[id];
  if (!v || !v.photos || v.photos.length < 2) return;
  CARD_IDX[id] = ((CARD_IDX[id] || 0) + dir + v.photos.length) % v.photos.length;
  updateCardMedia(id);
}
function cardGoTo(id, i, ev) { ev.stopPropagation(); CARD_IDX[id] = i; updateCardMedia(id); }
function updateCardMedia(id) {
  const v = VEH_CACHE[id]; if (!v) return;
  const idx = CARD_IDX[id] || 0;
  const img = document.getElementById('veh-img-' + id);
  if (img) img.src = v.photos[idx];
  document.querySelectorAll(`#veh-dots-${id} .vdot`)
    .forEach((d, i) => d.classList.toggle('on', i === idx));
}

/* --------- Ficha detallada --------- */
let VD = { media: [], idx: 0 };

async function openVehicle(id) {
  const v = VEH_CACHE[id] || await DB.getVehicle(id);
  if (!v) return;
  VEH_CACHE[id] = v;

  const tipo = CONFIG.tiposVehiculo.find(t => t.id === v.type);
  document.getElementById('vd-title').textContent = `${v.make} ${v.model}`;
  document.getElementById('vd-sub').textContent =
    `${v.year || ''} · ${tipo ? tipo.label : v.type}${v.condition ? ' · ' + v.condition : ''}`;

  VD.media = [
    ...(v.photos || []).map(src => ({ kind: 'img', src })),
    ...(v.videos || []).map(x    => ({ kind: 'video', ...x }))
  ];
  VD.idx = 0;
  renderVdMedia();

  const especificaciones = [
    ['Año', v.year], ['Tipo', tipo ? tipo.label : v.type],
    ['Kilometraje', v.km ? fmtNum(v.km) + ' km' : null],
    ['Transmisión', v.transmission], ['Combustible', v.fuel], ['Motor', v.engine],
    ['Tracción', v.drive], ['Color', v.color], ['Condición', v.condition],
    ['Estado', ({ disponible:'Disponible', reservado:'Reservado',
                  transito:'En tránsito', vendido:'Vendido' })[v.status]]
  ].filter(([, val]) => val);

  const waMsg = encodeURIComponent(
    `Hola, estoy interesado en el ${v.make} ${v.model} ${v.year || ''} del catálogo de LUXURA Auto Import.`);

  const tieneAmbos = v.price > 0 && v.price_dop > 0;

  document.getElementById('vd-info').innerHTML = `
    <div class="vd-price-row">
      <div>
        <div style="font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--txt-faint);margin-bottom:.3rem">Precio</div>
        <div class="vd-price">${precioPrincipal(v)}</div>
        ${tieneAmbos ? `<div class="vd-price-alt">RD$${fmtNum(v.price_dop)}</div>` : ''}
      </div>
      <div style="display:flex;gap:.7rem;flex-wrap:wrap">
        <a class="btn btn-wa" href="https://wa.me/${CONFIG.whatsapp}?text=${waMsg}"
           target="_blank" rel="noopener">${ICON_WA} Consultar</a>
        ${isAdmin() ? `<button class="btn btn-line"
           onclick="closeModal('modal-vehicle');openVehicleForm('${v.id}')">✏️ Editar</button>` : ''}
      </div>
    </div>

    <div class="spec-grid">
      ${especificaciones.map(([k, val]) =>
        `<div class="spec-cell"><div class="k">${k}</div><div class="v">${esc(String(val))}</div></div>`).join('')}
    </div>

    ${v.description ? `
      <h4 class="display" style="font-size:.78rem;letter-spacing:.2em;color:var(--txt-dim);margin-bottom:.7rem">Descripción</h4>
      <div class="desc-block">${formatDesc(v.description)}</div>` : ''}

    <div class="form-msg info" style="margin-top:1.6rem">
      🔍 Todos nuestros vehículos pasan por inspección con cámara térmica en SARARON:
      verificamos que no haya filtraciones en motor, transmisión ni radiador antes de la entrega.
    </div>`;

  openModal('modal-vehicle');
}

function renderVdMedia() {
  const g = document.getElementById('vd-gallery');
  const s = document.getElementById('vd-strip');

  if (VD.media.length === 0) {
    g.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:var(--txt-faint)">
        <div style="font-size:3rem;opacity:.3">🚗</div>
        <div style="font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;margin-top:.5rem">Sin fotos ni videos</div>
      </div>`;
    s.innerHTML = ''; s.style.display = 'none';
    return;
  }
  s.style.display = VD.media.length > 1 ? 'flex' : 'none';

  const m = VD.media[VD.idx];
  let inner;
  if (m.kind === 'img')          inner = `<img src="${esc(m.src)}" alt="">`;
  else if (m.type === 'youtube') inner = `<iframe src="https://www.youtube.com/embed/${esc(m.src)}"
      allowfullscreen allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture"></iframe>`;
  else                           inner = `<video src="${esc(m.src)}" controls playsinline></video>`;

  const nav = VD.media.length > 1
    ? `<button class="vd-nav prev" onclick="vdStep(-1)">‹</button>
       <button class="vd-nav next" onclick="vdStep(1)">›</button>` : '';
  g.innerHTML = inner + nav;

  s.innerHTML = VD.media.map((x, i) => `
    <div class="vd-thumb ${i === VD.idx ? 'on' : ''}" onclick="VD.idx=${i};renderVdMedia()">
      ${x.kind === 'img'
        ? `<img src="${esc(x.src)}" alt="">`
        : `<div class="vico" style="background:var(--bg-2)">🎬</div>`}
    </div>`).join('');
}
function vdStep(d) { VD.idx = (VD.idx + d + VD.media.length) % VD.media.length; renderVdMedia(); }


/* =====================================================================
   6. ADMIN — ALTA Y EDICIÓN DE VEHÍCULOS
   ---------------------------------------------------------------------
   Las fotos y videos se suben a Supabase Storage (bucket vehicle-media)
   y en la base se guarda solamente la URL pública.
   ===================================================================== */
let VF = { photos: [], videos: [], editId: null, subiendo: 0 };

async function openVehicleForm(id = null) {
  if (!isAdmin()) { toast('Acceso restringido', 'Sólo el administrador puede agregar vehículos.'); return; }

  document.getElementById('vf-type').innerHTML =
    CONFIG.tiposVehiculo.map(t => `<option value="${t.id}">${t.icon} ${t.label}</option>`).join('');

  VF = { photos: [], videos: [], editId: id, subiendo: 0 };
  ['vf-make','vf-model','vf-year','vf-price','vf-price-dop','vf-km','vf-color',
   'vf-engine','vf-tag','vf-desc','vf-video-url'].forEach(k => setVal(k, ''));
  document.getElementById('vf-msg').innerHTML = '';
  document.getElementById('vf-tasa').textContent = fmtNum(TASA_USD);

  if (id) {
    const v = VEH_CACHE[id] || await DB.getVehicle(id);
    if (v) {
      setVal('vf-make', v.make);           setVal('vf-model', v.model);
      setVal('vf-year', v.year);           setVal('vf-type', v.type);
      setVal('vf-price', v.price || '');   setVal('vf-price-dop', v.price_dop || '');
      setVal('vf-km', v.km);               setVal('vf-trans', v.transmission);
      setVal('vf-fuel', v.fuel);           setVal('vf-color', v.color);
      setVal('vf-engine', v.engine);       setVal('vf-drive', v.drive);
      setVal('vf-status', v.status);       setVal('vf-cond', v.condition);
      setVal('vf-tag', v.tag);             setVal('vf-desc', v.description);
      VF.photos = [...(v.photos || [])];
      VF.videos = [...(v.videos || [])];
    }
    document.getElementById('vf-title').textContent = 'Editar Vehículo';
    document.getElementById('vf-delete').classList.remove('hide');
  } else {
    document.getElementById('vf-title').textContent = 'Agregar Vehículo';
    document.getElementById('vf-delete').classList.add('hide');
  }
  renderVfMedia();
  openModal('modal-vform');
}

/* Convertir dólares ⇄ pesos con la tasa guardada */
function convertirUsdADop() {
  const usd = parseFloat(val('vf-price'));
  if (!usd) return msg('vf-msg', 'err', 'Escriba primero el precio en dólares.');
  setVal('vf-price-dop', Math.round(usd * TASA_USD));
  msg('vf-msg', 'ok', `Convertido con la tasa RD$${fmtNum(TASA_USD)} por US$1.`);
}
function convertirDopAUsd() {
  const dop = parseFloat(val('vf-price-dop'));
  if (!dop) return msg('vf-msg', 'err', 'Escriba primero el precio en pesos.');
  setVal('vf-price', Math.round(dop / TASA_USD));
  msg('vf-msg', 'ok', `Convertido con la tasa RD$${fmtNum(TASA_USD)} por US$1.`);
}

async function editarTasa() {
  const nueva = prompt('Tasa de cambio — ¿cuántos pesos vale 1 dólar?', TASA_USD);
  if (nueva === null) return;
  const n = parseFloat(nueva);
  if (!n || n <= 0) return toast('Tasa inválida', 'Escriba un número mayor que cero.');

  const { error } = await DB.setSetting('usd_to_dop', String(n));
  if (error) return toast('No se pudo guardar', error.message);
  TASA_USD = n;
  const el = document.getElementById('vf-tasa');
  if (el) el.textContent = fmtNum(n);
  toast('Tasa actualizada', `Ahora US$1 = RD$${fmtNum(n)}.`);
}

/* --------- Subida de fotos a Storage --------- */
async function handlePhotoFiles(files) {
  const lista = [...files].filter(f => f.type.startsWith('image/'));
  if (!lista.length) return;

  VF.subiendo += lista.length;
  renderVfMedia();

  for (const f of lista) {
    try {
      const comprimido = await comprimirImagen(f, 1600, 0.82);
      const { url, error } = await DB.uploadMedia(comprimido, 'fotos');
      if (error) { msg('vf-msg', 'err', 'No se pudo subir una foto: ' + error.message); }
      else       { VF.photos.push(url); }
    } catch (e) {
      msg('vf-msg', 'err', 'Error al procesar una foto.');
    }
    VF.subiendo--;
    renderVfMedia();
  }
}

/* Reduce el peso de la foto antes de subirla */
function comprimirImagen(file, maxW, calidad) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(blob => {
          if (!blob) return reject(new Error('canvas'));
          resolve(new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg',
                           { type: 'image/jpeg' }));
        }, 'image/jpeg', calidad);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}

async function handleVideoFile(f) {
  if (!f) return;
  if (f.size > 50 * 1024 * 1024)
    return msg('vf-msg', 'err', 'El video supera los 50 MB. Use un enlace de YouTube para videos largos.');

  VF.subiendo++;
  renderVfMedia();
  const { url, error } = await DB.uploadMedia(f, 'videos');
  VF.subiendo--;
  if (error) msg('vf-msg', 'err', 'No se pudo subir el video: ' + error.message);
  else       VF.videos.push({ type: 'file', src: url });
  renderVfMedia();
}

/* Agregar una foto por URL externa (sin subirla a Storage) */
function addPhotoUrl() {
  const u = val('vf-img-url');
  if (!u) return;
  VF.photos.push(u);
  setVal('vf-img-url', '');
  renderVfMedia();
}

function addVideoUrl() {
  const u = val('vf-video-url');
  if (!u) return;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  VF.videos.push(yt ? { type: 'youtube', src: yt[1] } : { type: 'file', src: u });
  setVal('vf-video-url', '');
  renderVfMedia();
}

function renderVfMedia() {
  const cargando = VF.subiendo > 0
    ? `<div class="thumb thumb-loading"><span class="spin"></span></div>`.repeat(VF.subiendo) : '';

  document.getElementById('vf-thumbs').innerHTML = VF.photos.map((p, i) => `
    <div class="thumb ${i === 0 ? 'cover-mark' : ''}">
      <img src="${esc(p)}" alt="">
      <button class="rm" onclick="VF.photos.splice(${i},1);renderVfMedia()">✕</button>
    </div>`).join('') + cargando;

  document.getElementById('vf-videos').innerHTML = VF.videos.map((v, i) => `
    <div class="thumb" style="display:flex;align-items:center;justify-content:center;
         background:var(--bg-3);font-size:1.3rem">
      ${v.type === 'youtube' ? '▶️' : '🎬'}
      <button class="rm" onclick="VF.videos.splice(${i},1);renderVfMedia()">✕</button>
    </div>`).join('');
}

async function saveVehicle() {
  const make = val('vf-make'), model = val('vf-model'), year = parseInt(val('vf-year'));
  if (!make || !model || !year) return msg('vf-msg', 'err', 'Marca, modelo y año son obligatorios.');
  if (VF.subiendo > 0)          return msg('vf-msg', 'err', 'Espere a que terminen de subir las fotos.');

  const datos = {
    make, model, year, type: val('vf-type'),
    price:        parseFloat(val('vf-price'))     || 0,
    price_dop:    parseFloat(val('vf-price-dop')) || 0,
    km:           parseInt(val('vf-km')) || 0,
    transmission: val('vf-trans'), fuel: val('vf-fuel'), color: val('vf-color'),
    engine:       val('vf-engine'), drive: val('vf-drive'), status: val('vf-status'),
    condition:    val('vf-cond'),  tag:   val('vf-tag'),  description: val('vf-desc'),
    photos: [...VF.photos], videos: [...VF.videos]
  };

  msg('vf-msg', 'info', 'Guardando...');
  const { error } = VF.editId
    ? await DB.updateVehicle(VF.editId, datos)
    : await DB.insertVehicle(datos);

  if (error) return msg('vf-msg', 'err', 'No se pudo guardar: ' + error.message);

  closeModal('modal-vform');
  toast(VF.editId ? 'Vehículo actualizado' : 'Vehículo publicado',
        `${make} ${model} ${year} ya está en el catálogo.`);
  VEH_CACHE = {};
  renderCatalog();
  if (document.getElementById('panel').classList.contains('open')) renderPanel();
}

async function deleteVehicleFromForm() {
  if (!VF.editId) return;
  if (!confirm('¿Eliminar este vehículo del catálogo? Esta acción no se puede deshacer.')) return;

  const { error } = await DB.deleteVehicle(VF.editId);
  if (error) return msg('vf-msg', 'err', 'No se pudo eliminar: ' + error.message);

  closeModal('modal-vform');
  toast('Vehículo eliminado', 'La ficha fue retirada del catálogo.');
  VEH_CACHE = {};
  renderCatalog();
  if (document.getElementById('panel').classList.contains('open')) renderPanel();
}


/* =====================================================================
   7. MANTENIMIENTO
   ---------------------------------------------------------------------
   La fecha de revisión (15 días) y las notificaciones las calcula la
   propia base de datos mediante triggers. Aquí sólo se registra.
   ===================================================================== */
async function openMaintForm() {
  if (!isAdmin()) return;

  const clientes = await DB.getClients();
  document.getElementById('mt-client').innerHTML = clientes.length
    ? clientes.map(u => `<option value="${u.id}">${esc(u.name)} — ${esc(u.phone || 'sin teléfono')}</option>`).join('')
    : '<option value="">No hay clientes registrados</option>';

  document.getElementById('mt-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('mt-followup').value = CONFIG.diasSeguimiento;
  document.getElementById('mt-msg').innerHTML = '';
  openModal('modal-maint');
}

async function saveMaintenance() {
  const userId = val('mt-client'), service = val('mt-service'), fecha = val('mt-date');
  if (!userId) return msg('mt-msg', 'err', 'Seleccione un cliente.');
  if (!fecha)  return msg('mt-msg', 'err', 'Indique la fecha del servicio.');

  const dias = parseInt(val('mt-followup')) || CONFIG.diasSeguimiento;

  msg('mt-msg', 'info', 'Guardando...');
  const { error } = await DB.insertMaint({
    user_id:       userId,
    service,
    service_date:  new Date(fecha + 'T09:00:00').toISOString(),
    km:            parseInt(val('mt-km')) || null,
    mode:          val('mt-mode'),
    cost:          parseFloat(val('mt-cost')) || 0,
    notes:         val('mt-notes'),
    followup_days: dias
  });

  if (error) return msg('mt-msg', 'err', 'No se pudo guardar: ' + error.message);

  closeModal('modal-maint');
  toast('Mantenimiento registrado', `Revisión de seguimiento programada en ${dias} días.`);
  renderPanel();
}

/* Estado de una revisión respecto a su fecha */
function followupState(m) {
  const restantes = Math.ceil((new Date(m.followup_date) - Date.now()) / 86400000);
  if (m.done)         return { cls:'ok',   tag:'green', label:'Completada' };
  if (restantes < 0)  return { cls:'due',  tag:'red',   label:`Vencida hace ${-restantes} d` };
  if (restantes <= 3) return { cls:'soon', tag:'amber', label:`En ${restantes} d` };
  return                     { cls:'ok',   tag:'',      label:`En ${restantes} d` };
}

async function completeFollowup(id) {
  const { error } = await DB.completeMaint(id);
  if (error) return toast('No se pudo actualizar', error.message);
  toast('Revisión completada', 'El seguimiento quedó cerrado.');
  renderPanel();
}

async function refreshBadge() {
  if (!SESSION) return;
  const n = (await DB.getNotis(SESSION.id)).filter(x => !x.is_read).length;
  const b = document.getElementById('pn-badge');
  if (b) { b.textContent = n; b.classList.toggle('hide', n === 0); }
}


/* =====================================================================
   8. PANEL DE USUARIO
   ===================================================================== */
let PANEL_TAB = null;

function openPanel() {
  if (!SESSION) return openAuth('login');
  document.getElementById('panel').classList.add('open');
  document.body.style.overflow = 'hidden';

  const ini = SESSION.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('pn-avatar').textContent = ini;
  document.getElementById('pn-name').textContent   = SESSION.name;
  document.getElementById('pn-role').textContent   = isAdmin() ? 'Administrador' : 'Cliente';

  const tabs = isAdmin()
    ? [['resumen','Resumen'],['vehiculos','Vehículos'],['clientes','Clientes'],
       ['mantenimientos','Mantenimientos'],['solicitudes','Solicitudes'],['notis','Notificaciones']]
    : [['resumen','Mi Resumen'],['historial','Mi Historial'],['notis','Notificaciones'],['perfil','Mi Perfil']];

  PANEL_TAB = PANEL_TAB && tabs.some(t => t[0] === PANEL_TAB) ? PANEL_TAB : tabs[0][0];
  document.getElementById('panel-tabs').innerHTML = tabs.map(([k, l]) =>
    `<button class="panel-tab ${k === PANEL_TAB ? 'on' : ''}" data-tab="${k}"
       onclick="switchPanelTab('${k}')">${l}</button>`).join('');

  renderPanel();
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
  document.body.style.overflow = '';
}

function switchPanelTab(k) {
  PANEL_TAB = k;
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
  renderPanel();
}

async function renderPanel() {
  const body = document.getElementById('panel-body');
  if (!SESSION) return;
  body.innerHTML = `<div class="loading-box"><span class="spin"></span> Cargando...</div>`;

  const admin = isAdmin();
  const notis = await DB.getNotis(SESSION.id);
  refreshBadge();

  /* ---------------- RESUMEN ---------------- */
  if (PANEL_TAB === 'resumen') {
    if (admin) {
      const [veh, clientes, maint, reqs] = await Promise.all([
        DB.getVehicles(), DB.getClients(), DB.getMaint(), DB.getRequests()
      ]);
      const vencidos = maint.filter(m => !m.done && new Date(m.followup_date) <= Date.now()).length;

      body.innerHTML = `
        <div class="stat-row">
          <div class="stat-box"><div class="v">${veh.filter(v => v.status === 'disponible').length}</div><div class="k">Vehículos disponibles</div></div>
          <div class="stat-box"><div class="v">${clientes.length}</div><div class="k">Clientes registrados</div></div>
          <div class="stat-box"><div class="v">${maint.length}</div><div class="k">Servicios realizados</div></div>
          <div class="stat-box"><div class="v">${vencidos}</div><div class="k">Revisiones vencidas</div></div>
          <div class="stat-box"><div class="v">${reqs.filter(r => r.status === 'nueva').length}</div><div class="k">Solicitudes nuevas</div></div>
        </div>

        <div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:2.4rem">
          <button class="btn btn-fill" onclick="openVehicleForm()">+ Agregar Vehículo</button>
          <button class="btn btn-line" onclick="openMaintForm()">+ Registrar Mantenimiento</button>
          <button class="btn btn-line" onclick="exportPDF()">🖨️ Exportar PDF</button>
          <button class="btn btn-line" onclick="editarTasa()">💱 Tasa: RD$${fmtNum(TASA_USD)}</button>
          ${veh.length === 0 ? `<button class="btn btn-line" id="btn-import-jeep"
             onclick="importarJeepInicial()">📦 Importar Jeep inicial</button>` : ''}
        </div>

        <h3 class="panel-h3">Revisiones que requieren atención</h3>
        ${renderMaintTable(maint.filter(m => !m.done)
            .sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date)).slice(0, 10),
          true, clientes)}`;
    } else {
      const mios = await DB.getMaint(SESSION.id);
      const pendiente = mios.find(m => !m.done);
      const misVeh = await DB.getClientVehicles(SESSION.id);

      let alerta = `<div class="alert-card alert-ok"><div class="ai">✅</div><div>
          <div class="at">Todo al día</div>
          <div class="ad">No tiene revisiones pendientes en este momento.</div></div></div>`;

      if (pendiente) {
        const st  = followupState(pendiente);
        const ico = st.cls === 'due' ? '🔔' : st.cls === 'soon' ? '⏰' : '📅';
        alerta = `<div class="alert-card alert-${st.cls}"><div class="ai">${ico}</div><div>
            <div class="at">${st.cls === 'due' ? 'Revisión de mantenimiento pendiente' : 'Próxima revisión programada'}</div>
            <div class="ad">Su <strong>${esc(pendiente.service)}</strong> fue el ${fmtDate(pendiente.service_date)}.
              Revisión de seguimiento: <strong>${fmtDate(pendiente.followup_date)}</strong> (${st.label}).<br>
              Agende su cita para mantener la garantía del servicio al día.</div>
            <a class="btn btn-wa btn-sm" style="margin-top:.8rem" target="_blank" rel="noopener"
               href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(
                 'Hola, soy ' + SESSION.name + '. Quiero agendar mi revisión de seguimiento del servicio: ' + pendiente.service)}">
               ${ICON_WA} Agendar mi revisión</a>
          </div></div>`;
      }

      body.innerHTML = `
        ${alerta}
        <div class="stat-row" style="margin-top:2rem">
          <div class="stat-box"><div class="v">${mios.length}</div><div class="k">Servicios realizados</div></div>
          <div class="stat-box"><div class="v">${mios.filter(m => !m.done).length}</div><div class="k">Revisiones pendientes</div></div>
          <div class="stat-box"><div class="v">${mios[0] ? fmtDate(mios[0].service_date) : '—'}</div><div class="k">Último servicio</div></div>
          <div class="stat-box"><div class="v">${notis.filter(n => !n.is_read).length}</div><div class="k">Avisos sin leer</div></div>
        </div>

        <div class="form-msg info" style="margin-bottom:2rem">
          🚗 <strong>Su vehículo:</strong>
          ${misVeh.length
            ? misVeh.map(v => esc(v.make_model) + (v.plate ? ' · ' + esc(v.plate) : '')).join(' | ')
            : 'No registrado'}
        </div>

        <h3 class="panel-h3">Servicios recientes</h3>
        ${renderMaintTable(mios.slice(0, 5), false)}`;
    }
  }

  /* ---------------- ADMIN: VEHÍCULOS ---------------- */
  else if (PANEL_TAB === 'vehiculos') {
    const veh = await DB.getVehicles();
    const estados = { disponible:['green','Disponible'], reservado:['amber','Reservado'],
                      transito:['','En tránsito'], vendido:['red','Vendido'] };
    body.innerHTML = `
      <div class="panel-head-row">
        <h3 class="panel-h3">Inventario · ${veh.length} vehículos</h3>
        <button class="btn btn-fill btn-sm" onclick="openVehicleForm()">+ Agregar Vehículo</button>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Vehículo</th><th>Tipo</th><th>Año</th><th>Precio</th><th>Medios</th><th>Estado</th><th></th></tr></thead>
        <tbody>${veh.length ? veh.map(v => {
          const t = CONFIG.tiposVehiculo.find(x => x.id === v.type);
          const [cls, lbl] = estados[v.status] || ['', '—'];
          return `<tr>
            <td><strong>${esc(v.make)} ${esc(v.model)}</strong>${v.color ? '<br><span class="sub">' + esc(v.color) + '</span>' : ''}</td>
            <td>${t ? t.icon + ' ' + t.label : esc(v.type)}</td>
            <td>${v.year || '—'}</td>
            <td style="white-space:nowrap">${precioPrincipal(v)}
              ${precioSecundario(v) ? '<br><span class="sub">' + precioSecundario(v) + '</span>' : ''}</td>
            <td style="white-space:nowrap">📷 ${(v.photos || []).length} · 🎬 ${(v.videos || []).length}</td>
            <td><span class="tag ${cls}">${lbl}</span></td>
            <td style="white-space:nowrap">
              <button class="btn btn-ghost btn-sm" onclick="openVehicleForm('${v.id}')">Editar</button>
            </td></tr>`;
        }).join('') : '<tr><td colspan="7" class="td-empty">Todavía no hay vehículos. Agregue el primero.</td></tr>'}
        </tbody></table></div>`;
  }

  /* ---------------- ADMIN: CLIENTES ---------------- */
  else if (PANEL_TAB === 'clientes') {
    const [clientes, maint, cv] = await Promise.all([
      DB.getClients(), DB.getMaint(), DB.getClientVehicles()
    ]);
    body.innerHTML = `
      <h3 class="panel-h3" style="margin-bottom:1.4rem">Clientes registrados · ${clientes.length}</h3>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Nombre</th><th>Contacto</th><th>Tipo</th><th>Vehículo</th><th>Servicios</th><th>Próx. revisión</th><th></th></tr></thead>
        <tbody>${clientes.length ? clientes.map(u => {
          const sus  = maint.filter(m => m.user_id === u.id)
                            .sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date));
          const pend = sus.find(m => !m.done);
          const st   = pend ? followupState(pend) : null;
          const veh  = cv.filter(x => x.owner_id === u.id);
          return `<tr>
            <td><strong>${esc(u.name)}</strong></td>
            <td class="sub">${esc(u.email)}<br>${esc(u.phone || '—')}</td>
            <td><span class="tag">${esc(u.client_type || 'Particular')}</span></td>
            <td style="font-size:.82rem">${veh.length ? veh.map(v => esc(v.make_model)).join('<br>') : '—'}</td>
            <td>${sus.length}</td>
            <td>${st ? `<span class="tag ${st.tag}">${st.label}</span>` : '<span class="sub">—</span>'}</td>
            <td><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener"
                 href="https://wa.me/${(u.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + u.name + ', le escribimos de SARARON Centro de Servicios.')}">${ICON_WA}</a></td>
          </tr>`;
        }).join('') : '<tr><td colspan="7" class="td-empty">Aún no hay clientes registrados.</td></tr>'}
        </tbody></table></div>`;
  }

  /* ---------------- ADMIN: MANTENIMIENTOS ---------------- */
  else if (PANEL_TAB === 'mantenimientos') {
    const [maint, clientes] = await Promise.all([DB.getMaint(), DB.getClients()]);
    body.innerHTML = `
      <div class="panel-head-row">
        <h3 class="panel-h3">Historial de servicios · ${maint.length}</h3>
        <button class="btn btn-fill btn-sm" onclick="openMaintForm()">+ Registrar Mantenimiento</button>
      </div>
      ${renderMaintTable(maint, true, clientes)}`;
  }

  /* ---------------- ADMIN: SOLICITUDES ---------------- */
  else if (PANEL_TAB === 'solicitudes') {
    const reqs = await DB.getRequests();
    body.innerHTML = `
      <h3 class="panel-h3" style="margin-bottom:1.4rem">Solicitudes de cita · ${reqs.length}</h3>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Cliente</th><th>Servicio</th><th>Modalidad</th><th>Fecha deseada</th><th>Recibida</th><th>Estado</th><th></th></tr></thead>
        <tbody>${reqs.length ? reqs.map(r => `
          <tr>
            <td><strong>${esc(r.name)}</strong><br><span class="sub">${esc(r.phone)}</span></td>
            <td style="font-size:.84rem">${esc(r.service || '—')}${r.notes ? '<br><span class="sub">' + esc(r.notes.slice(0, 70)) + '</span>' : ''}</td>
            <td><span class="tag">${esc(r.mode || '—')}</span></td>
            <td>${r.preferred_date ? esc(r.preferred_date) : '—'}</td>
            <td class="sub">${fmtDate(r.created_at)}</td>
            <td><span class="tag ${r.status === 'nueva' ? 'amber' : 'green'}">${r.status === 'nueva' ? 'Nueva' : 'Atendida'}</span></td>
            <td style="white-space:nowrap">
              ${r.status === 'nueva' ? `<button class="btn btn-ghost btn-sm" onclick="markRequest('${r.id}')">Marcar atendida</button>` : ''}
              <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener"
                 href="https://wa.me/${r.phone.replace(/\D/g, '')}">${ICON_WA}</a>
            </td></tr>`).join('')
          : '<tr><td colspan="7" class="td-empty">No hay solicitudes todavía.</td></tr>'}
        </tbody></table></div>`;
  }

  /* ---------------- CLIENTE: HISTORIAL ---------------- */
  else if (PANEL_TAB === 'historial') {
    const mios = await DB.getMaint(SESSION.id);
    body.innerHTML = `
      <div class="panel-head-row">
        <h3 class="panel-h3">Historial completo de su vehículo</h3>
        ${mios.length ? '<button class="btn btn-line btn-sm" onclick="exportClientPDF()">🖨️ Descargar en PDF</button>' : ''}
      </div>
      ${mios.length ? mios.map(m => {
        const st = followupState(m);
        return `<div class="alert-card alert-${st.cls}" style="align-items:flex-start">
          <div class="ai">${m.done ? '✅' : st.cls === 'due' ? '🔔' : '🔧'}</div>
          <div style="flex:1">
            <div class="at">${esc(m.service)}</div>
            <div class="ad" style="color:var(--txt-dim)">
              ${fmtDate(m.service_date)} · ${esc(m.mode)}${m.km ? ' · ' + fmtNum(m.km) + ' km' : ''}${m.cost ? ' · RD$' + fmtNum(m.cost) : ''}<br>
              ${m.notes ? esc(m.notes) + '<br>' : ''}
              <strong>Revisión de seguimiento:</strong> ${fmtDate(m.followup_date)}
              <span class="tag ${st.tag}" style="margin-left:.4rem">${st.label}</span>
            </div>
          </div></div>`;
      }).join('') : `<div class="empty-state"><div class="i">🔧</div>
          <p>Todavía no hay servicios registrados en su cuenta.</p></div>`}`;
  }

  /* ---------------- NOTIFICACIONES ---------------- */
  else if (PANEL_TAB === 'notis') {
    body.innerHTML = `
      <div class="panel-head-row">
        <h3 class="panel-h3">Notificaciones</h3>
        ${notis.some(n => !n.is_read) ? '<button class="btn btn-line btn-sm" onclick="markAllRead()">Marcar todas como leídas</button>' : ''}
      </div>
      ${notis.length ? notis.map(n => `
        <div class="alert-card ${n.is_read ? 'alert-ok' : 'alert-soon'}" style="opacity:${n.is_read ? '.62' : '1'}">
          <div class="ai">${n.is_read ? '📭' : '📬'}</div>
          <div><div class="at">${esc(n.title)}</div>
            <div class="ad" style="color:var(--txt-dim)">${esc(n.body)}<br>
              <span class="sub">${fmtDate(n.created_at)}</span></div></div>
        </div>`).join('')
      : `<div class="empty-state"><div class="i">📭</div><p>No tiene notificaciones.</p></div>`}`;
    setTimeout(markAllRead, 1800);
  }

  /* ---------------- CLIENTE: PERFIL ---------------- */
  else if (PANEL_TAB === 'perfil') {
    body.innerHTML = `
      <h3 class="panel-h3" style="margin-bottom:1.4rem">Mis datos</h3>
      <div style="max-width:560px">
        <div id="pf-msg"></div>
        <div class="field-row">
          <div class="field"><label>Nombre</label><input id="pf-name" value="${esc(SESSION.name)}"></div>
          <div class="field"><label>Teléfono</label><input id="pf-phone" value="${esc(SESSION.phone || '')}"></div>
        </div>
        <div class="field"><label>Correo</label>
          <input value="${esc(SESSION.email)}" disabled>
          <p class="hint">El correo es su usuario de acceso y no se puede cambiar desde aquí.</p>
        </div>
        <div class="field"><label>Tipo de cliente</label>
          <select id="pf-type">
            ${['Particular','Empresa','Dealer','Rent Car'].map(t =>
              `<option ${SESSION.client_type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-fill" onclick="saveProfile()">Guardar cambios</button>
      </div>`;
  }
}

/* Tabla reutilizable de mantenimientos */
function renderMaintTable(lista, conCliente, users = []) {
  if (!lista.length)
    return `<div class="empty-state" style="padding:2.5rem"><div class="i">🔧</div><p>Sin registros.</p></div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr>${conCliente ? '<th>Cliente</th>' : ''}<th>Servicio</th><th>Fecha</th><th>Km</th><th>Revisión</th><th>Estado</th>${conCliente ? '<th></th>' : ''}</tr></thead>
    <tbody>${lista.map(m => {
      const st = followupState(m);
      const u  = users.find(x => x.id === m.user_id);
      return `<tr>
        ${conCliente ? `<td><strong>${esc(u ? u.name : '—')}</strong></td>` : ''}
        <td style="font-size:.85rem">${esc(m.service)}<br><span class="sub">${esc(m.mode || '')}</span></td>
        <td style="white-space:nowrap">${fmtDate(m.service_date)}</td>
        <td>${m.km ? fmtNum(m.km) : '—'}</td>
        <td style="white-space:nowrap">${fmtDate(m.followup_date)}</td>
        <td><span class="tag ${st.tag}">${st.label}</span></td>
        ${conCliente ? `<td>${m.done ? '' : `<button class="btn btn-ghost btn-sm" onclick="completeFollowup('${m.id}')">Marcar hecha</button>`}</td>` : ''}
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

async function markRequest(id) {
  const { error } = await DB.markRequestDone(id);
  if (error) return toast('No se pudo actualizar', error.message);
  toast('Solicitud actualizada', 'Marcada como atendida.');
  renderPanel();
}

async function markAllRead() {
  if (!SESSION) return;
  await DB.markNotisRead(SESSION.id);
  refreshBadge();
}

async function saveProfile() {
  const { error } = await DB.updateProfile(SESSION.id, {
    name:        val('pf-name'),
    phone:       val('pf-phone'),
    client_type: val('pf-type')
  });
  if (error) return msg('pf-msg', 'err', 'No se pudo guardar: ' + error.message);
  SESSION = await DB.getProfile(SESSION.id);
  msg('pf-msg', 'ok', 'Datos actualizados correctamente.');
  renderNavAuth();
  openPanel();
}


/* =====================================================================
   IMPORTADOR DEL VEHÍCULO INICIAL
   ---------------------------------------------------------------------
   Sube las 11 fotos de la carpeta img/jeep/ a Supabase Storage y crea
   la ficha del Jeep en la base de datos. Aparece sólo para el
   administrador y sólo mientras el catálogo esté vacío.
   Después de usarlo una vez, el botón ya no vuelve a mostrarse.
   ===================================================================== */
const JEEP_INICIAL = {
  make: 'Jeep',
  model: 'Wrangler 4xe Unlimited',
  year: 2021,
  type: 'jeepeta',
  price: 34500,
  price_dop: 0,
  km: 0,
  transmission: 'Automática',
  fuel: 'Híbrido',
  color: 'Gris Granito',
  engine: '2.0L Turbo I4 + Eléctrico (4xe Plug-in Hybrid)',
  drive: '4x4 / AWD',
  condition: 'Importado de subasta',
  tag: 'Clean Carfax',
  status: 'disponible',
  description: [
    '✔️ Motor híbrido enchufable (4xe)',
    '✔️ Modos de manejo: Eléctrico, Híbrido y Gasolina',
    '✔️ Clean Carfax',
    '✔️ Asientos en cuero (leather)',
    '✔️ 4 puertas',
    '✔️ Aros deportivos negros',
    '✔️ Luces LED',
    '✔️ Estribos laterales',
    '✔️ Cámara de reversa',
    '✔️ Pantalla táctil multimedia',
    '✔️ Controles al volante',
    '✔️ Aire acondicionado',
    '✔️ Excelente condición estética y mecánica',
    '',
    '✅ Clean Carfax',
    '🚗 Entrega inmediata disponible.'
  ].join('\n')
};

async function importarJeepInicial() {
  if (!isAdmin()) return;
  if (!confirm('Se subirán las 11 fotos del Jeep a Supabase y se creará su ficha. ¿Continuar?')) return;

  const btn = document.getElementById('btn-import-jeep');
  if (btn) { btn.disabled = true; btn.textContent = 'Subiendo fotos... 0/11'; }

  const urls = [];
  for (let i = 1; i <= 11; i++) {
    const nombre = String(i).padStart(2, '0') + '.jpg';
    try {
      const resp = await fetch(`img/jeep/${nombre}`);
      if (!resp.ok) throw new Error('no encontrada');
      const blob = await resp.blob();
      const file = new File([blob], nombre, { type: 'image/jpeg' });

      const { url, error } = await DB.uploadMedia(file, 'jeep-inicial');
      if (error) throw error;
      urls.push(url);
    } catch (e) {
      console.error('Foto ' + nombre, e);
      toast('Error al subir', `No se pudo subir la foto ${nombre}. Revise que exista en img/jeep/.`);
      if (btn) { btn.disabled = false; btn.textContent = '📦 Importar Jeep inicial'; }
      return;
    }
    if (btn) btn.textContent = `Subiendo fotos... ${i}/11`;
  }

  if (btn) btn.textContent = 'Creando la ficha...';
  const { error } = await DB.insertVehicle({ ...JEEP_INICIAL, photos: urls, videos: [] });

  if (error) {
    toast('No se pudo crear la ficha', error.message);
    if (btn) { btn.disabled = false; btn.textContent = '📦 Importar Jeep inicial'; }
    return;
  }

  toast('Jeep importado', 'Las 11 fotos quedaron en Supabase y la ficha ya está publicada.');
  VEH_CACHE = {};
  renderCatalog();
  renderPanel();
}


/* =====================================================================
   9. CONTACTO, PDF Y UTILIDADES
   ===================================================================== */

async function submitContact() {
  const name = val('cf-name'), phone = val('cf-phone');
  if (!name || !phone) return msg('contact-msg', 'err', 'Indique al menos su nombre y su teléfono.');

  const req = {
    user_id:        SESSION ? SESSION.id : null,
    name, phone,
    email:          val('cf-mail') || null,
    service:        val('cf-service'),
    mode:           val('cf-mode'),
    preferred_date: val('cf-date') || null,
    notes:          val('cf-notes')
  };

  if (SB_OK) {
    const { error } = await DB.insertRequest(req);
    if (error) console.error(error);
  }

  const txt = encodeURIComponent(
    `Hola SARARON, soy ${name} (${phone}).\n` +
    `Servicio: ${req.service}\nModalidad: ${req.mode}\n` +
    (req.preferred_date ? `Fecha preferida: ${req.preferred_date}\n` : '') +
    (req.notes ? `Detalles: ${req.notes}` : ''));

  msg('contact-msg', 'ok', '¡Solicitud recibida! Le contactaremos a la brevedad.');
  ['cf-name','cf-phone','cf-mail','cf-date','cf-notes'].forEach(k => setVal(k, ''));
  toast('Solicitud enviada', 'También puede continuar por WhatsApp.');
  setTimeout(() => window.open(`https://wa.me/${CONFIG.whatsapp}?text=${txt}`, '_blank'), 700);
}

/* --------- Exportar a PDF (usa el diálogo de impresión) --------- */
const PRINT_CSS = `
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Georgia,'Times New Roman',serif; color:#1a1a1a; padding:2.2rem 2.4rem; }
  .ph-header { display:flex; align-items:center; gap:1.2rem; border-bottom:2px solid #111; padding-bottom:1rem; margin-bottom:1.6rem; }
  .ph-header img { height:52px; width:auto; object-fit:contain; }
  .ph-titles { flex:1; }
  .ph-titles h1 { font-size:1.25rem; margin-bottom:.25rem; }
  .ph-titles p { font-size:.78rem; color:#555; font-family:Arial,sans-serif; }
  .ph-summary { width:100%; border-collapse:collapse; margin-bottom:2rem; }
  .ph-summary th,.ph-summary td { border:1px solid #ccc; padding:.6rem .5rem; text-align:center; font-family:Arial,sans-serif; }
  .ph-summary th { background:#f2f2f2; font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:#444; }
  .ph-summary td { font-size:1.15rem; font-weight:700; }
  h2.ph-section { font-family:Arial,sans-serif; font-size:.78rem; font-weight:700; letter-spacing:.14em;
    text-transform:uppercase; color:#B0121F; margin:2rem 0 .7rem; padding-bottom:.35rem; border-bottom:1px solid #ddd; }
  table.ph-table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:.8rem; margin-bottom:.5rem; }
  table.ph-table th { background:#111; color:#fff; text-align:left; padding:.5rem .6rem;
    font-size:.66rem; letter-spacing:.06em; text-transform:uppercase; }
  table.ph-table td { padding:.5rem .6rem; border-bottom:1px solid #e2e2e2; vertical-align:top; }
  table.ph-table tr:nth-child(even) td { background:#f8f8f8; }
  .ph-empty { font-family:Arial,sans-serif; font-size:.82rem; color:#888; padding:.8rem 0; font-style:italic; }
  .ph-footer { margin-top:2.4rem; padding-top:1rem; border-top:1px solid #ccc; font-family:Arial,sans-serif;
    font-size:.68rem; color:#888; display:flex; justify-content:space-between; }
  thead { display:table-header-group; }
  tr,.ph-summary { page-break-inside:avoid; }
  @page { margin:14mm 12mm; }
  @media print { body { padding:0; } }`;

function openPrintWindow(title, bodyHtml) {
  const win = window.open('', '_blank');
  if (!win) return toast('Ventana bloqueada',
    'Su navegador bloqueó la ventana de impresión. Permita las ventanas emergentes e inténtelo de nuevo.');

  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>${esc(title)}</title><style>${PRINT_CSS}</style></head>
    <body>${bodyHtml}</body></html>`);
  win.document.close();
  setTimeout(() => { try { win.focus(); win.print(); } catch (e) {} }, 400);
}

async function exportPDF() {
  if (!isAdmin()) return;
  const [veh, clientes, maint, reqs] = await Promise.all([
    DB.getVehicles(), DB.getClients(), DB.getMaint(), DB.getRequests()
  ]);
  const vencidos = maint.filter(m => !m.done && new Date(m.followup_date) <= Date.now()).length;
  const estados  = { disponible:'Disponible', reservado:'Reservado', transito:'En tránsito', vendido:'Vendido' };
  const base     = location.href.replace(/[^/]*$/, '');

  const html = `
    <div class="ph-header">
      <img src="${base}img/logo-sararon.jpg" alt="SARARON">
      <div class="ph-titles">
        <h1>SARARON Centro de Servicios &middot; LUXURA Auto Import</h1>
        <p>Reporte administrativo general — ${new Date().toLocaleDateString('es-DO', { day:'2-digit', month:'long', year:'numeric' })}</p>
      </div>
      <img src="${base}img/logo-luxura.jpg" alt="LUXURA">
    </div>

    <table class="ph-summary">
      <tr><th>Vehículos disponibles</th><th>Clientes</th><th>Servicios</th><th>Revisiones vencidas</th><th>Solicitudes nuevas</th></tr>
      <tr><td>${veh.filter(v => v.status === 'disponible').length}</td><td>${clientes.length}</td>
          <td>${maint.length}</td><td>${vencidos}</td>
          <td>${reqs.filter(r => r.status === 'nueva').length}</td></tr>
    </table>

    <h2 class="ph-section">Inventario de Vehículos · ${veh.length}</h2>
    ${veh.length ? `<table class="ph-table"><thead><tr><th>Vehículo</th><th>Tipo</th><th>Año</th><th>Precio US$</th><th>Precio RD$</th><th>Estado</th></tr></thead><tbody>
      ${veh.map(v => {
        const t = CONFIG.tiposVehiculo.find(x => x.id === v.type);
        return `<tr><td>${esc(v.make)} ${esc(v.model)}</td><td>${t ? esc(t.label) : esc(v.type)}</td>
          <td>${v.year || '—'}</td><td>${v.price ? '$' + fmtNum(v.price) : '—'}</td>
          <td>${v.price_dop ? 'RD$' + fmtNum(v.price_dop) : '—'}</td>
          <td>${estados[v.status] || '—'}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="ph-empty">Sin vehículos registrados.</p>'}

    <h2 class="ph-section">Clientes Registrados · ${clientes.length}</h2>
    ${clientes.length ? `<table class="ph-table"><thead><tr><th>Nombre</th><th>Contacto</th><th>Tipo</th><th>Servicios</th></tr></thead><tbody>
      ${clientes.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.phone || '—')}<br>${esc(u.email)}</td>
        <td>${esc(u.client_type || '—')}</td><td>${maint.filter(m => m.user_id === u.id).length}</td></tr>`).join('')}
      </tbody></table>` : '<p class="ph-empty">Sin clientes registrados.</p>'}

    <h2 class="ph-section">Historial de Mantenimientos · ${maint.length}</h2>
    ${maint.length ? `<table class="ph-table"><thead><tr><th>Cliente</th><th>Servicio</th><th>Fecha</th><th>Km</th><th>Revisión</th><th>Estado</th></tr></thead><tbody>
      ${maint.map(m => {
        const u = clientes.find(x => x.id === m.user_id);
        return `<tr><td>${esc(u ? u.name : '—')}</td><td>${esc(m.service)}</td>
          <td>${fmtDate(m.service_date)}</td><td>${m.km ? fmtNum(m.km) + ' km' : '—'}</td>
          <td>${fmtDate(m.followup_date)}</td><td>${m.done ? 'Completada' : followupState(m).label}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="ph-empty">Sin servicios registrados.</p>'}

    <h2 class="ph-section">Solicitudes de Cita · ${reqs.length}</h2>
    ${reqs.length ? `<table class="ph-table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Servicio</th><th>Recibida</th><th>Estado</th></tr></thead><tbody>
      ${reqs.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(r.service || '—')}</td>
        <td>${fmtDate(r.created_at)}</td><td>${r.status === 'nueva' ? 'Nueva' : 'Atendida'}</td></tr>`).join('')}
      </tbody></table>` : '<p class="ph-empty">Sin solicitudes registradas.</p>'}

    <div class="ph-footer">
      <span>SARARON Centro de Servicios &middot; LUXURA Auto Import</span>
      <span>${esc(CONFIG.dirDealer)}</span>
    </div>`;

  openPrintWindow('Reporte SARARON · LUXURA', html);
  toast('Generando PDF', 'En el cuadro de impresión, elija "Guardar como PDF".');
}

async function exportClientPDF() {
  if (!SESSION) return;
  const maint = await DB.getMaint(SESSION.id);
  const base  = location.href.replace(/[^/]*$/, '');

  const html = `
    <div class="ph-header">
      <img src="${base}img/logo-sararon.jpg" alt="SARARON">
      <div class="ph-titles">
        <h1>Historial de Mantenimiento — ${esc(SESSION.name)}</h1>
        <p>Generado el ${new Date().toLocaleDateString('es-DO', { day:'2-digit', month:'long', year:'numeric' })}</p>
      </div>
    </div>
    <h2 class="ph-section">Servicios realizados · ${maint.length}</h2>
    ${maint.length ? `<table class="ph-table"><thead><tr><th>Servicio</th><th>Fecha</th><th>Modalidad</th><th>Km</th><th>Revisión</th><th>Estado</th></tr></thead><tbody>
      ${maint.map(m => `<tr><td>${esc(m.service)}</td><td>${fmtDate(m.service_date)}</td>
        <td>${esc(m.mode || '—')}</td><td>${m.km ? fmtNum(m.km) + ' km' : '—'}</td>
        <td>${fmtDate(m.followup_date)}</td>
        <td>${m.done ? 'Completada' : followupState(m).label}</td></tr>`).join('')}
      </tbody></table>` : '<p class="ph-empty">Todavía no hay servicios registrados en su cuenta.</p>'}
    <div class="ph-footer">
      <span>SARARON Centro de Servicios</span><span>${esc(CONFIG.dirTaller)}</span>
    </div>`;

  openPrintWindow('Historial · ' + SESSION.name, html);
  toast('Generando PDF', 'En el cuadro de impresión, elija "Guardar como PDF".');
}

/* --------- Utilidades --------- */
const val    = id => (document.getElementById(id)?.value || '').trim();
const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v ?? ''; };
const esc    = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtNum = n => Number(n || 0).toLocaleString('es-DO');
const fmtDate = d => new Date(d).toLocaleDateString('es-DO',
  { day:'2-digit', month:'short', year:'numeric' });

/* Descripción tipo lista: una línea por característica */
function formatDesc(text) {
  if (!text) return '';
  return text.split('\n').map(line => {
    const t = line.trim();
    return t === '' ? '<div class="desc-gap"></div>' : `<div class="desc-line">${esc(t)}</div>`;
  }).join('');
}

function msg(box, tipo, texto) {
  const e = document.getElementById(box);
  if (e) e.innerHTML = `<div class="form-msg ${tipo}">${texto}</div>`;
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.getElementById('panel').classList.contains('open'))
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id));
  const vm = document.getElementById('modal-vehicle');
  if (vm && vm.classList.contains('open')) {
    if (e.key === 'ArrowLeft')  vdStep(-1);
    if (e.key === 'ArrowRight') vdStep(1);
  }
});

function toast(titulo, texto) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<div class="tt">${esc(titulo)}</div><div class="tm">${esc(texto)}</div>`;
  document.getElementById('toast-stack').appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 500); }, 5200);
}

let IO = null;
function observeReveals() {
  if (IO) IO.disconnect();
  IO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('seen'); IO.unobserve(e.target); }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.rv:not(.seen)').forEach(el => IO.observe(el));
}

/* Arrastrar y soltar archivos */
function initDropzones() {
  [['dz-photos', f => handlePhotoFiles(f)],
   ['dz-video',  f => handleVideoFile(f[0])]].forEach(([id, fn]) => {
    const dz = document.getElementById(id);
    if (!dz) return;
    ['dragenter','dragover'].forEach(ev =>
      dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev =>
      dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => fn(e.dataTransfer.files));
  });
}

/* Engranaje decorativo del hero */
function drawGear() {
  const g = document.getElementById('teeth');
  if (!g) return;
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    d += `<line x1="${50 + Math.cos(a) * 30}" y1="${50 + Math.sin(a) * 30}"
                x2="${50 + Math.cos(a) * 40}" y2="${50 + Math.sin(a) * 40}" stroke-width="3"/>`;
  }
  g.innerHTML = d;
}


/* =====================================================================
   10. ARRANQUE
   ===================================================================== */
(async function init() {
  // Logos
  document.getElementById('nav-logo-img').src     = 'img/logo-sararon.jpg';
  document.getElementById('hero-logo-taller').src = 'img/logo-sararon.jpg';
  document.getElementById('hero-logo-dealer').src = 'img/logo-luxura.jpg';
  document.getElementById('foot-logo-1').src      = 'img/logo-sararon.jpg';
  document.getElementById('foot-logo-2').src      = 'img/logo-luxura.jpg';

  // Contacto
  const waBase = `https://wa.me/${CONFIG.whatsapp}`;
  document.getElementById('hero-wa').href  = `${waBase}?text=${encodeURIComponent('Hola SARARON, quiero agendar una cita.')}`;
  document.getElementById('dom-wa').href   = `${waBase}?text=${encodeURIComponent('Hola SARARON, quiero solicitar servicio a domicilio.')}`;
  document.getElementById('lux-wa').href   = `${waBase}?text=${encodeURIComponent('Hola LUXURA, quiero información sobre el inventario de vehículos.')}`;
  document.getElementById('wa-float').href = waBase;
  document.getElementById('foot-wa').href  = waBase;
  document.getElementById('foot-ig').href  = CONFIG.instagramUrl;

  document.getElementById('ci-wa').innerHTML =
    `<a href="${waBase}" target="_blank" rel="noopener" class="ci-link">+${CONFIG.whatsapp}</a>`;
  document.getElementById('ci-ig').innerHTML =
    `<a href="${CONFIG.instagramUrl}" target="_blank" rel="noopener" class="ci-link">${esc(CONFIG.instagram)}</a>`;
  document.getElementById('ci-mail').innerHTML = CONFIG.email
    ? `<a href="mailto:${CONFIG.email}" class="ci-link">${esc(CONFIG.email)}</a>`
    : `<span class="sub">[Agregar Correo]</span>`;

  document.getElementById('year').textContent = new Date().getFullYear();

  drawGear();
  initDropzones();
  buildMobileMenu();
  observeReveals();

  // Base de datos
  if (!initSupabase()) {
    showConfigWarning();
    renderCatalog();
    return;
  }

  const tasa = await DB.getSetting('usd_to_dop');
  if (tasa) TASA_USD = parseFloat(tasa) || TASA_USD;

  await loadSession();
  renderCatalog();

  // Mantener la sesión sincronizada entre pestañas
  sb.auth.onAuthStateChange(async (evt) => {
    if (evt === 'SIGNED_OUT') { SESSION = null; renderNavAuth(); }
    if (evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED') await loadSession();
  });
})();
