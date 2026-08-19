import { useEffect, useState } from 'react';

import { getAppState, type AppState, type ReadyAppState } from './client/app-state';
import styles from './App.module.css';
import { NotebookShell } from './NotebookShell';
import { Onboarding } from './Onboarding';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly value: AppState };

export function App() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getAppState(controller.signal)
      .then((value) => setState({ kind: 'ready', value }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setState({
          kind: 'error',
          message: cause instanceof Error ? cause.message : 'Aplikaci se nepodařilo načíst.',
        });
      });
    return () => controller.abort();
  }, []);

  if (state.kind === 'loading') {
    return <main className={styles.centeredState}>Načítám MyDanceBook…</main>;
  }
  if (state.kind === 'error') {
    return (
      <main className={styles.centeredState}>
        <h1>MyDanceBook nelze načíst</h1>
        <p>{state.message}</p>
      </main>
    );
  }
  if (state.value.status === 'needs_onboarding') {
    return <Onboarding onComplete={(value) => setState({ kind: 'ready', value })} />;
  }

  return (
    <NotebookShell
      state={state.value}
      onStateChange={(value: ReadyAppState) => setState({ kind: 'ready', value })}
    />
  );
}
