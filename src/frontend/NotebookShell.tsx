import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  addPlaceholder,
  assignRoutineFigure,
  createFigure,
  createFigureForRoutineFigure,
  createRoutine,
  createRoutineSection,
  getDanceNotebook,
  moveRoutineFigure,
  moveRoutineFigureToSection,
  moveRoutineSection,
  renameFigure,
  renameRoutineSection,
  setRoutineFigureDone,
  type DanceNotebook,
  type RoutineSection,
  type RoutineFigure,
} from './client/notebook';
import {
  updatePairNames,
  type Dance,
  type DanceCode,
  type ReadyAppState,
} from './client/app-state';
import styles from './App.module.css';
import { loadActiveProfile, saveActiveProfile, type ActiveProfile } from './profile';
import { flattenRoutineFigures } from './routine-hierarchy';

const danceLabels: Record<DanceCode, string> = {
  WALTZ: 'Waltz',
  TANGO: 'Tango',
  VIENNESE_WALTZ: 'Vídeňský valčík',
  SLOW_FOXTROT: 'Slowfox',
  QUICKSTEP: 'Quickstep',
  SAMBA: 'Samba',
  CHA_CHA_CHA: 'Cha-cha',
  RUMBA: 'Rumba',
  PASO_DOBLE: 'Paso doble',
  JIVE: 'Jive',
};

export interface NotebookShellProps {
  readonly state: ReadyAppState;
  readonly onStateChange: (state: ReadyAppState) => void;
}

