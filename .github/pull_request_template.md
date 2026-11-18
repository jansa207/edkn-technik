## Was ändert sich?

<!-- 1–3 Sätze. Issue verlinken: "Schließt #…" -->

## Wie getestet?

- [ ] `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] Am Handy über den Preview-Link angeschaut (bei UI-Änderungen)
- [ ] Neue Migration? Dann `supabase db reset` und `supabase test db` lokal grün

## Checkliste

- [ ] Keine Secrets, keine echten Vereins- oder Personendaten
- [ ] Sichtbarkeitsregeln nur in RLS/Views geändert, nicht in der UI verstreut
- [ ] `CLAUDE.md` bzw. `docs/entscheidungen.md` aktualisiert, falls etwas Grundsätzliches geändert wurde
