/**
 * Schema for NaihatiKaliParikrama. Kept as plain SQL so it can be applied by
 * the migration script (`npm run db:migrate`) or from /admin after the first
 * deploy once DATABASE_URL exists. Every statement is idempotent.
 */
export const SCHEMA_SQL = `
create table if not exists pandals (
  id serial primary key,
  slug text unique not null,
  name_en text not null,
  name_bn text not null,
  category text not null check (category in ('heritage','large','small')),
  area_en text not null default '',
  area_bn text not null default '',
  lat double precision not null,
  lng double precision not null,
  landmark_en text,
  landmark_bn text,
  committee text,
  established integer,
  description_en text,
  description_bn text,
  featured boolean not null default false,
  verified boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pandals_category_idx on pandals (category);
create index if not exists pandals_lat_lng_idx on pandals (lat, lng);

create table if not exists crowd_reports (
  id bigserial primary key,
  pandal_slug text not null references pandals(slug) on delete cascade,
  level smallint not null check (level between 1 and 4),
  source text not null default 'user',
  reporter_hash text,
  created_at timestamptz not null default now()
);
create index if not exists crowd_reports_slug_time_idx on crowd_reports (pandal_slug, created_at desc);

create table if not exists facilities (
  id bigserial primary key,
  osm_id text unique,
  kind text not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  phone text,
  source text not null default 'osm',
  updated_at timestamptz not null default now()
);
create index if not exists facilities_kind_idx on facilities (kind);
create index if not exists facilities_lat_lng_idx on facilities (lat, lng);

create table if not exists route_cache (
  id bigserial primary key,
  cache_key text unique not null,
  profile text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
`;
