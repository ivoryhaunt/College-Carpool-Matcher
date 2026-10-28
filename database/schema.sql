-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

create table rides (
  id bigint generated always as identity primary key,
  driver_name text not null,
  driver_email text not null,
  origin text not null,
  destination text not null,
  departure_time timestamptz not null,
  seats_available int not null check (seats_available >= 0),
  created_at timestamptz default now()
);

create table ride_requests (
  id bigint generated always as identity primary key,
  ride_id bigint references rides(id) on delete cascade,
  rider_name text not null,
  rider_email text not null,
  status text default 'pending',  -- pending, accepted, rejected
  created_at timestamptz default now()
);
