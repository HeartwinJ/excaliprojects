-- Up Migration
alter table boards add column if not exists save_count integer not null default 0;

create table board_versions (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  scene_json jsonb not null,
  label text,
  is_checkpoint boolean not null default false,
  created_at timestamptz not null default now()
);

create index board_versions_board_idx on board_versions (board_id, created_at desc);
create index board_versions_auto_idx on board_versions (board_id, is_checkpoint, created_at);

-- Down Migration
drop table if exists board_versions;
alter table boards drop column if exists save_count;
