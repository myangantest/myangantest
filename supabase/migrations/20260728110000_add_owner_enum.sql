-- Migration: 20260728110000_add_owner_enum.sql
-- Add 'owner' to app_role enum safely in a separate transaction block

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
