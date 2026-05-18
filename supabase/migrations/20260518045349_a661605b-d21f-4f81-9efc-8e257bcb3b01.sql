DROP FUNCTION IF EXISTS public.lookup_application_by_receipt(text, text);

CREATE OR REPLACE FUNCTION public.lookup_application_by_receipt(_receipt text, _phone text)
 RETURNS TABLE(receipt_number text, created_at timestamp with time zone, tax_type text, status text, application_reason text, additional_note text, exemption_types jsonb, officer_answers jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    ta.receipt_number,
    ta.created_at,
    ta.tax_type,
    ta.status,
    ta.application_reason,
    ta.additional_note,
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
  WHERE
    (NULLIF(trim(_receipt), '') IS NOT NULL OR NULLIF(trim(_phone), '') IS NOT NULL)
    AND (
      (NULLIF(trim(_receipt), '') IS NOT NULL AND ta.receipt_number = trim(_receipt))
      OR (NULLIF(trim(_phone), '') IS NOT NULL AND a.phone = trim(_phone))
    )
  ORDER BY ta.created_at DESC
  LIMIT 1;
$function$;