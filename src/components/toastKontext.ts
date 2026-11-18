import { createContext } from 'react'

export type ToastTon = 'erfolg' | 'fehler'
export type ToastFn = (text: string, ton?: ToastTon) => void

export const ToastKontext = createContext<ToastFn>(() => {})
