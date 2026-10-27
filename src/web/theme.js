// Runs before styles paint; external script preserves the self-only CSP.
(() => {
  const key = 'cci-appearance';
  const meta = document.getElementById('color-scheme');
  const normalize = (value) =>
    value === 'light' || value === 'dark' ? value : 'system';
  let choice = 'system';
  const apply = (value) => {
    choice = normalize(value);
    meta.setAttribute('content', choice === 'system' ? 'light dark' : choice);
    const control = document.getElementById('theme');
    if (control) control.value = choice;
  };
  try {
    apply(localStorage.getItem(key));
  } catch {
    // Blocked browser storage must not prevent a session-only preference.
    apply('system');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.getElementById('theme');
    control.value = choice;
    control.addEventListener('change', () => {
      apply(control.value);
      try {
        if (choice === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, choice);
      } catch {
        // The selected scheme is already applied even without persistence.
      }
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      try {
        apply(localStorage.getItem(key));
      } catch {
        // Keep the current session preference if storage becomes inaccessible.
      }
    }
  });
})();
