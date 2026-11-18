-- =============================================================================
-- Freigabe-Status „deaktiviert“: Admin kann ein Konto später wieder sperren
-- (handoff.md Abschnitt 3.4). Eigene Datei, weil ein neuer Enum-Wert erst nach
-- dem Commit verwendet werden darf.
--
-- is_approved()/current_rolle() prüfen auf 'freigegeben', deaktivierte Konten
-- bekommen damit automatisch keine Daten mehr.
-- =============================================================================
alter type public.freigabe add value if not exists 'deaktiviert';
