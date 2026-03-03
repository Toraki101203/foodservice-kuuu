-- Add is_open column to shops table
ALTER TABLE public.shops
ADD COLUMN is_open BOOLEAN NOT NULL DEFAULT false;

-- Update the realtime publication if necessary for this column
-- (Optional depending on how realtime is consumed, but good practice for UI toggles)
ALTER PUBLICATION supabase_realtime ADD TABLE shops;
