-- add_shop_photos_bucket

-- 1. Create the shop_photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop_photos', 'shop_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts if re-run
DROP POLICY IF EXISTS "Public access to shop_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload shop_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own shop_photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own shop_photos" ON storage.objects;

-- 3. Policy: Public can view images
CREATE POLICY "Public access to shop_photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shop_photos' );

-- 4. Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload shop_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'shop_photos' );

-- 5. Policy: Users can update their own images
CREATE POLICY "Users can update their own shop_photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'shop_photos' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'shop_photos' AND auth.uid() = owner );

-- 6. Policy: Users can delete their own images
CREATE POLICY "Users can delete their own shop_photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'shop_photos' AND auth.uid() = owner );
