
CREATE OR REPLACE FUNCTION public.submit_tax_application(
  p_name text,
  p_address text,
  p_phone text,
  p_rrn_front text,
  p_rrn_masked text,
  p_tax_type text,
  p_exemption_type_id uuid,
  p_application_reason text,
  p_additional_note text,
  p_documents jsonb
)
RETURNS TABLE(application_id uuid, receipt_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant_id uuid;
  v_app_id uuid;
  v_receipt text;
  v_doc jsonb;
BEGIN
  IF p_name IS NULL OR p_phone IS NULL OR p_tax_type IS NULL OR p_exemption_type_id IS NULL THEN
    RAISE EXCEPTION '필수 입력값이 누락되었습니다';
  END IF;

  INSERT INTO public.applicants(name, address, phone, rrn_front, rrn_masked)
  VALUES (p_name, p_address, p_phone, p_rrn_front, p_rrn_masked)
  RETURNING id INTO v_applicant_id;

  INSERT INTO public.tax_applications(applicant_id, tax_type, exemption_type_id, application_reason, additional_note, status)
  VALUES (v_applicant_id, p_tax_type, p_exemption_type_id, p_application_reason, p_additional_note, 'AI 검토 대기')
  RETURNING id, tax_applications.receipt_number INTO v_app_id, v_receipt;

  IF p_documents IS NOT NULL AND jsonb_array_length(p_documents) > 0 THEN
    FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
      INSERT INTO public.application_documents(application_id, document_name, is_submitted)
      VALUES (v_app_id, v_doc->>'document_name', COALESCE((v_doc->>'is_submitted')::boolean, false));
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_app_id, v_receipt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tax_application(text, text, text, text, text, text, uuid, text, text, jsonb) TO anon, authenticated;
