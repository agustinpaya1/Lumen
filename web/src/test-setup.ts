/**
 * Global test setup.
 *
 * The runner executes specs in a jsdom environment whose `localStorage` is not
 * available (Node reports it needs `--localstorage-file`). Without a Storage
 * implementation every service silently takes its "storage unavailable"
 * fallback branch, which makes persistence untestable and hides real defects.
 *
 * This installs a spec-compliant in-memory Storage so tests exercise the same
 * code path a real browser does.
 */
class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }
}

function install(name: 'localStorage' | 'sessionStorage'): void {
  const storage = new InMemoryStorage();
  // Defined on both globalThis and window so `typeof localStorage` guards and
  // `window.localStorage` access resolve to the same instance.
  Object.defineProperty(globalThis, name, {
    value: storage,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
  }
}

install('localStorage');
install('sessionStorage');
