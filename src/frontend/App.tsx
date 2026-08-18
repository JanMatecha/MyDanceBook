import { useEffect, useState } from 'react';

import { getHealth, type HealthResponse } from './api/health';
import styles from './App.module.css';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: HealthResponse }
  | { kind: 'unavailable' };

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((value) => setHealth({ kind: 'ready', value }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHealth({ kind: 'unavailable' });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="app-title">
        <p className={styles.eyebrow}>Osobní taneční zápisník</p>
        <h1 id="app-title">MyDanceBook</h1>
        <p className={styles.subtitle}>Standardní a latinskoamerické tance</p>
        <p className={styles.foundation}>
          Technický základ zápisníku je připraven. Taneční obsah přijde v dalších etapách.
        </p>
        <div className={styles.status} aria-live="polite">
          <span
            className={health.kind === 'ready' ? styles.statusReady : styles.statusPending}
            aria-hidden="true"
          />
          {health.kind === 'loading' && 'Ověřuji službu…'}
          {health.kind === 'unavailable' && 'Služba momentálně neodpovídá.'}
          {health.kind === 'ready' &&
            `Služba je připravena · databáze v${health.value.database.migrationVersion}`}
        </div>
      </section>
    </main>
  );
}
