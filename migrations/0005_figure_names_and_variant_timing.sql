-- mydancebook:requires-backup=true

PRAGMA defer_foreign_keys = ON;

DROP TRIGGER routine_figures_validate_insert;
DROP TRIGGER routine_figures_validate_update;
DROP INDEX routine_figures_by_section_and_position;
DROP INDEX figures_by_dance_and_name;
DROP INDEX figure_variants_by_figure;

ALTER TABLE routine_figures RENAME TO routine_figures_legacy;
ALTER TABLE figure_variants RENAME TO figure_variants_legacy;
ALTER TABLE figures RENAME TO figures_legacy;

CREATE TABLE figures (
  id TEXT PRIMARY KEY,
  dance_id TEXT NOT NULL REFERENCES dances (id) ON DELETE RESTRICT,
  name_cs TEXT CHECK (name_cs IS NULL OR length(trim(name_cs)) BETWEEN 1 AND 200),
  name_en TEXT CHECK (name_en IS NULL OR length(trim(name_en)) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (name_cs IS NOT NULL OR name_en IS NOT NULL)
) STRICT;

CREATE INDEX figures_by_dance_and_names
ON figures (dance_id, name_cs COLLATE NOCASE, name_en COLLATE NOCASE);

INSERT INTO figures (id, dance_id, name_cs, name_en, created_at, updated_at)
SELECT id, dance_id, name, NULL, created_at, updated_at
FROM figures_legacy;

CREATE TABLE figure_variants (
  id TEXT PRIMARY KEY,
  figure_id TEXT NOT NULL REFERENCES figures (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  timing_notation TEXT CHECK (timing_notation IS NULL OR length(trim(timing_notation)) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX figure_variants_by_figure ON figure_variants (figure_id);

INSERT INTO figure_variants (id, figure_id, name, timing_notation, created_at, updated_at)
SELECT id, figure_id, name, NULL, created_at, updated_at
FROM figure_variants_legacy;

CREATE TABLE routine_figures (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES routine_sections (id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position > 0),
  figure_id TEXT REFERENCES figures (id) ON DELETE RESTRICT,
  figure_variant_id TEXT REFERENCES figure_variants (id) ON DELETE RESTRICT,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (section_id, position)
) STRICT;

CREATE INDEX routine_figures_by_section_and_position
ON routine_figures (section_id, position);

INSERT INTO routine_figures
  (id, section_id, position, figure_id, figure_variant_id, done, created_at, updated_at)
SELECT id, section_id, position, figure_id, figure_variant_id, done, created_at, updated_at
FROM routine_figures_legacy;

DROP TABLE routine_figures_legacy;
DROP TABLE figure_variants_legacy;
DROP TABLE figures_legacy;

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
      JOIN routine_sections ON routine_sections.id = NEW.section_id
      JOIN routines ON routines.id = routine_sections.routine_id
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
BEFORE UPDATE OF section_id, figure_id, figure_variant_id ON routine_figures
BEGIN
  SELECT CASE
    WHEN NEW.figure_variant_id IS NOT NULL AND NEW.figure_id IS NULL
    THEN RAISE(ABORT, 'RoutineFigure variant requires Figure')
  END;
  SELECT CASE
    WHEN NEW.figure_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM figures
      JOIN routine_sections ON routine_sections.id = NEW.section_id
      JOIN routines ON routines.id = routine_sections.routine_id
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
