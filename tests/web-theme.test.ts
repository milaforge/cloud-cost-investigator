import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function theme(saved: string | null = null, blocked = false) {
  const events: Record<string, (event?: { key: string | null }) => void> = {};
  let content = 'light dark';
  const control = {
    value: '',
    addEventListener: (name: string, callback: () => void) => {
      events[name] = callback;
    },
  };
  const storage = {
    getItem: () => {
      if (blocked) throw new Error('Storage blocked');
      return saved;
    },
    setItem: (_key: string, value: string) => {
      if (blocked) throw new Error('Storage blocked');
      saved = value;
    },
    removeItem: () => {
      if (blocked) throw new Error('Storage blocked');
      saved = null;
    },
  };
  vm.runInNewContext(
    readFileSync(new URL('../src/web/theme.js', import.meta.url), 'utf8'),
    {
      document: {
        getElementById: (id: string) =>
          id === 'theme'
            ? control
            : {
                setAttribute: (_key: string, value: string) =>
                  (content = value),
              },
        addEventListener: (name: string, callback: () => void) => {
          events[name] = callback;
        },
      },
      window: {
        addEventListener: (name: string, callback: typeof events.storage) => {
          events[name] = callback;
        },
      },
      localStorage: storage,
    },
  );
  events.DOMContentLoaded();
  return {
    read: () => ({ content, saved, selected: control.value }),
    select: (value: string) => {
      control.value = value;
      events.change();
    },
    external: (value: string | null) => {
      saved = value;
      events.storage({ key: 'cci-appearance' });
    },
  };
}

test('appearance defaults to system and persists explicit choices until reset', () => {
  const p = theme();
  assert.equal(p.read().content, 'light dark');
  for (const value of ['dark', 'light']) {
    p.select(value);
    assert.deepEqual(p.read(), {
      content: value,
      selected: value,
      saved: value,
    });
  }
  p.select('system');
  assert.deepEqual(p.read(), {
    content: 'light dark',
    selected: 'system',
    saved: null,
  });
});

test('appearance restores saved preferences before DOM ready and syncs across tabs', () => {
  const p = theme('dark');
  assert.equal(p.read().content, 'dark');
  p.external('light');
  assert.equal(p.read().selected, 'light');
  p.external(null);
  assert.equal(p.read().content, 'light dark');
});

test('blocked storage still permits theme changes', () => {
  const p = theme(null, true);
  p.select('dark');
  assert.equal(p.read().content, 'dark');
  p.select('system');
  assert.equal(p.read().content, 'light dark');
});

test('unknown stored appearance falls back to the system scheme', () => {
  assert.equal(theme('invalid').read().content, 'light dark');
});
