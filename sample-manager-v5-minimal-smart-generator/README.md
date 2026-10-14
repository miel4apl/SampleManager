# Sample Manager — wersja 5.0

Prywatna biblioteka sampli audio jako PWA. Projekt działa w przeglądarce i przechowuje audio lokalnie w IndexedDB; nie jest natywną aplikacją App Store.

## Nowości w wersji 5.0
- Generator obsługuje ponad 20 stylów: Deep/Progressive/Tech/Afro/Melodic House, kilka odmian Techno, Trance, Drum & Bass, UK Garage, Dubstep, Trap, Hip-Hop/Boom Bap, Lo-Fi, R&B/Soul, Synthwave, Ambient, Cinematic, Pop/Electronic i Rock/Industrial.
- 10 typów paczek: zrównoważona, perkusja, harmoniczna, loopy/frazy, one-shoty, bass/sub/808, wokale/acapella, FX/przejścia, tekstury/pady/drony oraz starter kit.
- Ranking rozpoznaje alternatywne tempo half-time/double-time, zgodność tonalną, dopasowanie stylu i premiuje różnorodność kategorii oraz folderów. Brakujące metadane mają neutralny wpływ.
- Inteligentne tagowanie rozpoznaje więcej synonimów instrumentów, cech produkcji, nastroju i stylów; dopisuje tagi z rozsądnych nazw folderów, format pliku i oznaczenia BPM/tonacji z nazwy.
- Minimalistyczny interfejs: kompaktowy nagłówek, uproszczone kontrolki i zwijane ustawienia zaawansowane.
- Nadal działa lokalnie; ocena stylu/tagów jest heurystyczna, więc nazwa pliku/folderu ma duży wpływ na wynik. Nie zastępuje ręcznej weryfikacji ani analizy odsłuchowej.

## Funkcje generatora z wersji 4
- Generator paczek z rankingiem sampli według docelowego BPM, tonacji, stylu muzycznego i rodzaju paczki.
- Starsze typy paczek pozostają dostępne; wersja 5 rozszerza wybór (lista powyżej).
- Wyniki zawierają punktację 0–100 i powody dopasowania; algorytm promuje różnorodność kategorii w paczce zrównoważonej.
- Eksport paczki do ZIP z plikami audio i `manifest.json` zawierającym metadane, tagi, wyniki analizy i punktację. ZIP jest tworzony lokalnie w przeglądarce bez dodatkowych bibliotek.
- Ranking korzysta z wyników analizy audio, jeśli są dostępne; w przeciwnym razie wykorzystuje BPM/tonację odczytane z nazwy i tagi. Brak danych nie jest traktowany jako potwierdzone dopasowanie.

## Nowości w wersji 3
- Analiza zawartości pliku audio bez wysyłania go do sieci.
- Estymacja BPM na podstawie autokorelacji obwiedni ataków/energii.
- Szacowanie tonacji przez analizę chromy (FFT) i porównanie profili tonalnych major/minor.
- Prosta klasyfikacja rytmu: regularny puls, rytm z synkopami/luźny albo wynik niepewny.
- Wyniki analizy są zapisywane w lokalnej bibliotece; ikoną fali przy samplu uruchomisz analizę ponownie.

## Funkcje zachowane z wersji 2
- Import wielu plików audio.
- Import całego folderu (przycisk „Dodaj folder”; przeglądarka musi obsługiwać wybór folderów).
- Inteligentne tagowanie heurystyczne na podstawie nazwy pliku i ścieżki folderu: typ sampla, loop/one-shot, cechy brzmienia, styl, stereo/mono i inne słowa kluczowe.
- Odczyt BPM i tonacji z nazwy pozostaje pomocniczym fallbackiem, dopóki nie uruchomisz analizy audio.
- Filtr kategorii i tagów oraz wyszukiwanie po nazwie, tagach, folderze, BPM i tonacji.
- Ręczna edycja tagów z poziomu biblioteki.
- Pokazywanie folderu źródłowego, czasu trwania, formatu, BPM i tonacji.
- Pasek statusu importu.

## Uruchomienie na Windows
1. Rozpakuj ZIP.
2. Otwórz folder `sample-manager-mvp` w VS Code.
3. Wybierz Terminal → New Terminal.
4. Wpisz `npm install` i poczekaj na koniec.
5. Wpisz `npm run dev`.
6. Otwórz adres podany przez Vite (zwykle `http://localhost:5173`).

## Test importu folderu
Kliknij „Dodaj folder”, wybierz folder zawierający sample i potwierdź wybór. Aplikacja przeszuka wybrane pliki, zaimportuje rozpoznane formaty audio i zachowa ścieżkę folderu w metadanych. Nieaudio zostaną pominięte. Najpierw przetestuj na małym folderze.

