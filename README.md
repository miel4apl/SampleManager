# Sample Manager — MVP 0.1

Początkowa wersja prywatnej biblioteki sampli dla iPhone'a. To aplikacja webowa PWA, nie natywna aplikacja App Store.

## Funkcje w tej wersji
- Import wielu plików audio przez selektor plików systemowych.
- Lokalny zapis plików audio w IndexedDB.
- Wyszukiwanie po nazwie, filtrowanie po kategorii, ulubione.
- Odsłuch, licznik plików i szacowanie zajętego miejsca.
- Podstawowa kategoryzacja na podstawie nazwy pliku.

## Wymagania
Zainstaluj Node.js w wersji LTS z https://nodejs.org/ oraz Visual Studio Code z https://code.visualstudio.com/.

## Uruchomienie na Windows
1. Rozpakuj archiwum.
2. Otwórz folder `sample-manager-mvp` w Visual Studio Code.
3. Wybierz Terminal → New Terminal.
4. Wpisz `npm install` i naciśnij Enter.
5. Wpisz `npm run dev -- --host 0.0.0.0`.
6. Otwórz adres podany przez Vite (zwykle `http://localhost:5173`) w przeglądarce komputera.

## Test na iPhonie
Telefon i komputer muszą być w tej samej sieci Wi-Fi. Vite pokaże adres sieciowy, np. `http://192.168.x.x:5173`. Otwórz go w Safari na iPhonie. Adres lokalny HTTP może nie udostępniać wszystkich funkcji PWA, a IndexedDB może działać inaczej niż w HTTPS. Do instalacji PWA na ekranie początkowym potrzebny będzie hosting HTTPS.

## Ważne ograniczenia
- PWA działa lokalnie, ale nie jest natywną aplikacją iOS ani aplikacją App Store.
- W Safari użyj przycisku Udostępnij → Dodaj do ekranu początkowego, gdy wersja HTTPS będzie wdrożona.
- Pliki audio są kopiowane do pamięci przeglądarki. Przeglądarka/system może usuwać dane przy presji pamięci; zrób eksport/kopię zapasową w kolejnej wersji.
- Nie ma jeszcze eksportu kopii zapasowej, edycji tagów, analizy BPM/tonacji ani obsługi dużych folderów jako jednego importu.
- Aplikacja nie ładuje żadnych sampli z internetu. Interfejs korzysta z czcionek systemowych, bez pobierania fontów z internetu.

## Następny krok
Po uruchomieniu lokalnie sprawdzimy interfejs, potem dodamy edycję kategorii/tagów oraz eksport/import kopii zapasowej.
