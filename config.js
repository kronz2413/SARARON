/* =====================================================================
   CONFIGURACIÓN DEL SITIO
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesita editar para poner el sitio
   en marcha. Todo lo demás funciona solo.
   ===================================================================== */

const CONFIG = {

  /* ------------------------------------------------------------------
     1. CONEXIÓN A SUPABASE   ⚠ OBLIGATORIO
     ------------------------------------------------------------------
     Búsquelos en:  Supabase → Project Settings → API

       SUPABASE_URL  →  "Project URL"
       SUPABASE_KEY  →  "Project API keys" → la llave  anon / public

     La llave "anon" es pública por diseño: se puede publicar en GitHub
     sin problema. Quien protege los datos son las políticas RLS que ya
     ejecutó en el schema, no el secreto de esta llave.

     ⛔ NUNCA pegue aquí la llave "service_role". Esa sí da acceso total.
     ------------------------------------------------------------------ */
  SUPABASE_URL: 'https://AQUI-SU-PROYECTO.supabase.co',
  SUPABASE_KEY: 'AQUI-SU-LLAVE-ANON-PUBLIC',


  /* ------------------------------------------------------------------
     2. DATOS DE CONTACTO
     ------------------------------------------------------------------ */
  whatsapp:     '18095397970',          // sólo números, con código de país
  instagram:    '@luxurautoimport',
  instagramUrl: 'https://www.instagram.com/luxurautoimport/',
  email:        '',                     // pendiente — se agrega más adelante

  empresa: 'SARARON Centro de Servicios',
  dealer:  'LUXURA Auto Import',

  dirTaller: 'Los Frailes II, detrás del Supermercado Bravo de la Marginal de Las Américas, Santo Domingo Este',
  dirDealer: 'C. 2 7, Santo Domingo Este 11705',


  /* ------------------------------------------------------------------
     3. OPERACIÓN
     ------------------------------------------------------------------ */
  // Días entre un mantenimiento y su revisión de seguimiento
  diasSeguimiento: 15,

  // Tipos de vehículo del catálogo.
  // Agregue o quite libremente: los filtros y el formulario del panel
  // de administración se generan automáticamente desde esta lista.
  tiposVehiculo: [
    { id: 'camioneta', label: 'Camioneta',    icon: '🚙' },
    { id: 'jeepeta',   label: 'Jeepeta / SUV', icon: '🚐' },
    { id: 'sedan',     label: 'Sedán',        icon: '🚗' },
    { id: 'coupe',     label: 'Coupé',        icon: '🏎️' },
    { id: 'pickup',    label: 'Pickup',       icon: '🛻' },
    { id: 'hatchback', label: 'Hatchback',    icon: '🚕' },
    { id: 'minivan',   label: 'Minivan',      icon: '🚌' },
    { id: 'deportivo', label: 'Deportivo',    icon: '🏁' },
    { id: 'electrico', label: 'Eléctrico',    icon: '⚡' },
    { id: 'comercial', label: 'Comercial',    icon: '🚚' }
  ]
};
