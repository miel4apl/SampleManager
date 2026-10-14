# Sample Manager iOS PWA 5.1

Minimalistyczna progresywna aplikacja webowa (PWA) przygotowana do dodania do ekranu początkowego iPhone'a. Zachowuje generator paczek v5.0, inteligentne tagowanie, analizę audio oraz eksport ZIP.

## Ważne ograniczenie iOS

PWA na iPhonie **nie może swobodnie skanować całego dysku ani zapamiętać dowolnego folderu z aplikacji Pliki tak jak aplikacja desktopowa Windows**. W tej wersji wybierasz pliki w systemowym selektorze Pliki i importujesz je do lokalnej bazy przeglądarki (IndexedDB). Wybór całego folderu zależy od wersji Safari i zwykle nie jest dostępny tak niezawodnie jak na komputerze. Po imporcie aplikacja korzysta z lokalnych kopii audio w swojej bazie.

Dane pozostają na iPhonie; aplikacja nie wysyła sampli do serwera. Usunięcie danych witryny lub odinstalowanie PWA może usunąć lokalną bibliotekę, dlatego ważne paczki eksportuj do ZIP.

## Uruchomienie do testów na komputerze

1. Zainstaluj Node.js LTS.
2. Rozpakuj ZIP i otwórz folder `sample-manager-ios-pwa` w VS Code.
3. W terminalu uruchom `npm install`, a następnie `npm run dev`.
4. Na komputerze otwórz adres wyświetlony przez Vite. Do testów z iPhone'a komputer i iPhone muszą być w tej samej sieci Wi-Fi; użyj adresu LAN wyświetlonego/udostępnionego przez Vite, a nie `localhost` na iPhonie.

Adres HTTP z lokalnej sieci może nie zapewniać wszystkich funkcji PWA w Safari. Service worker i instalacja PWA wymagają HTTPS, z wyjątkiem localhost. Do właściwej instalacji opublikuj zbudowaną aplikację na hostingu obsługującym HTTPS.

## Publikacja na HTTPS

1. W terminalu wykonaj `npm install`.
2. Wykonaj `npm run build`.
3. Opublikuj zawartość folderu `dist` na hostingu statycznym z HTTPS (np. własny hosting obsługujący statyczne strony).
4. Otwórz adres tej strony w Safari na iPhonie.
5. Stuknij **Udostępnij → Dodaj do ekranu początkowego**. Jeśli pojawi się opcja otwierania jako aplikacja internetowa, pozostaw ją włączoną.
6. Uruchamiaj Sample Manager z ikony na ekranie początkowym.

## Funkcje zachowane

- Import plików audio z systemowego selektora Pliki.
- Biblioteka lokalna w IndexedDB, wyszukiwanie, kategorie, tagi i ulubione.
- Generator z wieloma stylami i rodzajami paczek oraz rankingiem dopasowania.
- Tagowanie na podstawie nazw plików i ścieżek dostępnych podczas importu; ręczna edycja i odświeżanie tagów.
- Lokalna estymacja BPM, tonacji, rytmu i dominującego akordu z ograniczeniami opisanymi w aplikacji.
- Eksport wygenerowanej paczki ZIP z `manifest.json`.
- Manifest PWA, ikony i obsługa instalacji na ekranie początkowym iPhone'a.

## Prywatność i trwałość

Całe przetwarzanie odbywa się w przeglądarce. Nie ma konta, backendu ani synchronizacji między urządzeniami. iOS może zarządzać pamięcią witryn; nie traktuj IndexedDB jako jedynej kopii zapasowej.
