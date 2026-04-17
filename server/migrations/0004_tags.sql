-- Up Migration
create table tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index tags_owner_idx on tags (owner_id);

create table board_tags (
  board_id uuid not null references boards(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (board_id, tag_id)
);

create index board_tags_tag_idx on board_tags (tag_id);

-- Down Migration
drop table if exists board_tags;
drop table if exists tags;
