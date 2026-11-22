-- =============================================================================
-- Luftfahrzeugart „Motorflugzeug“. Der Verein betreibt Motor- und Segelflug,
-- die Arten sollen das abbilden. Eigene Datei, weil ein neuer Enum-Wert erst
-- nach dem Commit verwendet werden darf.
-- =============================================================================
alter type public.flugzeug_art add value if not exists 'motorflugzeug';
