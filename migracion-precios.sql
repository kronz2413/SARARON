-- =====================================================================
-- MIGRACIÓN 02 — Precio en Dólares y en Pesos Dominicanos
-- Ejecutar en Supabase → SQL Editor (una sola vez, después del schema)
-- =====================================================================

-- price       = monto en dólares estadounidenses (US$)
-- price_dop   = monto en pesos dominicanos (RD$)
-- Ambos son opcionales. Si sólo llena uno, la web muestra sólo ese.
alter table public.dealer_vehicles
  add column if not exists price_dop numeric(14,2) not null default 0;

comment on column public.dealer_vehicles.price     is 'Precio en dólares (US$). 0 = no mostrar.';
comment on column public.dealer_vehicles.price_dop is 'Precio en pesos dominicanos (RD$). 0 = no mostrar.';


-- ---------------------------------------------------------------------
-- Tasa de cambio para el botón "convertir" del panel de administración.
-- Es un solo registro que el administrador puede actualizar cuando
-- cambie la tasa, sin tocar el código.
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value)
values ('usd_to_dop', '61.00')
on conflict (key) do nothing;

alter table public.settings enable row level security;

grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;

drop policy if exists "settings: lectura pública" on public.settings;
create policy "settings: lectura pública" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "settings: admin escribe" on public.settings;
create policy "settings: admin escribe" on public.settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings: admin inserta" on public.settings;
create policy "settings: admin inserta" on public.settings
  for insert to authenticated with check (public.is_admin());
