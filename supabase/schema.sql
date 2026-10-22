-- Run in the Supabase SQL editor. API access uses the server-only service role.
create table if not exists public.portfolio_content (
  key text primary key check (key = 'main'),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
revoke all on public.portfolio_content from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-assets', 'portfolio-assets', true, 4194304,
        array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 4194304,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage write policies are granted to browser roles. Uploads go through
-- the authenticated serverless endpoint using the service role secret.
