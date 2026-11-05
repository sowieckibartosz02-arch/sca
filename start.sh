#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  LAB_PYTHON=python3
elif command -v python >/dev/null 2>&1 && python -c 'import sys; assert sys.version_info.major == 3' >/dev/null 2>&1; then
  LAB_PYTHON=python
else
  echo "Brak Python 3. Zainstaluj Python 3 i uruchom ten skrypt ponownie."
  exit 1
fi
LAB_PORT="${PORT:-8000}"
echo "Otworz w przegladarce: http://127.0.0.1:$LAB_PORT"
echo "Nie otwieraj index.html przez file://. Zatrzymanie serwera: Ctrl+C."
exec "$LAB_PYTHON" -m http.server "$LAB_PORT" --bind 127.0.0.1
