-- Add avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Storage bucket RLS policies for avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- RLS policies for profiles update 
-- (Users need to be able to update their own display_name and avatar_url)
create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );
