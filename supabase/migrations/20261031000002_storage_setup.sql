-- ====================================================================
-- HACKOS STORAGE BUCKETS SETUP
-- Migration: 20261031000002_storage_setup.sql
-- ====================================================================

-- 1. Insert storage buckets if not present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('event-assets', 'event-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('venue-documents', 'venue-documents', false, 20971520, ARRAY['application/pdf', 'image/png', 'image/jpeg']),
  ('venue-agreements', 'venue-agreements', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies
-- Avatars: Anyone can view avatars, authenticated users can upload their own
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users upload avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Event assets: Public read, organizers upload
CREATE POLICY "Public read event assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');

CREATE POLICY "Authenticated upload event assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-assets' 
    AND auth.role() = 'authenticated'
  );

-- Venue documents: Private, only owner or authorized platform can view
CREATE POLICY "Venue owner upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-documents' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Venue owner view own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'venue-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Venue agreements: Private, only venue authority and event organizer can view
CREATE POLICY "Authenticated upload venue agreements"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-agreements' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authorized view venue agreements"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'venue-agreements' 
    AND auth.role() = 'authenticated'
  );

