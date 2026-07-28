CREATE POLICY "salon media read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'salon-media' AND public.is_salon_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "salon media insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'salon-media' AND public.is_salon_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "salon media update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'salon-media' AND public.is_salon_member(((storage.foldername(name))[1])::uuid, auth.uid()))
  WITH CHECK (bucket_id = 'salon-media' AND public.is_salon_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "salon media delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'salon-media' AND public.is_salon_member(((storage.foldername(name))[1])::uuid, auth.uid()));