## Analiza audio — jak uruchomić i ograniczenia
W bibliotece kliknij ikonę fali obok sampla. Analiza odbywa się lokalnie w przeglądarce przez Web Audio API. Nie są wysyłane pliki ani metadane do zewnętrznego serwera.

- **BPM:** estymowane przez autokorelację obwiedni energii. Przy krótkich, luźnych, ambientowych lub nieregularnych samplach tempo może być nieokreślone albo wskazywać połowę/podwójne tempo.
- **Tonacja:** szacowana z chromy widmowej i profili tonalnych. Działa najlepiej na dźwiękach harmonicznych i dłuższych frazach; perkusja, szumy i pojedyncze uderzenia często nie mają wiarygodnej tonacji.
- **Rytm:** heurystyczna ocena skupienia ataków w obrębie pulsu, a nie pełna transkrypcja rytmiczna ani wykrywanie nut.
- **Pewność:** orientacyjny wskaźnik algorytmu, nie gwarancja poprawności.
- **Formaty:** analiza wymaga, by dana przeglądarka potrafiła zdekodować plik. WAV/MP3 zwykle mają najlepszą zgodność; FLAC/AIFF/OGG zależą od przeglądarki.
- Dla długich plików analiza może chwilę potrwać. Zalecane jest testowanie na krótkich samplach przed analizą całych utworów.

Tagi opisowe (np. `vintage`, `house`, `kick`) nadal są zgadywane na podstawie nazwy i ścieżki folderu; ta wersja nie używa modelu AI do rozpoznawania instrumentów z samego dźwięku.

## Generator paczek — użycie
1. Zaimportuj sample do biblioteki.
2. Kliknij „Stwórz paczkę”.
3. Ustaw styl, BPM, tonację, liczbę sampli i typ paczki.
4. Kliknij „Dobierz i oceń sample”, aby zobaczyć ranking oraz uzasadnienia.
5. Kliknij „Eksport ZIP”, aby pobrać paczkę z folderem `samples/` i plikiem `manifest.json`.

Punktacja jest heurystyczna, a nie gwarancją zgodności muzycznej. BPM może być rozpoznane jako połowa/podwójne tempo, a relacje tonalne są uproszczone — odsłuch nadal jest zalecany. Powtórzenia o tej samej nazwie i rozmiarze są pomijane w rankingu.

## iPhone i prywatność
- W Safari wybór folderu może być ograniczony lub niedostępny; można importować wiele plików przez selektor Plików.
- Do wygodnego dodania PWA do ekranu początkowego użyj hostingu HTTPS, następnie Safari → Udostępnij → Dodaj do ekranu początkowego.
- Dane są przechowywane w bazie przeglądarki na tym urządzeniu. Czyszczenie danych Safari/przeglądarki może usunąć bibliotekę. Eksport ZIP generatora paczek nie jest pełną kopią zapasową całej biblioteki — zapisuje tylko wybrane sample i manifest. Czyszczenie danych Safari/przeglądarki może usunąć bibliotekę.
- Aplikacja nie wysyła sampli na serwer.


## v4.1 — Serwer, import iOS, Chord Detection i Rhythm Analyzer

W generatorze paczek dodano cztery panele konfiguracyjne:

- **Serwer** — opcjonalny adres endpointu, który można sprawdzić przez GET. Serwer nie jest wymagany; z powodu CORS endpoint może nie dać się sprawdzić z przeglądarki. Nie przesyłamy audio na serwer.
- **Import iOS** — skrót do wyboru audio z aplikacji Pliki przez selektor Safari. Import folderów na iOS zależy od możliwości wersji Safari; w razie problemów wybieraj pliki pojedynczo lub wielokrotnie.
- **Chord Detection** — szacowanie dominującego akordu na podstawie profilu chroma FFT. To pojedynczy akord orientacyjny, a nie wykrywanie pełnej progresji akordów. Próg zapisu wykorzystuje ogólną pewność analizy jako filtr.
- **Rhythm Analyzer** — włączanie/wyłączanie zapisu BPM i rytmu oraz regulacja czułości detekcji ataków.
- **Analizuj bibliotekę** — uruchamia lokalną analizę wszystkich zaimportowanych sampli i zapisuje dostępne wyniki w IndexedDB.

Analiza odbywa się na urządzeniu w przeglądarce. Krótkie one-shoty, perkusyjne sample i dźwięki szumowe mogą nie mieć wiarygodnej tonacji ani akordu. Pole Serwer jest wyłącznie opcjonalnym testem połączenia — projekt nadal nie zawiera backendu ani synchronizacji między urządzeniami.
