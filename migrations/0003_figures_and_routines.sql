-- mydancebook:requires-backup=true

CREATE TABLE figures (
  id TEXT PRIMARY KEY,
  dance_id TEXT NOT NULL REFERENCES dances (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX figures_by_dance_and_name ON figures (dance_id, name COLLATE NOCASE);

CREATE TABLE figure_variants (
  id TEXT PRIMARY KEY,
  figure_id TEXT NOT NULL REFERENCES figures (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX figure_variants_by_figure ON figure_variants (figure_id);

CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  dance_id TEXT NOT NULL REFERENCES dances (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX routines_by_dance_and_created_at ON routines (dance_id, created_at, id);

CREATE TABLE routine_figures (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  figure_id TEXT REFERENCES figures (id) ON DELETE RESTRICT,
  figure_variant_id TEXT REFERENCES figure_variants (id) ON DELETE RESTRICT,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (routine_id, position)
) STRICT;

CREATE INDEX routine_figures_by_routine_and_position ON routine_figures (routine_id, position);

CREATE TRIGGER routine_figures_validate_insert
BEFORE INSERT ON routine_figures
BEGIN
  SELECT CASE
    WHEN NEW.figure_variant_id IS NOT NULL AND NEW.figure_id IS NULL
    THEN RAISE(ABORT, 'RoutineFigure variant requires Figure')
  END;
  SELECT CASE
    WHEN NEW.figure_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM figures
      JOIN routines ON routines.id = NEW.routine_id
      WHERE figures.id = NEW.figure_id AND figures.dance_id = routines.dance_id
    ) THEN RAISE(ABORT, 'RoutineFigure Figure must belong to routine Dance')
  END;
  SELECT CASE
    WHEN NEW.figure_variant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM figure_variants
      WHERE figure_variants.id = NEW.figure_variant_id AND figure_variants.figure_id = NEW.figure_id
    ) THEN RAISE(ABORT, 'RoutineFigure variant must belong to Figure')
  END;
END;

CREATE TRIGGER routine_figures_validate_update
BEFORE UPDATE OF routine_id, figure_id, figure_variant_id ON routine_figures
BEGIN
  SELECT CASE
    WHEN NEW.figure_variant_id IS NOT NULL AND NEW.figure_id IS NULL
    THEN RAISE(ABORT, 'RoutineFigure variant requires Figure')
  END;
  SELECT CASE
    WHEN NEW.figure_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM figures
      JOIN routines ON routines.id = NEW.routine_id
      WHERE figures.id = NEW.figure_id AND figures.dance_id = routines.dance_id
    ) THEN RAISE(ABORT, 'RoutineFigure Figure must belong to routine Dance')
  END;
  SELECT CASE
    WHEN NEW.figure_variant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM figure_variants
      WHERE figure_variants.id = NEW.figure_variant_id AND figure_variants.figure_id = NEW.figure_id
    ) THEN RAISE(ABORT, 'RoutineFigure variant must belong to Figure')
  END;
END;
