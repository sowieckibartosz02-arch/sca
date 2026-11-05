# Weryfikacja v2

Przygotowano dwa samodzielne silniki fazy 1, przebudowane wnętrza i uruchamianie bez zewnętrznych serwerów bibliotek. Silniki 3–6 nie należą do tego wydania.

## Start i odporność na awarie

`python3 tools/startup_smoke.py`: PASS dla obu silników. Cały ruch poza loopback został zablokowany; gry utworzyły sceny bez żądań do CDN i bez błędów JavaScript. Celowo brakujący main.js oraz wyjątek inicjalizacji dały widoczny komunikat i przycisk ponowienia w 0.075–0.231 s. Klasyczny bootstrap jest dostępny jeszcze przed importami ES; limit oczekiwania wynosi 30 s.

Rzeczywiste otwieranie file:// blokuje polityka zarządzanej przeglądarki testowej. Gałąź diagnostyczną wykonano niezmienionym bootstrapem z adapterem location=file:, bez omijania polityki. Nie jest to dowód uruchamiania modułów przez file://: taka ścieżka jest celowo odrzucana i użytkownik otrzymuje instrukcję uruchomienia serwera HTTP.

Three.js 0.170.0 pobrano z oficjalnej paczki npm z weryfikacją SHA-512; wybrany graf modułów i MIT LICENSE znajdują się w każdym katalogu vendor/three. Manifesty SHA-256 sprawdzają dokładne dołączone pliki. Skrypt vendor_three.py jest narzędziem utrzymaniowym; gra nie wymaga npm, pobierania paczek ani Internetu.

## Grywalność

`python3 tools/browser_smoke.py`: PASS dla obu silników — start po geście, pointer lock, radio, klucz, drzwi, trigger sypialni, zapis/odczyt, sandbox z przełącznikami, izolacja czasu/progresu, halucynacja znikająca po spojrzeniu, poprawny glTF i fallback przy uszkodzonym modelu, końcowy sygnał, wygrana, pauza/wznowienie, WASD, diagnostyka F3, porażka. Brak błędów strony i konsoli.

Scenariusz teleportuje postać między kotwicami i przyspiesza opóźnienie wspomnienia przez scheduler. Bramkę 180 s sprawdza od ustawienia czasu na 179.99 s do prawdziwej aktualizacji symulacji. To test logiki i interakcji, nie zapis ludzkiego przejścia przez trzy minuty. Kolizje i kotwice nie były zmieniane przy końcowym zmniejszeniu faz twardych powierzchni.

`python3 tools/controls_smoke.py`: PASS dla obu silników — po symulowanej odmowie AudioContext i pointer lock nadal działają gra, WASD, przeciąganie myszy, pauza i wznowienie.

Dodatkowy test Web Audio w Chromium: kontekst uruchamia się po kliknięciu, filtrowany szum zachowuje wybraną częstotliwość, płytki i drewno mają odmienne filtry/transjenty, dwie przestrzenne ścieżki szeptu, cache impulsów pogłosu działa, głosy jednorazowe są odłączane, dispose zamyka kontekst i zwalnia węzły. Nie wykonano subiektywnego odsłuchu.

## Grafika i kontrola źródeł

`python3 tools/render_smoke.py`: oba profile High renderują bez żądań zewnętrznych; uruchomienie audio potwierdzono stanem running. Osobny test DPR=1.5 potwierdza fizyczne 720 pikseli canvas przy szerokości CSS=480. Prawdziwe zrzuty są w docs/preview-pbr.jpg i docs/preview-painterly.jpg. Nie są to obrazy koncepcyjne. W tle testów używany jest programowy SwiftShader; wynik nie jest benchmarkiem docelowego GPU.

`python3 tools/check_project.py`: PASS — node --check wszystkich 20 modułów aplikacji, lokalne importy i pliki HTML, powiązania DOM, importmapy lokalne, limity ENGINE_API poniżej 120 linii, integralność dołączonych plików bibliotek. Składnia Python i sh również sprawdzona. Zaktualizowane start.sh uruchomiono niezależnie z katalogu głównego i obu katalogów silników: każde zwróciło HTTP 200.

## Powtarzalna paczka

`python3 tools/build_release.py` tworzy releases/afterimage-phase-1-v2.zip, sprawdza CRC oraz wymagane pliki vendor/bootstrap i aktualizuje starszy alias ZIP. Archiwum nie zawiera poprzednich archiwów, Git ani cache. Test z niezależnie rozpakowanej paczki jest zapisywany w artifacts/packaged-startup-results.json.

Bieżące raporty JSON znajdują się w artifacts. Nie oznaczają weryfikacji Firefoksa, Windows/start.bat ani fizycznego gamepada. Skrypty Windows mają detekcję Python 3, ale nie były uruchamiane na Windows. 60 FPS pozostaje celem jakości adaptacyjnej, nie gwarancją. Brak pełnego GI, fizyki i fizycznej wolumetrii; światło w mgle jest przybliżone. Wyposażenie zachowano, a fazy ścian i mebli zmniejszono do realistycznych wartości; zaokrąglenia dotyczą głównie obić.
