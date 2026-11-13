'use strict';
/* Inline, versioned walkthrough to explain the deployed architecture. No external dependency. */
(() => {
  const button = document.getElementById('docsCopyLink');
  button?.addEventListener('click', async () => {
    const url = window.location.origin + window.location.pathname + '#readme';
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = 'Copied!';
    } catch {
      button.textContent = 'Use URL: #readme';
    }
    window.setTimeout(() => button.textContent = 'Copy section link', 2000);
  });
  // Hash deep linking is optional; leave existing tab navigation untouched.
  if (location.hash === '#readme' || location.hash === '#usage') {
    window.addEventListener('load', () => {
      document.querySelector('[data-workspace="' + location.hash.slice(1) + '"]')?.click();
    });
  }
})();