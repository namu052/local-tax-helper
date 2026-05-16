
CREATE OR REPLACE FUNCTION public.lookup_application_by_receipt(_receipt TEXT, _phone TEXT)
RETURNS TABLE (
  receipt_number TEXT,
  created_at TIMESTAMPTZ,
  tax_type TEXT,
  status TEXT,
  exemption_types JSONB,
  officer_answers JSONB
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    ta.receipt_number,
    ta.created_at,
    ta.tax_type,
    ta.status,
    CASE WHEN et.id IS NULL THEN NULL ELSE jsonb_build_object('title', et.title) END AS exemption_types,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'answer_title', oa.answer_title,
        'answer_content', oa.answer_content,
        'supplement_request', oa.supplement_request
      )) FROM public.officer_answers oa WHERE oa.application_id = ta.id),
      '[]'::jsonb
    ) AS officer_answers
  FROM public.tax_applications ta
  JOIN public.applicants a ON a.id = ta.applicant_id
  LEFT JOIN public.exemption_types et ON et.id = ta.exemption_type_id
  WHERE ta.receipt_number = _receipt AND a.phone = _phone
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_application_by_receipt(TEXT, TEXT) TO anon, authenticated;
