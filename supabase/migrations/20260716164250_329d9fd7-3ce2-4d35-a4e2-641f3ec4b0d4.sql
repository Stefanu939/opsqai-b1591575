ALTER TABLE public.license_installs DROP CONSTRAINT IF EXISTS license_installs_install_id_fkey;
ALTER TABLE public.license_orders DROP CONSTRAINT IF EXISTS license_orders_install_id_fkey;
ALTER TABLE public.installation_package_downloads DROP CONSTRAINT IF EXISTS installation_package_downloads_install_id_fkey;

ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_install_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS licenses_install_unique ON public.licenses (install_id) WHERE kind = 'install';
CREATE UNIQUE INDEX IF NOT EXISTS licenses_module_unique ON public.licenses (install_id, module_key) WHERE kind = 'module';

ALTER TABLE public.license_orders
  ADD CONSTRAINT license_orders_install_id_fkey
  FOREIGN KEY (install_id) REFERENCES public.license_installs(install_id) ON DELETE CASCADE;

ALTER TABLE public.installation_package_downloads
  ADD CONSTRAINT installation_package_downloads_install_id_fkey
  FOREIGN KEY (install_id) REFERENCES public.license_installs(install_id) ON DELETE CASCADE;