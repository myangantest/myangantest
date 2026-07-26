-- Migration: 20260726180000_fix_otp_activation_trigger.sql
-- Fix check_profile_sensitive_fields_update trigger to permit service_role updates for OTP verification

CREATE OR REPLACE FUNCTION public.check_profile_sensitive_fields_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.is_verified <> NEW.is_verified OR OLD.is_subscribed <> NEW.is_subscribed) 
       AND auth.role() <> 'service_role'
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles 
           WHERE user_id = auth.uid() AND role = 'admin'
       ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify verification or subscription status.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER check_profile_sensitive_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_sensitive_fields_update();
