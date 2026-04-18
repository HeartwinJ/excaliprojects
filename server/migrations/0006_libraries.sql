-- Up Migration
create table libraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  data_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index libraries_owner_idx on libraries (owner_id);

-- Down Migration
drop table if exists libraries;
