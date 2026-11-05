# 01 — The Last Tenant / PBR

## Start

Python 3, desktop Chrome/Firefox/Edge z WebGL2 i akceleracją sprzętową. Internet nie jest wymagany. Uruchom `./start.sh` lub `start.bat` w tym katalogu i otwórz lokalny serwer na porcie 8000. Nie potrzeba npm ani buildu. Importmap wskazuje dołączone pliki Three.js 0.170.0 oraz oficjalne addons w `vendor/three`. Licencja i manifest hashy są w tym samym katalogu. Katalog jest samodzielny i nie importuje niczego z sąsiednich silników.

## Architektura

```text
HTML UI → main.js [menu / play / pause / test / end]
             ├─ Input [keyboard, mouse, gamepad]
             ├─ Story [named events → delayed actions]
             ├─ World → Materials [room kit, props, collision, glTF]
             ├─ Sound [Web Audio, HRTF, room impulse]
             ├─ Meta [visits, clock, focus, title, favicon]
             └─ View [RenderPass → SSAOPass (normal/depth) → UnrealBloomPass → lens / grain / grading → OutputPass → FXAA]
```

```text
index.html       click-to-start, settings, test room, console
style.css        native-resolution responsive overlay
start.sh/.bat    Python static server
src/bootstrap.js start offline, diagnoza file:// i błędów importów
src/decor.js     szczegółowe proceduralne wyposażenie i statyczne paczki geometrii
vendor/three/   przypięta biblioteka i MIT LICENSE
src/main.js      fixed 60 Hz simulation, state machine, progression, save/load
src/render.js    rendering graph, lights, shadows, fog, adaptive resolution hooks
src/world.js     modular room kit, colliders, procedural props, GLTFLoader fallback
src/materials.js generated albedo/normal/roughness and material cache
src/input.js     input lifecycle and gamepad dead zone
src/events.js    one-shot sequencer with simulation-time delays
src/audio.js     procedural audio, convolution reverb, spatial whispers
src/meta.js      browser-native memory and in-page illusions
```

Materiały PBR używają generowanych map normal/roughness/albedo, metalness i tonemappingu ACES. SSAO wyprowadza cienie kontaktowe z normalnych i głębi. Latarka rzuca cień i korzysta z proceduralnej tekstury cookie.

## Jak dodać pomieszczenie

W `World.rooms` dodaj `{id,x,z,w,d,volume}`, wywołaj `room()` podczas budowania. Aktualny zestaw zakłada pokoje po obu stronach korytarza, nie dowolny graf ścian. Uzupełnij pasy ścian korytarza w `build()`; `blocked()` korzysta z tych samych brył i granic. Poza tym układem rozszerz kontrakt kolizji. Wysokość oczu jest stała; brak skoków i schodów.

## Jak dodać obiekt

`world.box(w,h,d,x,y,z,kind,color,solid)` rejestruje geometrię do zwolnienia, używa cache materiałów i opcjonalnej kolizji AABB. Dodaj obiekt do `world.objects`, obsłuż jego identyfikator w `interact()` oraz tekście podpowiedzi. Promień interakcji wynosi 2.3 m i wymaga skierowania kamery na obiekt. Promień postaci 0.2 m. Interakcje nie wykonują pełnego raycastu zasłonięcia; nie stawiaj interaktywnych obiektów tuż za cienkimi ścianami.

`await world.loadProp('./models/radio.glb', 'radio')` korzysta z oficjalnego GLTFLoader. Brak pliku, nieznany identyfikator albo błąd parsowania zachowują proceduralny model; nowe zasoby są zwalniane przy zamknięciu. Demo nie odwołuje się do nieistniejącego modelu podczas startu. Modele powinny być lokalnymi GLB bez zewnętrznych tekstur i bez wymaganych dekoderów Draco/KTX2; kolizję i skalę przygotuj samodzielnie. Interaktywna kotwica pozostaje proceduralna.

## Jak dodać zdarzenie

```js
story.when('storage').then(() => notify('A sound behind the wall.'))
  .then(() => flicker(2), 1.5);
// Room entry automatically emits its id, or call story.emit('storage').
```

