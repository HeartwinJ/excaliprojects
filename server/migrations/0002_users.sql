-- Up Migration
create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  theme_preference text not null default 'system' check (theme_preference in ('system', 'light', 'dark')),
  created_at timestamptz not null default now()
);

-- Down Migration
drop table if exists users;
