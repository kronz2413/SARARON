# SARARON Centro de Servicios · LUXURA Auto Import

Sitio web 2-en-1: taller mecánico (SARARON) y dealer de vehículos (LUXURA Auto Import),
con catálogo, cuentas de usuario, panel de administración y avisos automáticos de
revisión a los 15 días.

**Base de datos y archivos:** Supabase
**Alojamiento:** GitHub Pages (o cualquier hosting estático)

---

## Credenciales de administrador

```
Usuario:     admin@sararon.do
Contraseña:  Sararon2026$Admin
```

⚠ **Cambie esta contraseña después de la primera entrada.**
Se hace desde Supabase → Authentication → Users → clic en el usuario → *Reset password*.

Estas credenciales no funcionan hasta completar el **Paso 2** de abajo.

---

## Puesta en marcha (una sola vez)

### Paso 1 — Terminar la base de datos

Ya ejecutó `schema.sql`. Ahora ejecute, en **Supabase → SQL Editor**, en este orden:

1. **`migracion-precios.sql`** — agrega el precio en pesos dominicanos y la tasa de cambio.
2. **`limpiar-y-admin.sql`** — borra todos los datos de prueba. *(Sólo la Parte 1 por ahora.)*

### Paso 2 — Crear el usuario administrador

En **Supabase → Authentication → Users → Add user → Create new user**:

| Campo | Valor |
|---|---|
| Email | `admin@sararon.do` |
| Password | `Sararon2026$Admin` |
| Auto Confirm User | ✅ **actívelo** |

Luego vuelva al **SQL Editor** y ejecute la **Parte 2** de `limpiar-y-admin.sql`
(la línea `update public.profiles set role = 'admin' ...`).

Debe devolverle una fila con `role = admin`. Si devuelve vacío, el usuario no se
creó bien o el correo no coincide.

### Paso 3 — Conectar el sitio a su proyecto

En **Supabase → Project Settings → API** copie:

- **Project URL**
- **Project API keys → `anon` `public`**

Péguelos en el archivo **`config.js`**:

```js
SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
SUPABASE_KEY: 'eyJhbGciOi...',
```

> La llave `anon` es pública por diseño y puede subirse a GitHub sin riesgo.
> Lo que protege los datos son las políticas RLS del schema, no el secreto de esa llave.
> **Nunca** ponga aquí la llave `service_role`.

### Paso 4 — Cargar el Jeep

1. Abra el sitio y entre con el usuario administrador.
2. En el panel, pestaña **Resumen**, presione **📦 Importar Jeep inicial**.

Esto sube las 11 fotos de `img/jeep/` a Supabase Storage y crea la ficha completa.
El botón desaparece solo una vez que el catálogo deja de estar vacío.

---

## Subir a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Sitio SARARON / LUXURA conectado a Supabase"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

### Publicar con GitHub Pages

1. En el repositorio: **Settings → Pages**
2. *Source*: **Deploy from a branch**
3. *Branch*: `main` · carpeta `/ (root)` → **Save**

En pocos minutos queda en `https://USUARIO.github.io/REPOSITORIO/`.

### Autorizar el dominio en Supabase

**Supabase → Authentication → URL Configuration → Site URL**
Coloque la dirección de GitHub Pages. Sin esto el inicio de sesión puede fallar.

---

## Avisos automáticos de 15 días

La fecha de revisión se calcula sola en la base de datos al registrar un
mantenimiento. Para que la notificación aparezca aunque el cliente no entre al
sitio, active el proceso diario:

1. **Supabase → Database → Extensions** → active **`pg_cron`**
2. En el SQL Editor, ejecute:

```sql
select cron.schedule(
  'avisos-revision-15-dias',
  '0 13 * * *',
  $$ select public.generate_followup_notifications(); $$
);
```

Corre todos los días a las 9:00 AM hora de República Dominicana.

> Esto crea el aviso **dentro del sitio** (la campana 🔔). Para que además llegue
> por WhatsApp o correo hace falta contratar un servicio de envío y conectarlo con
> una Edge Function. La lógica de fechas ya está resuelta.

---

## Estructura de archivos

```
index.html              Estructura de la página
style.css               Todo el diseño
config.js               ← EL ÚNICO ARCHIVO QUE DEBE EDITAR
app.js                  Lógica: catálogo, login, panel, Supabase
img/
  logo-sararon.jpg      Logo del taller
  logo-luxura.jpg       Logo del dealer
  jeep/01..11.jpg       Fotos del Jeep para la importación inicial
schema.sql              Estructura de la base (ya ejecutado)
migracion-precios.sql   Precio en dos monedas + tasa de cambio
limpiar-y-admin.sql     Borrar datos de prueba + crear administrador
```

---

## Uso diario

### Agregar un vehículo
Panel → **Vehículos** → *Agregar Vehículo*.
Arrastre las fotos (se suben solas a Supabase y se comprimen).
La **primera foto es la portada**.

**Precios:** puede llenar sólo dólares, sólo pesos, o ambos. Los botones
`US$ → RD$` y `RD$ → US$` convierten con la tasa guardada. Para cambiar la tasa,
use el botón **💱 Tasa** del resumen.

**Descripción:** escriba una característica por línea empezando con ✔️.
Se muestran como una lista ordenada en la ficha.

### Registrar un mantenimiento
Panel → **Mantenimientos** → *Registrar Mantenimiento*.
La revisión de seguimiento se programa sola a los 15 días y el cliente recibe el aviso.

### Ver los clientes
Panel → **Clientes**. Cada uno muestra su próxima revisión y un botón directo de WhatsApp.

---

## Seguridad

- Las contraseñas las maneja Supabase Auth (cifradas, nunca viajan al navegador).
- El rol de administrador **no se puede obtener desde el formulario de registro**:
  lo asigna un trigger de la base y siempre es `cliente`. Sólo se cambia por SQL.
- Las políticas RLS impiden que un cliente vea los datos de otro.
- Sólo el administrador puede escribir en el catálogo y subir archivos.
