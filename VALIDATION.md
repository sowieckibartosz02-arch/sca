# Weryfikacja fazy 1

Stan: dwa działające, samodzielne prototypy; silniki 3–6 i opcjonalny 7 pozostają poza tą fazą.

## Wykonane sprawdzenia

- `python3 tools/check_project.py`: PASS — składnia `node --check` wszystkich 16 modułów, ścieżki lokalnych importów, plików HTML i powiązań DOM, przypięcie Three.js 0.170.0, limity ENGINE_API (po 90 linii).
- Test jednostkowy istniejącego sequencera Story: kolejność działań, opóźnienie, jednokrotność, odtworzenie fired events — PASS. W self-review poprawiono kolejność wielu zdarzeń gotowych w tej samej klatce.
- `python3 tools/browser_smoke.py`: PASS dla obu silników w Chromium 155, WebGL przez SwiftShader.
- Testy przeglądarkowe: start po kliknięciu, pointer lock, radio/klucz/drzwi przez E, trigger sypialni, zapis/odczyt, izolacja czasu i postępu sandboxa, przełączniki mgły/post-FX/cieni, lęk, halucynacja znikająca po spojrzeniu, błędny glTF → fallback oraz poprawny glTF → model, bramka końcowego sygnału, wygrana, pauza/wznowienie, ruch klawiaturą, F3 i przegrana.
- Testy końcowych shaderów z profilem High, devicePixelRatio 1.5 oraz uruchomienia AudioContext po geście — szczegóły w `artifacts/final-render-results.json`.
- Niezależne uruchomienie `start.sh` z każdego katalogu: HTTP 200 dla HTML oraz src/main.js na oddzielnych portach — PASS.
- Obejrzano zrzuty obu scen; zmniejszono artefakt stożka mgły, dodano geometryczną kreskę i przestrzenne smugi mgły w wersji painterly.

Test pełnej rozgrywki używa rzeczywistych interakcji, ale developer teleportuje postać między punktami. Opóźnienie wspomnienia przyspieszono przez scheduler, a bramkę 180 s sprawdzono od ustawienia czasu na 179.99 s do prawdziwej aktualizacji symulacji. To nie jest zapis ludzkiego, trzyminutowego przejścia. Scena nie jest modyfikowana na potrzeby produkcyjnego działania.

## Ograniczenia dowodów

Nie wykonano testów w Firefoksie, na Windows/start.bat ani fizycznym gamepadzie. Dźwięk sprawdzono przez działający AudioContext i brak błędów, bez subiektywnego odsłuchu. Programowy renderer środowiska nie pozwala ocenić docelowego FPS; 60 FPS pozostaje celem adaptacji, nie potwierdzonym wynikiem. Nie testowano przywrócenia środowiska w nowym zadaniu ani publikacji.

`artifacts/browser-results.json` zapisuje aktualne wyniki scenariuszy. PNG z sufiksem `-high` pokazują pełny pipeline w natywnej skali; pozostałe obrazy diagnostyczne powstały w Low dla przyspieszenia testów. Skrypty testowe są opcjonalnymi narzędziami developerskimi. Aplikacja nie wymaga Node.js ani Playwright.

## Znane kompromisy

Proceduralne wnętrze pozostaje prostym modelem, nie fotorealistyczną sceną. Cone shafts przybliżają wolumetrię; brak GI, fizyki, raycastu zasłonięcia interakcji i pełnego systemu serializacji dowolnych closures. Dwa projekty mają wspólny kontrakt gameplay i podobny kod rdzenia, ale odrębne materiały i pipeline renderowania. Szczegóły i ograniczenia są w README każdego silnika.
