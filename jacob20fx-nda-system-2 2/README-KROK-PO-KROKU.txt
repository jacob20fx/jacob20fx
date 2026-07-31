JACOB20FX — WERSJA Z SUPABASE I VERCEL

CO JUŻ DZIAŁA:
- prawdziwa internetowa baza zgłoszeń,
- panel administratora z logowaniem e-mail i hasłem,
- akceptowanie, odrzucanie i usuwanie aplikacji,
- sprawdzanie statusu z dowolnego urządzenia,
- kontakt Telegram: @jacob20FX,
- zabezpieczenie tabeli przez Row Level Security.

1. SUPABASE
- Wejdź na supabase.com i utwórz projekt.
- Otwórz SQL Editor.
- Wklej cały plik supabase-setup.sql i kliknij Run.
- Wejdź: Authentication → Users → Add user.
- Utwórz swoje konto administratora (e-mail + mocne hasło).
- Skopiuj UUID użytkownika.
- W SQL Editor uruchom:
  insert into public.admin_users(user_id) values ('TU-WKLEJ-UUID-ADMINA');

2. DANE API
- Wejdź: Project Settings → API.
- Skopiuj Project URL i anon/public key.
- Otwórz plik config.js.
- Wklej je w miejsca:
  WKLEJ_TUTAJ_SUPABASE_URL
  WKLEJ_TUTAJ_SUPABASE_ANON_KEY
- Nie używaj service_role key na stronie.

3. GITHUB
- Usuń z repozytorium poprzedni ZIP.
- Rozpakuj tę paczkę na Macu.
- W GitHub kliknij Add file → Upload files.
- Przeciągnij wszystkie pliki z tego folderu (nie sam ZIP).
- Kliknij Commit changes.

4. VERCEL
- Wejdź na vercel.com i zaloguj się kontem GitHub.
- Kliknij Add New → Project.
- Wybierz repozytorium jacob20fx.
- Framework Preset: Other.
- Root Directory: pozostaw puste.
- Kliknij Deploy.
- Strona główna: otrzymany adres Vercel.
- Panel administratora: /admin (lub /admin.html).

WAŻNE:
- Klucz anon/public może być widoczny w przeglądarce; bezpieczeństwo zapewniają polityki RLS.
- Nigdy nie wklejaj klucza service_role do config.js.
- Dodaj politykę prywatności przed publicznym zbieraniem danych osobowych.
