-- =====================================================================
-- LIMPIEZA DE DATOS DEMO  +  CREACIÓN DEL ADMINISTRADOR
-- Ejecutar en Supabase → SQL Editor
-- =====================================================================


-- ---------------------------------------------------------------------
-- PARTE 1 — BORRAR TODO RASTRO DE PRUEBAS
--   Deja la base completamente vacía y lista para entregar.
--   (Las tablas y la seguridad se mantienen intactas.)
-- ---------------------------------------------------------------------
delete from public.notifications;
delete from public.maintenance;
delete from public.appointment_requests;
delete from public.client_vehicles;
delete from public.dealer_vehicles;

-- Borra también los usuarios de prueba que se hayan registrado.
-- ⚠ Si YA creó su usuario administrador, sáltese esta línea o
--   cambie el correo para no borrarse a sí mismo.
-- delete from auth.users where email <> 'admin@sararon.do';


-- ---------------------------------------------------------------------
-- PARTE 2 — CONVERTIR SU CUENTA EN ADMINISTRADOR
--
--   ANTES de ejecutar esto, cree el usuario desde el panel:
--     Supabase → Authentication → Users → "Add user" → "Create new user"
--       Email:            admin@sararon.do
--       Password:         Sararon2026$Admin
--       Auto Confirm User: ✅ ACTIVADO  (importante)
--
--   Luego ejecute la línea de abajo.
-- ---------------------------------------------------------------------
update public.profiles
   set role = 'admin',
       name = 'Administrador SARARON'
 where email = 'admin@sararon.do';

-- Verificación: debe devolver una fila con role = 'admin'
select id, name, email, role from public.profiles where role = 'admin';
