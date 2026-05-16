
-- Storage bucket for manual PDFs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuals', 'manuals', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload/update/delete manual files
CREATE POLICY "admins upload manuals"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update manuals"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete manuals"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));

-- All staff can read manual files (signed URLs / authenticated access)
CREATE POLICY "staff read manuals"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'manuals' AND public.has_any_staff_role(auth.uid()));

-- Constraints on manual_volumes
ALTER TABLE public.manual_volumes
  ADD CONSTRAINT manual_volumes_set_volume_unique UNIQUE (manual_set_id, volume_number);

ALTER TABLE public.manual_volumes
  ADD CONSTRAINT manual_volumes_volume_number_check CHECK (volume_number IN (1, 2));

-- Admins can manage manual_sets and manual_volumes (in addition to staff read)
CREATE POLICY "admins manage manual sets"
ON public.manual_sets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage manual volumes"
ON public.manual_volumes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
