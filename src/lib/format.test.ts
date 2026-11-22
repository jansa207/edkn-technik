import { describe, expect, it } from 'vitest'
import { zielGroesse } from './bild'
import {
  aufgabenNr,
  fristText,
  meldungsNr,
  minutenAus,
  plusMonate,
  stunden,
  tag,
  tageBis,
  zeitpunkt,
} from './format'

describe('Formatierung', () => {
  it('formatiert Zeitpunkte in deutscher Zeit', () => {
    expect(zeitpunkt('2026-11-18T13:05:00Z')).toBe('18.11.2026 14:05')
    expect(zeitpunkt('2026-07-01T13:05:00Z')).toBe('01.07.2026 15:05')
  })

  it('formatiert reine Datumswerte ohne Zeitzonen-Verschiebung', () => {
    expect(tag('2027-02-28')).toBe('28.02.2027')
  })

  it('erzeugt Meldungs- und Aufgabennummern', () => {
    expect(meldungsNr(7)).toBe('M-0007')
    expect(aufgabenNr(123)).toBe('A-0123')
  })

  it('rechnet Fristen in deutscher Zeit', () => {
    // 23:30 Uhr deutscher Zeit am 18.11. ist in UTC noch der 18.11.
    const jetzt = new Date('2026-11-18T22:30:00Z')
    expect(tageBis('2026-11-18', jetzt)).toBe(0)
    expect(tageBis('2026-11-19', jetzt)).toBe(1)
    expect(fristText('2026-11-15', jetzt)).toBe('überfällig seit 3 Tagen')
    expect(fristText('2026-11-17', jetzt)).toBe('überfällig seit gestern')
    expect(fristText('2026-11-18', jetzt)).toBe('heute fällig')
    expect(fristText('2026-11-25', jetzt)).toBe('in 7 Tagen')
  })

  it('zeigt Betriebsstunden als Stunden:Minuten', () => {
    expect(stunden(74_105)).toBe('1235:05 h')
    expect(stunden(-300)).toBe('−5:00 h')
    expect(stunden(null)).toBe('–')
  })

  it('liest Stundenstände in verschiedenen Schreibweisen', () => {
    expect(minutenAus('1235:05')).toBe(74_105)
    expect(minutenAus('1235,5')).toBe(74_130)
    expect(minutenAus('50 h')).toBe(3000)
    expect(minutenAus('12:75')).toBeNull()
    expect(minutenAus('abc')).toBeNull()
  })

  it('rechnet Monate auf ein Datum', () => {
    expect(plusMonate('2026-11-22', 12)).toBe('2027-11-22')
    expect(plusMonate('2026-01-31', 1)).toBe('2026-02-28')
  })
})

describe('Bildgröße', () => {
  it('verkleinert auf 1600 px lange Kante', () => {
    expect(zielGroesse(4000, 3000)).toEqual({ breite: 1600, hoehe: 1200 })
    expect(zielGroesse(3000, 4000)).toEqual({ breite: 1200, hoehe: 1600 })
  })

  it('vergrößert kleine Bilder nicht', () => {
    expect(zielGroesse(800, 600)).toEqual({ breite: 800, hoehe: 600 })
  })
})
