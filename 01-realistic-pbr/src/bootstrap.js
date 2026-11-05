/* A classic script stays available even when the ES module graph cannot load. */
(() => {
  'use strict';
  const status = document.getElementById('boot');
  const start = document.getElementById('begin');
  const retry = document.getElementById('bootRetry');
  const source = new URL('./main.js', document.currentScript.src);
  const boot = window.__labBoot = { state: 'loading', error: null };
  let watchdog;

  const fail = (message) => {
    if (boot.state === 'ready') return;
    clearTimeout(watchdog);
    boot.state = 'error';
    boot.error = message;
    start.disabled = true;
    status.textContent = message;
    status.setAttribute('role', 'alert');
    retry.hidden = false;
  };

  retry.addEventListener('click', () => location.reload());
  if (location.protocol === 'file:') {
    fail('Otworzono plik bez serwera (file://). Zamknij tę kartę, uruchom start.bat (Windows) lub start.sh (Linux/macOS), a potem otwórz http://127.0.0.1:8000. Bezpośrednie otwieranie index.html blokuje moduły ES.');
    return;
  }
  if (!HTMLScriptElement.supports?.('importmap')) {
    fail('Ta przeglądarka nie obsługuje importmap. Otwórz grę w aktualnym Chrome, Firefox lub Edge na komputerze.');
    return;
  }

  status.textContent = 'Przygotowanie lokalnego silnika 3D… Biblioteki są w paczce; Internet nie jest potrzebny.';
  watchdog = setTimeout(() => {
    fail('Uruchamianie trwa ponad 30 sekund. Sprawdź, czy rozpakowano CAŁY ZIP i czy serwer otwarto z właściwego katalogu. Nie otwieraj gry w podglądzie ZIP ani przez file://. Odśwież stronę; szczegóły błędu są w konsoli F12.');
  }, 30000);

  import(source.href).then(() => {
    clearTimeout(watchdog);
    if (!window.lab) throw new Error('Silnik nie utworzył sceny.');
    boot.state = 'ready';
    boot.error = null;
    retry.hidden = true;
    status.removeAttribute('role');
    start.disabled = false;
    status.textContent = 'Gotowe — silnik działa lokalnie, również bez Internetu. Kliknij, aby rozpocząć (około 3–5 minut).';
  }).catch((error) => {
    console.error('Engine startup failed:', error);
    const detail = error?.message || String(error);
    fail('Nie udało się uruchomić gry: ' + detail + '. Rozpakuj pełną paczkę i uruchom start.bat/start.sh. Folder vendor/three musi znajdować się obok index.html. Jeśli problem dotyczy WebGL, włącz akcelerację sprzętową w przeglądarce.');
  });
})();
