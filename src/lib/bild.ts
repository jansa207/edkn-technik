// Fotos im Browser verkleinern, bevor sie hochgeladen werden:
// lange Kante ca. 1600 px, JPEG-Qualität ca. 0,8 (spart Datenvolumen am Flugplatz).

export const MAX_FOTOS = 3
export const LANGE_KANTE = 1600
export const JPEG_QUALITAET = 0.8

/** Zielgröße mit gleichem Seitenverhältnis, nie größer als das Original */
export function zielGroesse(
  breite: number,
  hoehe: number,
  langeKante: number = LANGE_KANTE,
): { breite: number; hoehe: number } {
  const lang = Math.max(breite, hoehe)
  if (lang <= langeKante) return { breite, hoehe }
  const faktor = langeKante / lang
  return { breite: Math.round(breite * faktor), hoehe: Math.round(hoehe * faktor) }
}

export async function verkleinereFoto(datei: File): Promise<Blob> {
  // createImageBitmap berücksichtigt die EXIF-Drehung von Handyfotos
  const bild = await createImageBitmap(datei, { imageOrientation: 'from-image' })
  const ziel = zielGroesse(bild.width, bild.height)
  const canvas = document.createElement('canvas')
  canvas.width = ziel.breite
  canvas.height = ziel.hoehe
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Foto konnte nicht verarbeitet werden')
  ctx.drawImage(bild, 0, 0, ziel.breite, ziel.hoehe)
  bild.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Foto konnte nicht verarbeitet werden'))),
      'image/jpeg',
      JPEG_QUALITAET,
    )
  })
}
