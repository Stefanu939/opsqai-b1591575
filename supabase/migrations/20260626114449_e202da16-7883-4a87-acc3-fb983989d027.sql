-- Phase 1: Enum value additions (must commit before new values can be referenced).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';