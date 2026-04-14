-- Up Migration
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_owner_active_idx on projects (owner_id) where deleted_at is null;

create table boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  scene_json jsonb not null default '{}'::jsonb,
  thumbnail_path text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index boards_project_active_idx on boards (project_id) where deleted_at is null;
create index boards_updated_at_idx on boards (updated_at desc) where deleted_at is null;

-- Down Migration
drop table if exists boards;
drop table if exists projects;
