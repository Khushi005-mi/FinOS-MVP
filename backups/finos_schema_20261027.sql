--
-- PostgreSQL database dump
--

\restrict mUGvtl5aKjbb2Mwj3A0V3bmf0yaeC6HZ8Re4b1KHDk527oqVcepO43JLg4YRfIg

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_transactions (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    source_file_id uuid NOT NULL,
    date date NOT NULL,
    narration text,
    debit_paise numeric(20,0) NOT NULL,
    credit_paise numeric(20,0) NOT NULL,
    balance_paise numeric(20,0),
    reference character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bank_transactions OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cases (
    id uuid NOT NULL,
    discrepancy_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    owner_id uuid,
    resolution text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT '2026-10-26 16:13:40.03191+00'::timestamp with time zone NOT NULL
);


ALTER TABLE public.cases OWNER TO postgres;

--
-- Name: discrepancies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discrepancies (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    check_type character varying(50) NOT NULL,
    reason_code character varying(50) NOT NULL,
    amount_paise numeric(20,0) NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT '2026-10-26 16:13:40.03191+00'::timestamp with time zone NOT NULL
);


ALTER TABLE public.discrepancies OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    source_file_id uuid NOT NULL,
    voucher_date date NOT NULL,
    voucher_type character varying(50),
    party_id uuid,
    amount_paise numeric(20,0) NOT NULL,
    ledger_name text,
    created_at timestamp with time zone DEFAULT '2026-10-26 16:13:40.03191+00'::timestamp with time zone NOT NULL
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    match_type character varying(50) NOT NULL,
    matched_record_ids uuid[] NOT NULL,
    confidence_score numeric(3,2) NOT NULL,
    reason_code character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT '2026-10-26 16:13:40.03191+00'::timestamp with time zone NOT NULL
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    gstin character varying(15),
    pan character varying(10),
    financial_year_start character varying(10) DEFAULT '04-01'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlements (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    source_file_id uuid NOT NULL,
    settlement_id character varying(100) NOT NULL,
    gross_amount_paise numeric(20,0) NOT NULL,
    fee_paise numeric(20,0) NOT NULL,
    gst_on_fee_paise numeric(20,0),
    refunds_paise numeric(20,0),
    holds_paise numeric(20,0),
    net_amount_paise numeric(20,0) NOT NULL,
    settlement_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.settlements OWNER TO postgres;

--
-- Name: source_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.source_files (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    file_type character varying(50) NOT NULL,
    file_path text NOT NULL,
    sha256_hash character(64) NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    row_count integer,
    period_start date,
    period_end date
);


ALTER TABLE public.source_files OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'finance_user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: discrepancies discrepancies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: source_files source_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_files
    ADD CONSTRAINT source_files_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_bank_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_bank_transactions_date ON public.bank_transactions USING btree (date);


--
-- Name: ix_bank_transactions_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_bank_transactions_organization_id ON public.bank_transactions USING btree (organization_id);


--
-- Name: ix_bank_transactions_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_bank_transactions_reference ON public.bank_transactions USING btree (reference);


--
-- Name: ix_bank_transactions_source_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_bank_transactions_source_file_id ON public.bank_transactions USING btree (source_file_id);


--
-- Name: ix_cases_discrepancy_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_cases_discrepancy_id ON public.cases USING btree (discrepancy_id);


--
-- Name: ix_cases_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_cases_organization_id ON public.cases USING btree (organization_id);


--
-- Name: ix_discrepancies_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_discrepancies_organization_id ON public.discrepancies USING btree (organization_id);


--
-- Name: ix_discrepancies_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_discrepancies_status ON public.discrepancies USING btree (status);


--
-- Name: ix_ledger_entries_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_organization_id ON public.ledger_entries USING btree (organization_id);


--
-- Name: ix_ledger_entries_party_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_party_id ON public.ledger_entries USING btree (party_id);


--
-- Name: ix_ledger_entries_source_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_source_file_id ON public.ledger_entries USING btree (source_file_id);


--
-- Name: ix_ledger_entries_voucher_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_voucher_date ON public.ledger_entries USING btree (voucher_date);


--
-- Name: ix_matches_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_matches_organization_id ON public.matches USING btree (organization_id);


--
-- Name: ix_settlements_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_settlements_organization_id ON public.settlements USING btree (organization_id);


--
-- Name: ix_settlements_settlement_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_settlements_settlement_date ON public.settlements USING btree (settlement_date);


--
-- Name: ix_settlements_settlement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_settlements_settlement_id ON public.settlements USING btree (settlement_id);


--
-- Name: ix_settlements_source_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_settlements_source_file_id ON public.settlements USING btree (source_file_id);


--
-- Name: ix_source_files_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_source_files_organization_id ON public.source_files USING btree (organization_id);


--
-- Name: ix_source_files_sha256_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_source_files_sha256_hash ON public.source_files USING btree (sha256_hash);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: bank_transactions bank_transactions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_source_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES public.source_files(id) ON DELETE CASCADE;


--
-- Name: cases cases_discrepancy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_discrepancy_id_fkey FOREIGN KEY (discrepancy_id) REFERENCES public.discrepancies(id) ON DELETE CASCADE;


--
-- Name: cases cases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: cases cases_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: discrepancies discrepancies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: discrepancies discrepancies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: ledger_entries ledger_entries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_source_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES public.source_files(id) ON DELETE CASCADE;


--
-- Name: matches matches_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_source_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_source_file_id_fkey FOREIGN KEY (source_file_id) REFERENCES public.source_files(id) ON DELETE CASCADE;


--
-- Name: source_files source_files_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_files
    ADD CONSTRAINT source_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: source_files source_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source_files
    ADD CONSTRAINT source_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bank_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: cases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

--
-- Name: discrepancies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_transactions org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.bank_transactions USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: cases org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.cases USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: discrepancies org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.discrepancies USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: ledger_entries org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.ledger_entries USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: matches org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.matches USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: settlements org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.settlements USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: source_files org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.source_files USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: users org_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY org_isolation_policy ON public.users USING ((organization_id = (current_setting('app.current_org_id'::text, true))::uuid));


--
-- Name: settlements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: source_files; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.source_files ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict mUGvtl5aKjbb2Mwj3A0V3bmf0yaeC6HZ8Re4b1KHDk527oqVcepO43JLg4YRfIg

