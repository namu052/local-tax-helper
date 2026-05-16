
-- Roles
CREATE TYPE public.app_role AS ENUM ('officer', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_staff_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff users (profiles for officers/admins)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT,
  role TEXT NOT NULL DEFAULT 'officer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read users" ON public.users FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));
CREATE POLICY "admins manage users" ON public.users FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Applicants (민원인)
CREATE TABLE public.applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  rrn_front TEXT,
  rrn_masked TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert applicants" ON public.applicants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read applicants" ON public.applicants FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));

-- Exemption types
CREATE TABLE public.exemption_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  description TEXT,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  caution_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exemption_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active exemption types" ON public.exemption_types FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_any_staff_role(auth.uid()));
CREATE POLICY "admins manage exemption types" ON public.exemption_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Receipt number sequence
CREATE SEQUENCE public.receipt_number_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_num INT;
BEGIN
  next_num := nextval('public.receipt_number_seq');
  RETURN 'TAX-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

-- Tax applications
CREATE TABLE public.tax_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE DEFAULT public.generate_receipt_number(),
  tax_type TEXT NOT NULL,
  exemption_type_id UUID REFERENCES public.exemption_types(id),
  application_reason TEXT,
  additional_note TEXT,
  status TEXT NOT NULL DEFAULT 'AI 검토 대기',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert applications" ON public.tax_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read applications" ON public.tax_applications FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));
CREATE POLICY "staff update applications" ON public.tax_applications FOR UPDATE TO authenticated USING (public.has_any_staff_role(auth.uid()));

-- Application documents
CREATE TABLE public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.tax_applications(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert documents" ON public.application_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read documents" ON public.application_documents FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));

-- AI reviews (구조만)
CREATE TABLE public.ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.tax_applications(id) ON DELETE CASCADE,
  review_result TEXT,
  summary TEXT,
  possibility_reason TEXT,
  missing_documents JSONB DEFAULT '[]'::jsonb,
  check_points JSONB DEFAULT '[]'::jsonb,
  officer_check_points JSONB DEFAULT '[]'::jsonb,
  draft_answer TEXT,
  risk_level TEXT,
  manual_references JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ai reviews" ON public.ai_reviews FOR SELECT TO authenticated USING (public.has_any_staff_role(auth.uid()));

-- Officer answers
CREATE TABLE public.officer_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.tax_applications(id) ON DELETE CASCADE,
  officer_name TEXT,
  answer_title TEXT,
  answer_content TEXT,
  final_status TEXT,
  supplement_request TEXT,
  internal_memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.officer_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage officer answers" ON public.officer_answers FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

-- Status logs
CREATE TABLE public.status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.tax_applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage status logs" ON public.status_logs FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

-- Manual sets / volumes / sections / chunks (구조만)
CREATE TABLE public.manual_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  year INT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage manual sets" ON public.manual_sets FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

CREATE TABLE public.manual_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_set_id UUID NOT NULL REFERENCES public.manual_sets(id) ON DELETE CASCADE,
  volume_number INT NOT NULL,
  title TEXT,
  file_name TEXT,
  file_url TEXT,
  page_count INT,
  uploaded_at TIMESTAMPTZ
);
ALTER TABLE public.manual_volumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage manual volumes" ON public.manual_volumes FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

CREATE TABLE public.manual_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_volume_id UUID NOT NULL REFERENCES public.manual_volumes(id) ON DELETE CASCADE,
  chapter_title TEXT,
  section_title TEXT,
  tax_type TEXT,
  exemption_type TEXT,
  page_start INT,
  page_end INT,
  summary TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage manual sections" ON public.manual_sections FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

CREATE TABLE public.manual_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_volume_id UUID NOT NULL REFERENCES public.manual_volumes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.manual_sections(id) ON DELETE SET NULL,
  page_number INT,
  chunk_text TEXT,
  chunk_summary TEXT,
  tax_type TEXT,
  exemption_type TEXT,
  legal_basis TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  embedding TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage manual chunks" ON public.manual_chunks FOR ALL TO authenticated USING (public.has_any_staff_role(auth.uid())) WITH CHECK (public.has_any_staff_role(auth.uid()));

-- Seed exemption types
INSERT INTO public.exemption_types (title, tax_type, description, required_documents, checklist_rules) VALUES
('생애최초 주택 구입 취득세 감면', '취득세', '생애최초로 주택을 구입한 경우 취득세 감면 가능성을 검토하는 유형',
 '["지방세 감면 신청서","주민등록등본","가족관계증명서","매매계약서","주택 취득 관련 서류"]'::jsonb,
 '["신청인이 주택 취득자인가?","신청인과 배우자의 과거 주택 소유 이력이 확인되었는가?","취득 주택이 감면 대상 주택에 해당하는가?","취득가액 기준 확인이 필요한가?","감면 신청서가 제출되었는가?"]'::jsonb),
('장애인 자동차 관련 감면', '취득세, 자동차세', '장애인 본인 또는 공동명의 차량에 대한 감면 가능성을 검토하는 유형',
 '["지방세 감면 신청서","장애인 증명서","자동차 등록 관련 서류","가족관계증명서","공동명의 확인 서류"]'::jsonb,
 '["신청인이 장애인 감면 대상자인가?","차량 명의가 요건에 맞는가?","공동명의 요건 확인이 필요한가?","기존 감면 차량이 있는가?","자동차 등록 서류가 제출되었는가?"]'::jsonb),
('다자녀 양육자 자동차 취득세 감면', '취득세', '다자녀 양육자의 자동차 취득세 감면 가능성을 검토하는 유형',
 '["지방세 감면 신청서","가족관계증명서","주민등록등본","자동차 매매계약서","자동차 등록 관련 서류"]'::jsonb,
 '["자녀 수 요건 확인이 필요한가?","자녀 연령 요건 확인이 필요한가?","차량 취득일 확인이 필요한가?","공동명의 여부 확인이 필요한가?","기존 감면 이력 확인이 필요한가?"]'::jsonb),
('국가유공자 감면', '취득세, 자동차세', '국가유공자 또는 관련 대상자의 지방세 감면 가능성을 검토하는 유형',
 '["지방세 감면 신청서","국가유공자 확인 서류","자동차 등록 관련 서류","가족관계증명서"]'::jsonb,
 '["신청인이 감면 대상자인가?","감면 대상 물건 또는 차량인지 확인이 필요한가?","관련 증빙서류가 제출되었는가?","기존 감면 이력이 있는가?"]'::jsonb);
