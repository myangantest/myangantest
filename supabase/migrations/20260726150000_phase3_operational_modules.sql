-- Migration: 20260726150000_phase3_operational_modules.sql
-- Phase 3 Operational Modules Schema: Maintenance History, Agreement Versions, Verification Audits & Moderation Queue

-- 1. ENUMS FOR PHASE 3
DO $$ BEGIN
    CREATE TYPE public.report_reason AS ENUM ('misleading_price', 'fake_photos', 'unresponsive_owner', 'duplicate_listing', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status AS ENUM ('pending', 'under_review', 'actioned_suspended', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.verification_status AS ENUM ('not_submitted', 'submitted', 'under_review', 'additional_information_required', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLES

-- Maintenance Ticket Comments
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Ticket Status History
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_status ticket_status,
    new_status ticket_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agreement Version History
CREATE TABLE IF NOT EXISTS public.agreement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES public.agreement_records(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    terms_json JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property Reports & Moderation Queue
CREATE TABLE IF NOT EXISTS public.property_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason report_reason NOT NULL,
    details TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 3. SCHEMA ALTERATIONS FOR ENHANCED MODULES

ALTER TABLE public.maintenance_tickets 
    ADD COLUMN IF NOT EXISTS sla_target_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

ALTER TABLE public.agreement_records
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS notice_period_months INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS lock_in_months INTEGER DEFAULT 6,
    ADD COLUMN IF NOT EXISTS maintenance_terms TEXT,
    ADD COLUMN IF NOT EXISTS utilities_terms TEXT,
    ADD COLUMN IF NOT EXISTS pdf_download_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.property_verification_requests
    ADD COLUMN IF NOT EXISTS ver_status verification_status NOT NULL DEFAULT 'not_submitted',
    ADD COLUMN IF NOT EXISTS document_refs JSONB DEFAULT '[]', -- Secure internal storage paths (never public)
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR PHASE 3 TABLES

ALTER TABLE public.maintenance_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- Ticket Comments: Parties to ticket view/insert comments
CREATE POLICY "Parties view ticket comments" ON public.maintenance_ticket_comments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.maintenance_tickets t
        WHERE t.id = maintenance_ticket_comments.ticket_id 
        AND (t.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.properties p WHERE p.id = t.property_id AND p.owner_id = auth.uid()
        ) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
);

CREATE POLICY "Parties insert ticket comments" ON public.maintenance_ticket_comments FOR INSERT WITH CHECK (
    auth.uid() = author_id AND EXISTS (
        SELECT 1 FROM public.maintenance_tickets t
        WHERE t.id = maintenance_ticket_comments.ticket_id 
        AND (t.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.properties p WHERE p.id = t.property_id AND p.owner_id = auth.uid()
        ) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
);

-- Ticket History: Parties view ticket history
CREATE POLICY "Parties view ticket history" ON public.maintenance_ticket_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.maintenance_tickets t
        WHERE t.id = maintenance_ticket_history.ticket_id 
        AND (t.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.properties p WHERE p.id = t.property_id AND p.owner_id = auth.uid()
        ) OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
    )
);

-- Agreement Versions: Agreement parties view versions
CREATE POLICY "Parties view agreement versions" ON public.agreement_versions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.agreement_records a
        WHERE a.id = agreement_versions.agreement_id 
        AND (a.landlord_id = auth.uid() OR a.tenant_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
        ))
    )
);

-- Property Reports: Users create reports; Admins manage reports
CREATE POLICY "Users insert property reports" ON public.property_reports FOR INSERT WITH CHECK (
    auth.uid() = reporter_id OR reporter_id IS NULL
);

CREATE POLICY "Admins view and manage property reports" ON public.property_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
