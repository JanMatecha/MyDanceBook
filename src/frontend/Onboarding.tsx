import { type FormEvent, useState } from 'react';

import type { ReadyAppState } from './client/app-state';
import { initializePair } from './client/app-state';
import styles from './App.module.css';

export interface OnboardingProps {
  readonly onComplete: (state: ReadyAppState) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [leaderDisplayName, setLeaderDisplayName] = useState('');
  const [followerDisplayName, setFollowerDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onComplete(await initializePair({ leaderDisplayName, followerDisplayName }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Pár se nepodařilo vytvořit.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.onboardingPage}>
      <section className={styles.onboardingCard} aria-labelledby="onboarding-title">
        <p className={styles.eyebrow}>Osobní taneční zápisník</p>
        <h1 id="onboarding-title">Vytvořte společný zápisník</h1>
        <p className={styles.intro}>
          Na začátek stačí dvě jména. Další taneční informace můžete doplnit později.
        </p>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <label>
            Jméno leadera
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={leaderDisplayName}
              onChange={(event) => setLeaderDisplayName(event.target.value)}
            />
          </label>
          <label>
            Jméno followera
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={followerDisplayName}
              onChange={(event) => setFollowerDisplayName(event.target.value)}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Vytvářím zápisník…' : 'Začít používat MyDanceBook'}
          </button>
        </form>
      </section>
    </main>
  );
}
