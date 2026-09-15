INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-images', 'menu-images', true, 5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read of menu images
CREATE POLICY "Menu images public read" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');

-- Admins can upload/delete images (authenticated role assumed to have is_admin check via RLS function)
CREATE POLICY "Admins upload menu images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'menu-images' AND public.is_admin()
);
CREATE POLICY "Admins delete menu images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'menu-images' AND public.is_admin()
);
