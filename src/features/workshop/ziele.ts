/** „Winterarbeit 26/27“ passend zur Saison */
export function winterarbeit(jetzt: Date = new Date()): string {
  const j = jetzt.getFullYear() % 100
  const start = jetzt.getMonth() >= 8 ? j : j - 1
  return `Winterarbeit ${String(start).padStart(2, '0')}/${String(start + 1).padStart(2, '0')}`
}
