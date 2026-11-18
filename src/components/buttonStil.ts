export type ButtonArt = 'primaer' | 'sekundaer' | 'gefahr' | 'leise'
export type ButtonGroesse = 'normal' | 'klein' | 'gross'

const ART: Record<ButtonArt, string> = {
  primaer: 'bg-primaer text-white hover:bg-primaer-dunkel border border-primaer',
  sekundaer: 'bg-white text-text border border-rand-stark hover:bg-flaeche',
  gefahr: 'bg-ampel-rot text-white border border-ampel-rot hover:bg-red-800',
  leise: 'bg-transparent text-text-2 border border-transparent hover:bg-black/5 hover:text-text',
}

// Am Handy große Touch-Flächen (Handschuhe), am Desktop dichter
const GROESSE: Record<ButtonGroesse, string> = {
  normal: 'min-h-12 px-4 text-base lg:min-h-9 lg:px-3.5 lg:text-sm',
  klein: 'min-h-10 px-3 text-sm lg:min-h-8 lg:px-2.5',
  gross: 'min-h-13 px-5 text-base lg:min-h-11 lg:px-5',
}

export function buttonKlassen(art: ButtonArt = 'sekundaer', groesse: ButtonGroesse = 'normal') {
  return `inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ART[art]} ${GROESSE[groesse]}`
}