Reguły są jednokrotne; opóźnienia są względne względem poprzedniego kroku i działają w czasie symulacji. Save/load zapisuje identyfikatory wyzwolonych zdarzeń; oczekujące dowolne closures nie są serializowane. Demo jawnie odtwarza opóźnione wspomnienie sypialni. Dodając własne opóźnienia, zapisz też ich semantyczny stan i odbuduj kolejkę przy odczycie.

## Demo i narzędzia

WASD, mysz, E, F; Shift bieg. Najpierw radio w salonie (lewo), potem klucz w gabinecie (prawo), sypialnia (lewo, dalej korytarzem), 18 s oczekiwania na wspomnienie, sygnał po 180 s aktywnego czasu i powrót do przełącznika wejścia. Radio zmniejsza lęk i regeneruje baterię. Ciemność prowadzi do porażki przy 100% lęku. Po uruchomieniu następuje automatyczny zapis liczby wizyt, ale stan rozgrywki zapisujesz F5, odczytujesz F9.

F3 pokazuje FPS, sumę draw calls i trójkątów z przebiegów, liczbę obiektów root, stan i skalę. T przełącza sandbox w tej samej mapie: fabuła zatrzymana, po wyjściu wraca postęp i pozycja. Parametry graficzne pozostają. Aby chodzić w sandboxie, kliknij scenę; po Esc panel pozwala zmieniać mgłę, światła, post-FX, cienie, lęk i przywoływać postać. Konsola ` przyjmuje `help`, `emit hall`, `fear 70`, `spawn`, `flicker`, `loading`, `crash`. Nie wykonuje arbitralnego JavaScript.

## Wydajność i granice

Render przy High / skala 100% używa pełnego devicePixelRatio. MSAA na rendererze plus końcowe FXAA; postprocessowane targety polegają na FXAA. Brak PSX, ditheringu i snappingu. Regulowana skala 50–100% jest świadomą opcją wydajnościową. Adaptacja ocenia klatki co 5 s i redukuje skalę przy <53 FPS, zwiększa przy >59 FPS do ustawionego maksimum. Minimum 50% nie gwarantuje 60 FPS. Tryb Low wyłącza SSAO i osłabia bloom; cienie to PCF soft 1024/2048 lub Off. Post-FX wyłącza artystyczne przebiegi; końcowe zarządzanie kolorem i FXAA pozostają.

FogExp2 oraz przestrzenne efekty sceny przybliżają atmosferę; usunięto stary stożek przypięty do kamery, który tworzył trójkątną zasłonę. Nie ma pełnej symulacji objętościowej, GI ani odbić ray tracing. SSAO i bloom są kosztowne; domyślne bryły i tekstury nie stanowią fotorealistycznego asset packa. Brak fizyki, navmesha, pionowego ruchu, edytora. Proceduralne kroki mają odmienne filtry i obwiednie dla drewna oraz płytek; szept to filtrowany szum, nie mowa. Halucynacja jest widoczna na obrzeżu pola widzenia i znika po spojrzeniu.

Pętla ma 60 Hz stały krok, maksymalnie sześć kroków nadrabiania. Brak interpolacji oznacza możliwą nierówność ruchu przy innych częstotliwościach monitora. Obiekty wektorowe są współdzielone w gorących obliczeniach. Audio jednorazowe alokuje węzły tylko przy zdarzeniach. `pagehide` zwalnia wejścia, meta-timery, audio, mapy cieni, passy, geometrie, materiały i tekstury. Powrót z bfcache wymaga odświeżenia, ponieważ kontekst został zwolniony.

## Start v2 i diagnostyka

Rozpakuj cały katalog wraz z vendor. Otwieranie index.html dwuklikiem jest rozpoznawane i pokazuje instrukcję uruchomienia serwera. Błędy importów mają widoczny opis i przycisk ponowienia. Jeżeli przeglądarka odmawia pointer lock, nadal działa chodzenie oraz rozglądanie przez przeciąganie myszą. Windows: skrypt szuka py -3, potem python, i nie zamyka komunikatu błędu.
