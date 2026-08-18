-- mydancebook:requires-backup=false

CREATE TABLE pairs (
  id TEXT PRIMARY KEY,
  singleton_key INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK (singleton_key = 1),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE pair_members (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs (id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('LEADER', 'FOLLOWER')),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (pair_id, role)
) STRICT;

CREATE TABLE dances (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  internal_name TEXT NOT NULL,
  discipline TEXT NOT NULL CHECK (discipline IN ('STANDARD', 'LATIN')),
  display_order INTEGER NOT NULL CHECK (display_order BETWEEN 1 AND 5),
  UNIQUE (discipline, display_order)
) STRICT;

INSERT INTO dances (id, code, internal_name, discipline, display_order) VALUES
  ('01a01352-b78a-76fd-8ba8-f6ca29c7aca6', 'WALTZ', 'Waltz', 'STANDARD', 1),
  ('01a01352-b78c-772b-a92b-8201ea95a250', 'TANGO', 'Tango', 'STANDARD', 2),
  ('01a01352-b78c-772b-a92b-87b63bdd5c24', 'VIENNESE_WALTZ', 'Viennese Waltz', 'STANDARD', 3),
  ('01a01352-b78c-772b-a92b-889ae4043f7b', 'SLOW_FOXTROT', 'Slow Foxtrot', 'STANDARD', 4),
  ('01a01352-b78c-772b-a92b-8ffa9368ba06', 'QUICKSTEP', 'Quickstep', 'STANDARD', 5),
  ('01a01352-b78c-772b-a92b-93cebf4158bd', 'SAMBA', 'Samba', 'LATIN', 1),
  ('01a01352-b78c-772b-a92b-9584e93c0385', 'CHA_CHA_CHA', 'Cha-Cha-Cha', 'LATIN', 2),
  ('01a01352-b78c-772b-a92b-9a726aad06f5', 'RUMBA', 'Rumba', 'LATIN', 3),
  ('01a01352-b78c-772b-a92b-9db4142d90e4', 'PASO_DOBLE', 'Paso Doble', 'LATIN', 4),
  ('01a01352-b78c-772b-a92b-a03a5c1fe34b', 'JIVE', 'Jive', 'LATIN', 5);
