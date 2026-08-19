import { type FormEvent, useMemo, useState } from 'react';

import {
  updatePairNames,
  type Dance,
  type DanceCode,
  type ReadyAppState,
} from './client/app-state';
import styles from './App.module.css';
import { loadActiveProfile, saveActiveProfile, type ActiveProfile } from './profile';

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

  function selectProfile(next: ActiveProfile) {
    setProfile(next);
    saveActiveProfile(next);
    setMessage(null);
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

      <main className={styles.content}>
        <section aria-labelledby="dance-navigation-title">
          <p className={styles.eyebrow}>Taneční knihovna</p>
          <h2 id="dance-navigation-title">Standardní a latinskoamerické tance</h2>
          <div className={styles.disciplines}>
            <DanceColumn title="Standardní tance" dances={standard} />
            <DanceColumn title="Latinskoamerické tance" dances={latin} />
          </div>
        </section>

        <aside className={styles.settings} aria-labelledby="pair-settings-title">
          <h2 id="pair-settings-title">Nastavení páru</h2>
          {profile.kind === 'host' ? (
            <p>Host může sdílený zápisník prohlížet, ale nemění jeho data.</p>
          ) : (
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
          )}
          {message && <p className={styles.message}>{message}</p>}
        </aside>
      </main>
    </div>
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

function DanceColumn({
  title,
  dances,
}: {
  readonly title: string;
  readonly dances: readonly Dance[];
}) {
  return (
    <section className={styles.danceColumn}>
      <h3>{title}</h3>
      <ol>
        {dances.map((dance) => (
          <li key={dance.id}>{danceLabels[dance.code]}</li>
        ))}
      </ol>
      <div className={styles.etudes}>
        <span>Etudy</span>
        <small>samostatný trénink</small>
      </div>
    </section>
  );
}
