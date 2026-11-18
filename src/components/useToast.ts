import { useContext } from 'react'
import { ToastKontext } from './toastKontext'

export function useToast() {
  return useContext(ToastKontext)
}
