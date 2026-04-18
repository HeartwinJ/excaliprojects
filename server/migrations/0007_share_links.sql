-- Up Migration
create table share_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_links_board_idx on share_links (board_id) where revoked_at is null;

-- Down Migration
drop table if exists share_links;