export function NotebookShell({ state, onStateChange }: NotebookShellProps) {
  const [profile, setProfile] = useState<ActiveProfile>(() => loadActiveProfile(state.pair));
  const [leaderDisplayName, setLeaderDisplayName] = useState(state.pair.leader.displayName);
  const [followerDisplayName, setFollowerDisplayName] = useState(state.pair.follower.displayName);
  const [selectedDanceId, setSelectedDanceId] = useState<string | null>(
    state.dances[0]?.id ?? null,
  );
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedRoutineFigureId, setSelectedRoutineFigureId] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<DanceNotebook | null>(null);
  const [loadingNotebook, setLoadingNotebook] = useState(Boolean(state.dances[0]));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const standard = useMemo(
    () => state.dances.filter((dance) => dance.discipline === 'STANDARD'),
    [state.dances],
  );
  const latin = useMemo(
    () => state.dances.filter((dance) => dance.discipline === 'LATIN'),
    [state.dances],
  );
  const editable = profile.kind === 'member';
  const selectedRoutine =
    notebook?.routines.find((routine) => routine.id === selectedRoutineId) ?? null;
  const flattenedRoutineFigures = useMemo(
    () => (selectedRoutine ? flattenRoutineFigures(selectedRoutine) : []),
    [selectedRoutine],
  );
  const selectedRoutineFigureEntry =
    flattenedRoutineFigures.find(
      ({ routineFigure }) => routineFigure.id === selectedRoutineFigureId,
    ) ?? null;
  const selectedRoutineFigure = selectedRoutineFigureEntry?.routineFigure ?? null;

  useEffect(() => {
    if (!selectedDanceId) return;
    const controller = new AbortController();
    getDanceNotebook(selectedDanceId, controller.signal)
      .then((next) => {
        setNotebook(next);
        setSelectedRoutineId((current) =>
          current && next.routines.some((routine) => routine.id === current) ? current : null,
        );
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setMessage(
          cause instanceof Error ? cause.message : 'Taneční zápisník se nepodařilo načíst.',
        );
      })
      .finally(() => setLoadingNotebook(false));
    return () => controller.abort();
  }, [selectedDanceId]);

  function selectProfile(next: ActiveProfile) {
    setProfile(next);
    saveActiveProfile(next);
    setMessage(null);
  }

  function selectDance(danceId: string) {
    setMessage(null);
    setSelectedRoutineId(null);
    setSelectedRoutineFigureId(null);
    if (danceId === selectedDanceId) return;
    setLoadingNotebook(true);
    setSelectedDanceId(danceId);
  }

  async function refreshNotebook(): Promise<DanceNotebook | null> {
    if (!selectedDanceId) return null;
    const next = await getDanceNotebook(selectedDanceId);
    setNotebook(next);
    return next;
  }

  async function runChange(change: () => Promise<void>, successMessage?: string) {
    setSaving(true);
    setMessage(null);
    try {
      await change();
      await refreshNotebook();
      if (successMessage) setMessage(successMessage);
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : 'Změnu se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNames(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const next = await updatePairNames({ leaderDisplayName, followerDisplayName });
      onStateChange(next);
      setLeaderDisplayName(next.pair.leader.displayName);
      setFollowerDisplayName(next.pair.follower.displayName);
      setMessage('Jména jsou uložená.');
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : 'Jména se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  }

  async function submitFigure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDanceId || !editable) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('figureName') ?? '');
    await runChange(async () => {
      await createFigure(selectedDanceId, name);
      formElement.reset();
    }, 'Figura a její výchozí varianta jsou uložené.');
  }

  async function submitRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDanceId || !editable) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('routineName') ?? '');
    setSaving(true);
    setMessage(null);
    try {
      const routine = await createRoutine(selectedDanceId, name);
      formElement.reset();
      setSelectedRoutineId(routine.id);
      setSelectedRoutineFigureId(null);
      await refreshNotebook();
      setMessage('Sestava je připravená k zápisu.');
    } catch (cause: unknown) {
      setMessage(cause instanceof Error ? cause.message : 'Sestavu se nepodařilo vytvořit.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCentralFigureName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const figureId = selectedRoutineFigure?.figureId;
    if (!editable || !figureId) return;
    const name = String(new FormData(event.currentTarget).get('centralFigureName') ?? '');
    await runChange(
      () => renameFigure(figureId, name).then(() => undefined),
      'Název sdílené figury je uložený ve všech jejích použitích.',
    );
  }

  const activeLabel =
    profile.kind === 'host'
      ? 'Host · pouze pro čtení'
      : profile.memberId === state.pair.leader.id
        ? state.pair.leader.displayName
        : state.pair.follower.displayName;

  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Osobní taneční zápisník</p>
          <h1>MyDanceBook</h1>
        </div>
        <div className={styles.profileArea}>
          <span className={styles.activeProfile}>Právě používá: {activeLabel}</span>
          <div className={styles.profileSwitcher} aria-label="Aktivní profil">
            <ProfileButton
              active={profile.kind === 'member' && profile.memberId === state.pair.leader.id}
              onClick={() => selectProfile({ kind: 'member', memberId: state.pair.leader.id })}
            >
              {state.pair.leader.displayName}
            </ProfileButton>
            <ProfileButton
              active={profile.kind === 'member' && profile.memberId === state.pair.follower.id}
              onClick={() => selectProfile({ kind: 'member', memberId: state.pair.follower.id })}
            >
              {state.pair.follower.displayName}
            </ProfileButton>
            <ProfileButton
              active={profile.kind === 'host'}
              onClick={() => selectProfile({ kind: 'host' })}
            >
              Host
            </ProfileButton>
          </div>
        </div>
      </header>

      <main className={styles.notebookLayout}>
        <nav className={styles.notebookNavigation} aria-label="Tance a sestavy">
          <p className={styles.eyebrow}>Tance</p>
          <DanceNavigation
            title="Standardní tance"
            dances={standard}
            selectedDanceId={selectedDanceId}
            onSelect={selectDance}
          />
          <DanceNavigation
            title="Latinskoamerické tance"
            dances={latin}
            selectedDanceId={selectedDanceId}
            onSelect={selectDance}
          />
          <div className={styles.etudes}>
            <span>Etudy</span>
            <small>samostatný trénink</small>
          </div>
          {notebook && (
            <section
              className={styles.routineNavigation}
              aria-labelledby="routine-navigation-title"
            >
              <h2 id="routine-navigation-title">Sestavy</h2>
              {notebook.routines.length === 0 ? (
                <p>Zatím žádná sestava.</p>
              ) : (
                <ul>
                  {notebook.routines.map((routine) => (
                    <li key={routine.id}>
                      <button
                        type="button"
                        className={
                          routine.id === selectedRoutineId ? styles.navigationActive : undefined
                        }
                        onClick={() => {
                          setSelectedRoutineId(routine.id);
                          setSelectedRoutineFigureId(null);
                        }}
                      >
                        {routine.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </nav>

        <section className={styles.routineWorkspace} aria-live="polite">
          {loadingNotebook && <p>Načítám taneční zápisník…</p>}
          {!loadingNotebook && notebook && (
            <>
              <p className={styles.eyebrow}>{danceLabels[notebook.dance.code as DanceCode]}</p>
              <h2>{selectedRoutine ? selectedRoutine.name : 'Zápis tanečních figur'}</h2>
              {!editable && (
                <p className={styles.readOnlyNotice}>Host může zápisník pouze prohlížet.</p>
              )}

              {!selectedRoutine && (
                <div className={styles.capturePanels}>
                  <section className={styles.capturePanel}>
                    <h3>Nová figura</h3>
                    <p>Stačí název. Výchozí varianta vznikne automaticky.</p>
                    {editable && (
                      <form
                        className={styles.inlineForm}
                        onSubmit={(event) => void submitFigure(event)}
                      >
                        <label>
                          Název figury
                          <input name="figureName" required maxLength={200} />
                        </label>
                        <button type="submit" disabled={saving}>
                          Vytvořit figuru
                        </button>
                      </form>
                    )}
                    <FigureLibrary figures={notebook.figures} />
                  </section>
                  <section className={styles.capturePanel}>
                    <h3>Nová sestava</h3>
                    <p>Stačí název. Figury můžete doplnit hned potom.</p>
                    {editable && (
                      <form
                        className={styles.inlineForm}
                        onSubmit={(event) => void submitRoutine(event)}
                      >
                        <label>
                          Název sestavy
                          <input name="routineName" required maxLength={200} />
                        </label>
                        <button type="submit" disabled={saving}>
                          Vytvořit sestavu
                        </button>
                      </form>
                    )}
                  </section>
                </div>
              )}

              {selectedRoutine && (
                <section aria-labelledby="routine-figures-title">
                  <div className={styles.routineToolbar}>
                    <div>
                      <h3 id="routine-figures-title">Části sestavy a pořadí figur</h3>
                      <p>
                        Čísla se odvozují z pořadí částí a figur; každý výskyt má trvalou identitu.
                      </p>
                    </div>
                  </div>
                  <div className={styles.routineSections}>
                    {selectedRoutine.sections.map((routineSection, sectionIndex) => (
                      <RoutineSectionBlock
                        key={routineSection.id}
                        routineSection={routineSection}
                        sectionIndex={sectionIndex}
                        totalSections={selectedRoutine.sections.length}
                        allSections={selectedRoutine.sections}
                        figures={notebook.figures}
                        editable={editable}
                        saving={saving}
                        selectedRoutineFigureId={selectedRoutineFigureId}
                        displayPositionById={
                          new Map(
                            flattenedRoutineFigures.map(({ routineFigure, displayPosition }) => [
                              routineFigure.id,
                              displayPosition,
                            ]),
                          )
                        }
                        onSelect={setSelectedRoutineFigureId}
                        onRename={(name) =>
                          runChange(
                            () =>
                              renameRoutineSection(routineSection.id, name).then(() => undefined),
                            'Název části sestavy je uložený.',
                          )
                        }
                        onMoveUp={() =>
                          runChange(
                            () =>
                              moveRoutineSection(
                                routineSection.id,
                                selectedRoutine.sections[sectionIndex - 1]?.id ?? routineSection.id,
                              ),
                            'Pořadí částí sestavy je uložené.',
                          )
                        }
                        onMoveDown={() =>
                          runChange(
                            () =>
                              moveRoutineSection(
                                routineSection.id,
                                selectedRoutine.sections[sectionIndex + 2]?.id ?? null,
                              ),
                            'Pořadí částí sestavy je uložené.',
                          )
                        }
                        onAddPlaceholder={() =>
                          runChange(async () => {
                            const added = await addPlaceholder(routineSection.id);
                            setSelectedRoutineFigureId(added.id);
                          }, 'Přidán prázdný výskyt figury.')
                        }
                        onAssign={(routineFigureId, figureId, figureVariantId) =>
                          runChange(
                            () => assignRoutineFigure(routineFigureId, figureId, figureVariantId),
                            'Figura je přiřazená k výskytu.',
                          )
                        }
                        onCreateInline={(routineFigureId, name) =>
                          runChange(
                            () => createFigureForRoutineFigure(routineFigureId, name),
                            'Nová figura a její výchozí varianta jsou přiřazené.',
                          )
                        }
                        onMoveFigure={(routineFigureId, beforeRoutineFigureId) =>
                          runChange(
                            () => moveRoutineFigure(routineFigureId, beforeRoutineFigureId),
                            'Pořadí výskytů je uložené.',
                          )
                        }
                        onMoveToSection={(routineFigureId, routineSectionId) =>
                          runChange(
                            () => moveRoutineFigureToSection(routineFigureId, routineSectionId),
                            'Výskyt je přesunutý do vybrané části sestavy.',
                          )
                        }
                        onDone={(routineFigureId, done) =>
                          runChange(
                            () => setRoutineFigureDone(routineFigureId, done).then(() => undefined),
                            done
                              ? 'Výskyt je označený jako hotový.'
                              : 'Výskyt už není označený jako hotový.',
                          )
                        }
                      />
                    ))}
                  </div>
                  {editable && (
                    <form
                      className={styles.addSectionForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formElement = event.currentTarget;
                        const name = String(
                          new FormData(formElement).get('routineSectionName') ?? '',
                        );
                        void runChange(async () => {
                          await createRoutineSection(selectedRoutine.id, name);
                          formElement.reset();
                        }, 'Nová část sestavy je přidaná.');
                      }}
                    >
                      <label>
                        Název nové části
                        <input
                          name="routineSectionName"
                          required
                          maxLength={200}
                          placeholder="Např. První dlouhá strana"
                        />
                      </label>
                      <button type="submit" disabled={saving}>
                        + Část sestavy
                      </button>
                    </form>
                  )}
                </section>
              )}
            </>
          )}
        </section>

        <aside className={styles.inspector} aria-label="Podrobnosti a nastavení">
          <section className={styles.scopePanel}>
            <h2>Sdílená definice</h2>
            {selectedRoutineFigure?.figureName ? (
              <>
                <p>Sdílená definice – změny se projeví ve všech použitích.</p>
                <strong>{selectedRoutineFigure.figureName}</strong>
                <small>
                  {selectedRoutineFigure.figureVariantName ?? 'Varianta zatím není vybraná.'}
                </small>
                {editable && (
                  <form
                    key={`${selectedRoutineFigure.figureId}:${selectedRoutineFigure.figureName}`}
                    className={styles.inlineForm}
                    onSubmit={(event) => void submitCentralFigureName(event)}
                  >
                    <label>
                      Název figury
                      <input
                        name="centralFigureName"
                        required
                        maxLength={200}
                        defaultValue={selectedRoutineFigure.figureName}
                      />
                    </label>
                    <button type="submit" disabled={saving}>
                      Přejmenovat figuru
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p>Vyberte výskyt a přiřaďte mu figuru nebo vytvořte novou přímo v sestavě.</p>
            )}
          </section>
          <section className={styles.scopePanel}>
            <h2>Tento výskyt v sestavě</h2>
            {selectedRoutineFigure ? (
              <p>
                Číslo {selectedRoutineFigureEntry?.displayPosition} ·{' '}
                {selectedRoutineFigure.done ? 'hotovo' : 'rozpracováno'}
                {selectedRoutineFigureEntry &&
                  ` · ${selectedRoutineFigureEntry.routineSection.name}`}
              </p>
            ) : (
              <p>Vyberte řádek sestavy pro místní kontext.</p>
            )}
          </section>
          <section className={styles.settings} aria-labelledby="pair-settings-title">
            <h2 id="pair-settings-title">Nastavení páru</h2>
            {editable ? (
              <form className={styles.form} onSubmit={(event) => void saveNames(event)}>
                <label>
                  Jméno leadera
                  <input
                    required
                    maxLength={100}
                    value={leaderDisplayName}
                    onChange={(event) => setLeaderDisplayName(event.target.value)}
                  />
                </label>
                <label>
                  Jméno followera
                  <input
                    required
                    maxLength={100}
                    value={followerDisplayName}
                    onChange={(event) => setFollowerDisplayName(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={saving}>
                  {saving ? 'Ukládám…' : 'Uložit jména'}
                </button>
              </form>
            ) : (
              <p>Host může sdílený zápisník prohlížet, ale nemění jeho data.</p>
            )}
          </section>
          {message && <p className={styles.message}>{message}</p>}
        </aside>
      </main>
    </div>
  );
}

function RoutineSectionBlock({
  routineSection,
  sectionIndex,
  totalSections,
  allSections,
  figures,
  editable,
  saving,
  selectedRoutineFigureId,
  displayPositionById,
  onSelect,
  onRename,
  onMoveUp,
  onMoveDown,
  onAddPlaceholder,
  onAssign,
  onCreateInline,
  onMoveFigure,
  onMoveToSection,
  onDone,
}: {
  readonly routineSection: RoutineSection;
  readonly sectionIndex: number;
  readonly totalSections: number;
  readonly allSections: readonly RoutineSection[];
  readonly figures: DanceNotebook['figures'];
  readonly editable: boolean;
  readonly saving: boolean;
  readonly selectedRoutineFigureId: string | null;
  readonly displayPositionById: ReadonlyMap<string, number>;
  readonly onSelect: (routineFigureId: string) => void;
  readonly onRename: (name: string) => Promise<void>;
  readonly onMoveUp: () => Promise<void>;
  readonly onMoveDown: () => Promise<void>;
  readonly onAddPlaceholder: () => Promise<void>;
  readonly onAssign: (
    routineFigureId: string,
    figureId: string,
    figureVariantId: string | null,
  ) => Promise<void>;
  readonly onCreateInline: (routineFigureId: string, name: string) => Promise<void>;
  readonly onMoveFigure: (
    routineFigureId: string,
    beforeRoutineFigureId: string | null,
  ) => Promise<void>;
  readonly onMoveToSection: (routineFigureId: string, routineSectionId: string) => Promise<void>;
  readonly onDone: (routineFigureId: string, done: boolean) => Promise<void>;
}) {
  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('routineSectionName') ?? '');
    await onRename(name);
  }

  return (
    <section className={styles.routineSection} aria-labelledby={`section-${routineSection.id}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h4 id={`section-${routineSection.id}`}>{routineSection.name}</h4>
          <small>
            Část {sectionIndex + 1} z {totalSections}
          </small>
        </div>
        {editable && (
          <div className={styles.sectionActions}>
            <button
              type="button"
              disabled={saving || sectionIndex === 0}
              aria-label={`Posunout část ${routineSection.name} nahoru`}
              onClick={() => void onMoveUp()}
            >
              Nahoru
            </button>
            <button
              type="button"
              disabled={saving || sectionIndex === totalSections - 1}
              aria-label={`Posunout část ${routineSection.name} dolů`}
              onClick={() => void onMoveDown()}
            >
              Dolů
            </button>
          </div>
        )}
      </div>
      {editable && (
        <form
          key={`${routineSection.id}:${routineSection.name}`}
          className={styles.sectionRenameForm}
          onSubmit={(event) => void submitRename(event)}
        >
          <label>
            Název části sestavy
            <input
              name="routineSectionName"
              required
              maxLength={200}
              defaultValue={routineSection.name}
            />
          </label>
          <button type="submit" disabled={saving}>
            Přejmenovat část
          </button>
        </form>
      )}
      {routineSection.routineFigures.length === 0 ? (
        <p className={styles.emptyRoutine}>V této části zatím není žádná figura.</p>
      ) : (
        <ol className={styles.routineFigureList}>
          {routineSection.routineFigures.map((routineFigure, index) => (
            <RoutineFigureRow
              key={routineFigure.id}
              routineFigure={routineFigure}
              displayPosition={displayPositionById.get(routineFigure.id) ?? 0}
              index={index}
              total={routineSection.routineFigures.length}
              allSections={allSections}
              figures={figures}
              editable={editable}
              saving={saving}
              selected={routineFigure.id === selectedRoutineFigureId}
              onSelect={() => onSelect(routineFigure.id)}
              onAssign={(figureId, figureVariantId) =>
                onAssign(routineFigure.id, figureId, figureVariantId)
              }
              onCreateInline={(name) => onCreateInline(routineFigure.id, name)}
              onMoveUp={() =>
                onMoveFigure(
                  routineFigure.id,
                  routineSection.routineFigures[index - 1]?.id ?? routineFigure.id,
                )
              }
              onMoveDown={() =>
                onMoveFigure(routineFigure.id, routineSection.routineFigures[index + 2]?.id ?? null)
              }
              onMoveToSection={(routineSectionId) =>
                onMoveToSection(routineFigure.id, routineSectionId)
              }
              onDone={(done) => onDone(routineFigure.id, done)}
            />
          ))}
        </ol>
      )}
      {editable && (
        <button
          type="button"
          className={styles.addFigureButton}
          disabled={saving}
          onClick={() => void onAddPlaceholder()}
        >
          + Figura
        </button>
      )}
    </section>
  );
}

function RoutineFigureRow({
  routineFigure,
  displayPosition,
  index,
  total,
  allSections,
  figures,
  editable,
  saving,
  selected,
  onSelect,
  onAssign,
  onCreateInline,
  onMoveUp,
  onMoveDown,
  onMoveToSection,
  onDone,
}: {
  readonly routineFigure: RoutineFigure;
  readonly displayPosition: number;
  readonly index: number;
  readonly total: number;
  readonly allSections: readonly RoutineSection[];
  readonly figures: DanceNotebook['figures'];
  readonly editable: boolean;
  readonly saving: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onAssign: (figureId: string, figureVariantId: string | null) => Promise<void>;
  readonly onCreateInline: (name: string) => Promise<void>;
  readonly onMoveUp: () => Promise<void>;
  readonly onMoveDown: () => Promise<void>;
  readonly onMoveToSection: (routineSectionId: string) => Promise<void>;
  readonly onDone: (done: boolean) => Promise<void>;
}) {
  function selectAssignment(event: ChangeEvent<HTMLSelectElement>) {
    const [figureId, figureVariantId] = event.target.value.split(':');
    if (!figureId) return;
    void onAssign(figureId, figureVariantId || null);
  }

  async function submitInline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await onCreateInline(String(form.get('inlineFigureName') ?? ''));
    formElement.reset();
  }

  const selectedValue = routineFigure.figureId
    ? `${routineFigure.figureId}:${routineFigure.figureVariantId ?? ''}`
    : '';
  return (
    <li className={selected ? styles.routineFigureSelected : styles.routineFigure}>
      <button
        type="button"
        className={styles.occurrenceTitle}
        aria-expanded={selected}
        onClick={onSelect}
      >
        <span className={styles.occurrenceNumber}>{displayPosition}</span>
        <span className={styles.occurrenceDetails}>
          <strong>{routineFigure.figureName ?? `Figura ${displayPosition} — nevybraná`}</strong>
          {routineFigure.figureVariantName && <small>{routineFigure.figureVariantName}</small>}
        </span>
        <span className={styles.doneState}>{routineFigure.done ? 'Hotovo' : 'Rozpracováno'}</span>
      </button>
      {editable && selected && (
        <div className={styles.routineFigureControls}>
          <label>
            Část sestavy
            <select
              value={routineFigure.sectionId}
              disabled={saving || allSections.length < 2}
              onChange={(event) => void onMoveToSection(event.target.value)}
            >
              {allSections.map((routineSection) => (
                <option key={routineSection.id} value={routineSection.id}>
                  {routineSection.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Existující figura nebo varianta
            <select value={selectedValue} disabled={saving} onChange={selectAssignment}>
              <option value="">Vyberte…</option>
              {figures.map((figure) => (
                <optgroup key={figure.id} label={figure.name}>
                  <option value={`${figure.id}:`}>Pouze figura</option>
                  {figure.variants.map((variant) => (
                    <option key={variant.id} value={`${figure.id}:${variant.id}`}>
                      {variant.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <form className={styles.inlineForm} onSubmit={(event) => void submitInline(event)}>
            <label>
              Nová figura
              <input
                name="inlineFigureName"
                required
                maxLength={200}
                placeholder="Název nové figury"
              />
            </label>
            <button type="submit" disabled={saving}>
              Vytvořit a přiřadit
            </button>
          </form>
          <div className={styles.occurrenceActions}>
            <button type="button" disabled={saving || index === 0} onClick={() => void onMoveUp()}>
              Nahoru
            </button>
            <button
              type="button"
              disabled={saving || index === total - 1}
              onClick={() => void onMoveDown()}
            >
              Dolů
            </button>
            <label>
              <input
                type="checkbox"
                checked={routineFigure.done}
                disabled={saving}
                onChange={(event) => void onDone(event.target.checked)}
              />{' '}
              Hotovo
            </label>
          </div>
        </div>
      )}
    </li>
  );
}

function FigureLibrary({ figures }: { readonly figures: DanceNotebook['figures'] }) {
  if (figures.length === 0) return <p className={styles.muted}>Zatím žádné figury.</p>;
  return (
    <ul className={styles.figureLibrary}>
      {figures.map((figure) => (
        <li key={figure.id}>
          <strong>{figure.name}</strong>
          <small>{figure.variants.map((variant) => variant.name).join(', ')}</small>
        </li>
      ))}
    </ul>
  );
}

function ProfileButton({
  active,
  children,
  onClick,
}: {
  readonly active: boolean;
  readonly children: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? styles.profileActive : undefined}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DanceNavigation({
  title,
  dances,
  selectedDanceId,
  onSelect,
}: {
  readonly title: string;
  readonly dances: readonly Dance[];
  readonly selectedDanceId: string | null;
  readonly onSelect: (danceId: string) => void;
}) {
  return (
    <section className={styles.danceColumn}>
      <h2>{title}</h2>
      <ul>
        {dances.map((dance) => (
          <li key={dance.id}>
            <button
              type="button"
              className={dance.id === selectedDanceId ? styles.navigationActive : undefined}
              onClick={() => onSelect(dance.id)}
            >
              {danceLabels[dance.code]}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
