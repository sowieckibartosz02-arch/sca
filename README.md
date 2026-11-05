# AFTERIMAGE — laboratorium horroru 3D

Faza 1 z 4: dwa samodzielne projekty Three.js. Fazy 2–3 (portale, kamery filmowe, Rapier, teren) nie są jeszcze zaimplementowane. Opcjonalny WebGL2 zależy od wyników poprzednich faz.

## Uruchomienie

Wymagane: Python 3, aktualny desktopowy Chrome/Firefox z WebGL2 i dostęp do `cdn.jsdelivr.net`. Bez npm, bundlera i kompilacji. Three.js oraz oficjalne addons są przypięte do **0.170.0** w importmap. Wszystkie modele, tekstury i dźwięki demo powstają lokalnie; CDN dostarcza wyłącznie kod biblioteki.

Linux/macOS: `./start.sh` (ewentualnie `sh start.sh`). Windows: `start.bat`. Otwórz w przeglądarce `http://127.0.0.1:8000`. To lokalny adres serwera uruchomionego na Twoim komputerze. Każdy katalog silnika zawiera własne skrypty i może być skopiowany oraz uruchomiony osobno. Zmienna `PORT` zmienia port skryptu Unix. Serwer nie udostępnia plików w sieci LAN. Nie otwieraj przez `file://`.

Kliknij przycisk startowy; przeglądarka poprosi o przejęcie myszy. Esc uwalnia mysz i pauzuje. Dźwięk uruchamia się dopiero po geście użytkownika. Jeśli CDN jest niedostępny, ekran startowy pozostaje z informacją o ładowaniu; konsola przeglądarki pokaże błąd sieci.

## Sterowanie i przebieg

WASD / mysz, Shift bieg, E interakcja, F latarka, Esc ustawienia, F3 diagnostyka, T test room, klawisz ` konsola, F5 zapis, F9 odczyt. Gamepad: lewy drążek ruch, prawy kamera, A interakcja; kliknięcie nadal wymagane do pointer lock i audio.

Salon jest po lewej stronie korytarza, gabinet po prawej. Radio → klucz w gabinecie → zamknięta sypialnia po lewej na końcu → wspomnienie (18 s pobytu/czasu fabuły) → ostatni sygnał po 180 s aktywnej rozgrywki → przełącznik przy wejściu. Całość trwa zwykle 3–5 min, lecz sygnał celowo wymusza co najmniej 3 min. Radio uspokaja i regeneruje baterię; ciemność zwiększa lęk, 100% lęku kończy grę przegraną. Test room to odizolowany stan w tej samej mapie: przywraca postęp i pozycję po wyjściu, ale ustawienia obrazu pozostają wybrane przez użytkownika.

## Porównanie (wstępne, skala 1–5)

Oceny projektowe, nie pomiary GPU. Dla wydajności, łatwości, dopasowania i rozszerzalności 5 = najlepiej. Dla krzywej nauki 5 = najłatwiej. Dla rozmiaru 5 = najmniejszy koszt; źródła są małe, biblioteka CDN dominuje w transferze.

| Silnik | Obraz | Wydajność | Tworzenie treści | Psychologiczny horror | Rozszerzalność | Nauka | Rozmiar |
|---|---:|---:|---:|---:|---:|---:|---:|
| 01 PBR | 3 | 2 | 4 | 4 | 4 | 3 | 3 |
| 02 Painterly | 4 | 3 | 4 | 5 | 4 | 4 | 4 |

**01 PBR**: najlepszy punkt wyjścia do wnętrz i survivalu, gdy planujesz dodać dobre modele i mapy PBR. Normal/depth SSAO, bloom i cienie są kosztowne. Proceduralne bryły i małe tekstury nie dają fotorealizmu. Stożek światła jest artystyczną aproksymacją rozpraszania, nie fizycznym ray marchingiem ani objętościowym cieniem. Światło nie ma pełnego GI.

**02 Painterly**: lepszy wybór do psychologicznej opowieści i zagadek; ograniczona paleta i kreska spajają proste modele. Toon plus renderowane kontury to inna gałąź pipeline'u niż SSAO PBR, ale oba projekty świadomie powielają ten sam kontrakt gameplay, wejścia i audio, aby porównanie było uczciwe. To nie są dwa całkowicie niezależnie zaprojektowane rdzenie. Kontury zwiększają liczbę przebiegów i nie tworzą automatycznie wysokiej jakości rysunku. Mgła pozostaje analityczna, ale shader moduluje ją przestrzennymi smugami; szum papieru działa w postprocessie. To przybliżenie ilustracji, nie symulacja farby.

Do dużego survivalu potrzebna będzie fizyka (#5), do lasu streaming (#6), do filmowego horroru przełączane kamery (#4), do paradoksów przestrzeni portale (#3). Nie zalecam rozbudowy obecnej płaskiej kolizji do tych zastosowań.

## Struktura

```
index.html                  wybór projektu
start.sh / start.bat        serwer całego laboratorium
01-realistic-pbr/           samodzielny projekt
02-painterly/               samodzielny projekt
tools/                      testy developerskie (Python, bez zależności aplikacji)
```

Każdy silnik: `README.md`, `ENGINE_API.md`, własny HTML/CSS, skrypty startowe oraz `src/{main,render,world,materials,input,audio,events,meta}.js`.

## Weryfikacja i ograniczenia

Wyniki aktualnego uruchomienia znajdują się w `VALIDATION.md`. Testy developerskie mogą używać Playwright, ale aplikacja go nie wymaga. Nie ma żadnego buildu ani instalacji paczek. Zachowaj weryfikację TLS przy pobieraniu bibliotek. Repozytorium początkowo było puste; ta faza tworzy pierwszy projekt.

Nie ma multiplayera, navmesha, zapisu obiektów glTF, fizyki schodów ani edytora scen. FPS zależy od GPU, DPR i przeglądarki; adaptacja próbuje osiągnąć 60, nie gwarantuje tego. Progi i wygląd należy sprawdzić na docelowym sprzęcie. Filmowe i crash/loading efekty są wyłącznie fikcją wewnątrz strony. Zapis i pamięć wizyt są lokalne dla origin oraz silnika; przeglądarka może je blokować lub usuwać.
