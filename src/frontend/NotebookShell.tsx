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
  removeRoutineFigure,
  updateFigureNames,
  updateFigureVariantTiming,
  renameRoutineSection,
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
import {
  loadActiveProfile,
  loadFigureNameLanguage,
  saveActiveProfile,
  saveFigureNameLanguage,
  type ActiveProfile,
} from './profile';
import {
  displayFigureName,
  displayFigureNames,
  isImplicitDefaultVariant,
  type FigureNameLanguage,
} from './figure-display';
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
  const [figureNameLanguage, setFigureNameLanguage] =
    useState<FigureNameLanguage>(loadFigureNameLanguage);
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
  const selectedFigure =
    notebook?.figures.find((figure) => figure.id === selectedRoutineFigure?.figureId) ?? null;
  const selectedEffectiveVariant = selectedRoutineFigure?.figureVariantId
    ? (selectedFigure?.variants.find(
        (variant) => variant.id === selectedRoutineFigure.figureVariantId,
      ) ?? null)
    : selectedFigure?.variants.length === 1
      ? (selectedFigure.variants[0] ?? null)
      : null;

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

  function selectFigureNameLanguage(language: FigureNameLanguage) {
    setFigureNameLanguage(language);
    saveFigureNameLanguage(language);
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
    const names = readFigureNames(form, 'figure');
    await runChange(async () => {
      await createFigure(selectedDanceId, names);
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

  async function submitCentralFigureNames(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const figureId = selectedRoutineFigure?.figureId;
    if (!editable || !figureId) return;
    const names = readFigureNames(new FormData(event.currentTarget), 'centralFigure');
    await runChange(
      () => updateFigureNames(figureId, names).then(() => undefined),
      'Názvy sdílené figury jsou uložené ve všech jejích použitích.',
    );
  }

  async function submitVariantTiming(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const variantId = selectedEffectiveVariant?.id;
    if (!editable || !variantId) return;
    const timingNotation = String(new FormData(event.currentTarget).get('timingNotation') ?? '');
    await runChange(
      () => updateFigureVariantTiming(variantId, timingNotation).then(() => undefined),
      'Doby / timing sdílené varianty jsou uložené ve všech jejích použitích.',
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
              <div className={styles.figureLanguageSwitcher} aria-label="Názvy figur">
                <span>Názvy figur:</span>
                <ProfileButton
                  active={figureNameLanguage === 'cs'}
                  onClick={() => selectFigureNameLanguage('cs')}
                >
                  Česky
                </ProfileButton>
                <ProfileButton
                  active={figureNameLanguage === 'en'}
                  onClick={() => selectFigureNameLanguage('en')}
                >
                  English
                </ProfileButton>
              </div>
              {!editable && (
                <p className={styles.readOnlyNotice}>Host může zápisník pouze prohlížet.</p>
              )}

              {!selectedRoutine && (
                <div className={styles.capturePanels}>
                  <section className={styles.capturePanel}>
                    <h3>Nová figura</h3>
                    <p>Stačí český nebo anglický název. Výchozí varianta vznikne automaticky.</p>
                    {editable && (
                      <form
                        className={styles.inlineForm}
                        onSubmit={(event) => void submitFigure(event)}
                      >
                        <label>
                          Český název
                          <input name="figureNameCs" maxLength={200} />
                        </label>
                        <label>
                          English name
                          <input name="figureNameEn" maxLength={200} />
                        </label>
                        <button type="submit" disabled={saving}>
                          Vytvořit figuru
                        </button>
                      </form>
                    )}
                    <FigureLibrary figures={notebook.figures} language={figureNameLanguage} />
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
                        figureNameLanguage={figureNameLanguage}
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
                        onSelect={(routineFigureId) =>
                          setSelectedRoutineFigureId((current) =>
                            current === routineFigureId ? null : routineFigureId,
                          )
                        }
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
                        onCreateInline={(routineFigureId, names) =>
                          runChange(
                            () => createFigureForRoutineFigure(routineFigureId, names),
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
                        onRemove={(routineFigureId) => {
                          if (
                            !window.confirm(
                              'Odebrat tuto figuru ze sestavy? Sdílená definice figury zůstane zachována.',
                            )
                          ) {
                            return;
                          }
                          void runChange(async () => {
                            await removeRoutineFigure(routineFigureId);
                            setSelectedRoutineFigureId(null);
                          }, 'Figura byla odebraná ze sestavy.');
                        }}
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
            {selectedRoutineFigure?.figureNameCs || selectedRoutineFigure?.figureNameEn ? (
              <>
                <p>Sdílená definice – změny se projeví ve všech použitích.</p>
                <FigureNames
                  figure={{
                    nameCs: selectedRoutineFigure.figureNameCs,
                    nameEn: selectedRoutineFigure.figureNameEn,
                  }}
                  language={figureNameLanguage}
                />
                <small>
                  {selectedRoutineFigure.figureVariantName &&
                  !isImplicitDefaultVariant(selectedRoutineFigure.figureVariantName)
                    ? selectedRoutineFigure.figureVariantName
                    : selectedEffectiveVariant
                      ? null
                      : 'Varianta zatím není vybraná.'}
                </small>
                {editable && (
                  <form
                    key={`${selectedRoutineFigure.figureId}:${selectedRoutineFigure.figureNameCs}:${selectedRoutineFigure.figureNameEn}`}
                    className={styles.inlineForm}
                    onSubmit={(event) => void submitCentralFigureNames(event)}
                  >
                    <label>
                      Český název
                      <input
                        name="centralFigureNameCs"
                        maxLength={200}
                        defaultValue={selectedRoutineFigure.figureNameCs ?? ''}
                      />
                    </label>
                    <label>
                      English name
                      <input
                        name="centralFigureNameEn"
                        maxLength={200}
                        defaultValue={selectedRoutineFigure.figureNameEn ?? ''}
                      />
                    </label>
                    <button type="submit" disabled={saving}>
                      Uložit názvy figury
                    </button>
                  </form>
                )}
                {selectedEffectiveVariant && editable ? (
                  <form
                    className={styles.inlineForm}
                    onSubmit={(event) => void submitVariantTiming(event)}
                  >
                    <label>
                      Doby / timing
                      <input
                        name="timingNotation"
                        maxLength={200}
                        placeholder="např. 1 2 3 nebo 1 – 2 & 3"
                        defaultValue={selectedEffectiveVariant.timingNotation ?? ''}
                      />
                    </label>
                    <button type="submit" disabled={saving}>
                      Uložit timing
                    </button>
                    <small>Sdílená varianta – změna se projeví ve všech jejích použitích.</small>
                  </form>
                ) : selectedFigure && selectedFigure.variants.length > 1 ? (
                  <p>Pro zadání dob / timingu vyberte variantu figury.</p>
                ) : null}
              </>
            ) : (
              <p>Vyberte výskyt a přiřaďte mu figuru nebo vytvořte novou přímo v sestavě.</p>
            )}
          </section>
          <section className={styles.scopePanel}>
            <h2>Tento výskyt v sestavě</h2>
            {selectedRoutineFigure ? (
              <p>
                Číslo {selectedRoutineFigureEntry?.displayPosition}
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
  figureNameLanguage,
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
  onRemove,
}: {
  readonly routineSection: RoutineSection;
  readonly sectionIndex: number;
  readonly totalSections: number;
  readonly allSections: readonly RoutineSection[];
  readonly figures: DanceNotebook['figures'];
  readonly figureNameLanguage: FigureNameLanguage;
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
  readonly onCreateInline: (
    routineFigureId: string,
    names: { readonly nameCs: string | null; readonly nameEn: string | null },
  ) => Promise<void>;
  readonly onMoveFigure: (
    routineFigureId: string,
    beforeRoutineFigureId: string | null,
  ) => Promise<void>;
  readonly onMoveToSection: (routineFigureId: string, routineSectionId: string) => Promise<void>;
  readonly onRemove: (routineFigureId: string) => void;
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
              figureNameLanguage={figureNameLanguage}
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
              onRemove={() => onRemove(routineFigure.id)}
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
  figureNameLanguage,
  editable,
  saving,
  selected,
  onSelect,
  onAssign,
  onCreateInline,
  onMoveUp,
  onMoveDown,
  onMoveToSection,
  onRemove,
}: {
  readonly routineFigure: RoutineFigure;
  readonly displayPosition: number;
  readonly index: number;
  readonly total: number;
  readonly allSections: readonly RoutineSection[];
  readonly figures: DanceNotebook['figures'];
  readonly figureNameLanguage: FigureNameLanguage;
  readonly editable: boolean;
  readonly saving: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onAssign: (figureId: string, figureVariantId: string | null) => Promise<void>;
  readonly onCreateInline: (names: {
    readonly nameCs: string | null;
    readonly nameEn: string | null;
  }) => Promise<void>;
  readonly onMoveUp: () => Promise<void>;
  readonly onMoveDown: () => Promise<void>;
  readonly onMoveToSection: (routineSectionId: string) => Promise<void>;
  readonly onRemove: () => void;
}) {
  const [showQuickCreate, setShowQuickCreate] = useState(!routineFigure.figureId);
  const selectedFigure = figures.find((figure) => figure.id === routineFigure.figureId) ?? null;
  const variants = selectedFigure?.variants ?? [];
  const effectiveVariant = routineFigure.figureVariantId
    ? (variants.find((variant) => variant.id === routineFigure.figureVariantId) ?? null)
    : variants.length === 1
      ? (variants[0] ?? null)
      : null;
  const showVariantSelector = variants.length > 1;

  function selectFigure(event: ChangeEvent<HTMLSelectElement>) {
    const figureId = event.target.value;
    if (!figureId) return;
    const figure = figures.find((item) => item.id === figureId);
    const onlyVariant = figure?.variants.length === 1 ? figure.variants[0] : null;
    setShowQuickCreate(false);
    void onAssign(figureId, onlyVariant?.id ?? null);
  }

  function selectVariant(event: ChangeEvent<HTMLSelectElement>) {
    if (!selectedFigure) return;
    void onAssign(selectedFigure.id, event.target.value || null);
  }

  async function submitInline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await onCreateInline(readFigureNames(form, 'inlineFigure'));
    formElement.reset();
    setShowQuickCreate(false);
  }

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
          {routineFigure.figureNameCs || routineFigure.figureNameEn ? (
            <FigureNames
              figure={{ nameCs: routineFigure.figureNameCs, nameEn: routineFigure.figureNameEn }}
              language={figureNameLanguage}
            />
          ) : (
            <strong>{`Figura ${displayPosition} — nevybraná`}</strong>
          )}
          {routineFigure.figureVariantName &&
            !isImplicitDefaultVariant(routineFigure.figureVariantName) && (
              <small>{routineFigure.figureVariantName}</small>
            )}
          {effectiveVariant?.timingNotation && <small>{effectiveVariant.timingNotation}</small>}
        </span>
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
            Figura
            <select value={routineFigure.figureId ?? ''} disabled={saving} onChange={selectFigure}>
              <option value="">Vyberte…</option>
              {figures.map((figure) => (
                <option key={figure.id} value={figure.id}>
                  {displayFigureName(figure, figureNameLanguage)}
                </option>
              ))}
            </select>
          </label>
          {showVariantSelector && selectedFigure && (
            <label>
              Varianta
              <select
                value={routineFigure.figureVariantId ?? ''}
                disabled={saving}
                onChange={selectVariant}
              >
                <option value="">Pouze figura</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!showQuickCreate && routineFigure.figureId && (
            <button type="button" disabled={saving} onClick={() => setShowQuickCreate(true)}>
              + Vytvořit novou figuru
            </button>
          )}
          {showQuickCreate && (
            <form className={styles.inlineForm} onSubmit={(event) => void submitInline(event)}>
              <h5>Nová figura</h5>
              <label>
                Český název
                <input
                  name="inlineFigureNameCs"
                  maxLength={200}
                  placeholder="Název nové figury v češtině"
                />
              </label>
              <label>
                English name
                <input
                  name="inlineFigureNameEn"
                  maxLength={200}
                  placeholder="Figure name in English"
                />
              </label>
              <button type="submit" disabled={saving}>
                Vytvořit a přiřadit
              </button>
              {routineFigure.figureId && (
                <button type="button" disabled={saving} onClick={() => setShowQuickCreate(false)}>
                  Zrušit
                </button>
              )}
            </form>
          )}
          <button type="button" disabled={saving} onClick={onRemove}>
            Odebrat ze sestavy
          </button>
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
          </div>
        </div>
      )}
    </li>
  );
}

function FigureLibrary({
  figures,
  language,
}: {
  readonly figures: DanceNotebook['figures'];
  readonly language: FigureNameLanguage;
}) {
  if (figures.length === 0) return <p className={styles.muted}>Zatím žádné figury.</p>;
  return (
    <ul className={styles.figureLibrary}>
      {figures.map((figure) => (
        <li key={figure.id}>
          <FigureNames figure={figure} language={language} />
          {figure.variants.some((variant) => !isImplicitDefaultVariant(variant.name)) && (
            <small>
              {figure.variants
                .filter((variant) => !isImplicitDefaultVariant(variant.name))
                .map((variant) => variant.name)
                .join(', ')}
            </small>
          )}
        </li>
      ))}
    </ul>
  );
}

function readFigureNames(
  form: FormData,
  prefix: string,
): { nameCs: string | null; nameEn: string | null } {
  return {
    nameCs: String(form.get(`${prefix}NameCs`) ?? ''),
    nameEn: String(form.get(`${prefix}NameEn`) ?? ''),
  };
}

function FigureNames({
  figure,
  language,
}: {
  readonly figure: { readonly nameCs: string | null; readonly nameEn: string | null };
  readonly language: FigureNameLanguage;
}) {
  const names = displayFigureNames(figure, language);
  return (
    <span className={styles.figureNames}>
      <strong>{names.primary}</strong>
      {names.secondary && <small>{names.secondary}</small>}
    </span>
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
