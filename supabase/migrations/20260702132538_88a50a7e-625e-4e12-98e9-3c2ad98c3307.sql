
DO $$ BEGIN
  CREATE POLICY "Public read support chat images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'support-chat-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
