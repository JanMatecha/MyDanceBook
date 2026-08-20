-- mydancebook:requires-backup=true

DROP TRIGGER routine_figures_validate_insert;
DROP TRIGGER routine_figures_validate_update;
DROP INDEX routine_figures_by_routine_and_position;

ALTER TABLE routine_figures RENAME TO routine_figures_flat;

CREATE TABLE routine_sections (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  position INTEGER NOT NULL CHECK (position > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (routine_id, position)
) STRICT;

CREATE INDEX routine_sections_by_routine_and_position
ON routine_sections (routine_id, position);

INSERT INTO routine_sections (id, routine_id, name, position, created_at, updated_at)
SELECT
  lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-7' ||
    lower(substr(hex(randomblob(2)), 2, 3)) || '-8' ||
    lower(substr(hex(randomblob(2)), 2, 3)) || '-' ||
    lower(hex(randomblob(6))),
  id,
  'Část 1',
  1,
  created_at,
  updated_at
FROM routines;

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
SELECT
  routine_figures_flat.id,
  routine_sections.id,
  routine_figures_flat.position,
  routine_figures_flat.figure_id,
  routine_figures_flat.figure_variant_id,
  routine_figures_flat.done,
  routine_figures_flat.created_at,
  routine_figures_flat.updated_at
FROM routine_figures_flat
JOIN routine_sections ON routine_sections.routine_id = routine_figures_flat.routine_id;

CREATE TEMP TABLE migration_0004_verification (
  valid INTEGER NOT NULL CHECK (valid = 1)
) STRICT;

INSERT INTO migration_0004_verification (valid)
SELECT CASE
  WHEN (SELECT COUNT(*) FROM routine_sections) = (SELECT COUNT(*) FROM routines)
    AND NOT EXISTS (
      SELECT routine_id
      FROM routine_sections
      GROUP BY routine_id
      HAVING COUNT(*) <> 1
    )
    AND (SELECT COUNT(*) FROM routine_figures) = (SELECT COUNT(*) FROM routine_figures_flat)
    AND NOT EXISTS (
      SELECT 1
      FROM routine_figures_flat
      LEFT JOIN routine_figures ON routine_figures.id = routine_figures_flat.id
      WHERE routine_figures.id IS NULL
        OR routine_figures.position <> routine_figures_flat.position
        OR routine_figures.figure_id IS NOT routine_figures_flat.figure_id
        OR routine_figures.figure_variant_id IS NOT routine_figures_flat.figure_variant_id
        OR routine_figures.done <> routine_figures_flat.done
        OR routine_figures.created_at <> routine_figures_flat.created_at
        OR routine_figures.updated_at <> routine_figures_flat.updated_at
    )
  THEN 1
  ELSE 0
END;

DROP TABLE routine_figures_flat;
DROP TABLE migration_0004_verification;

CREATE TRIGGER routine_sections_prevent_routine_change
BEFORE UPDATE OF routine_id ON routine_sections
WHEN NEW.routine_id <> OLD.routine_id
BEGIN
  SELECT RAISE(ABORT, 'RoutineSection Routine cannot change');
END;

CREATE TRIGGER routine_sections_prevent_last_delete
BEFORE DELETE ON routine_sections
WHEN (SELECT COUNT(*) FROM routine_sections WHERE routine_id = OLD.routine_id) <= 1
BEGIN
  SELECT RAISE(ABORT, 'Routine must retain at least one RoutineSection');
END;

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
