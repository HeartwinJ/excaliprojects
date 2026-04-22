-- Up Migration
create table project_tags (
  project_id uuid not null references projects(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (project_id, tag_id)
);

create index project_tags_tag_idx on project_tags (tag_id);

-- Down Migration
drop table if exists project_tags;
