import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonKlassen, type ButtonArt, type ButtonGroesse } from './buttonStil'
import { Spinner } from './Feedback'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  art?: ButtonArt
  groesse?: ButtonGroesse
  laedt?: boolean
  icon?: ReactNode
}

export function Button({
  art = 'sekundaer',
  groesse = 'normal',
  laedt = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonKlassen(art, groesse)} ${className}`}
      disabled={disabled || laedt}
      aria-busy={laedt || undefined}
      {...rest}
    >
      {laedt ? <Spinner klein /> : icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  art?: ButtonArt
  groesse?: ButtonGroesse
  icon?: ReactNode
}

export function ButtonLink({
  art = 'sekundaer',
  groesse = 'normal',
  icon,
  className = '',
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={`${buttonKlassen(art, groesse)} ${className}`} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
