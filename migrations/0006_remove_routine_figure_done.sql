-- mydancebook:requires-backup=true

DROP TRIGGER routine_figures_validate_insert;
DROP TRIGGER routine_figures_validate_update;
DROP INDEX routine_figures_by_section_and_position;

ALTER TABLE routine_figures RENAME TO routine_figures_with_done;

CREATE TABLE routine_figures (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES routine_sections (id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position > 0),
  figure_id TEXT REFERENCES figures (id) ON DELETE RESTRICT,
  figure_variant_id TEXT REFERENCES figure_variants (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (section_id, position)
) STRICT;

CREATE INDEX routine_figures_by_section_and_position
ON routine_figures (section_id, position);

INSERT INTO routine_figures
  (id, section_id, position, figure_id, figure_variant_id, created_at, updated_at)
SELECT id, section_id, position, figure_id, figure_variant_id, created_at, updated_at
FROM routine_figures_with_done;

CREATE TEMP TABLE migration_0006_verification (
  valid INTEGER NOT NULL CHECK (valid = 1)
) STRICT;

INSERT INTO migration_0006_verification (valid)
SELECT CASE
  WHEN (SELECT COUNT(*) FROM routine_figures) = (SELECT COUNT(*) FROM routine_figures_with_done)
    AND NOT EXISTS (
      SELECT 1
      FROM routine_figures_with_done
      LEFT JOIN routine_figures ON routine_figures.id = routine_figures_with_done.id
      WHERE routine_figures.id IS NULL
        OR routine_figures.section_id <> routine_figures_with_done.section_id
        OR routine_figures.position <> routine_figures_with_done.position
        OR routine_figures.figure_id IS NOT routine_figures_with_done.figure_id
        OR routine_figures.figure_variant_id IS NOT routine_figures_with_done.figure_variant_id
        OR routine_figures.created_at <> routine_figures_with_done.created_at
        OR routine_figures.updated_at <> routine_figures_with_done.updated_at
    )
  THEN 1
  ELSE 0
END;

DROP TABLE routine_figures_with_done;
DROP TABLE migration_0006_verification;

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
