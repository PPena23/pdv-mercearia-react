import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '@/lib/cx'
import { Spinner } from './Spinner'

type Variante = 'primario' | 'secundario' | 'sucesso' | 'perigo' | 'fantasma'
type Tamanho = 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
  icone?: ReactNode
  /** atalho exibido à direita, ex.: "F10" */
  atalho?: string
  larguraTotal?: boolean
  ref?: Ref<HTMLButtonElement>
}

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-uva-700 text-white hover:bg-uva-800 active:bg-uva-900 shadow-[0_2px_0_var(--color-uva-900)] active:translate-y-px active:shadow-none',
  secundario: 'bg-papel text-uva-700 border-2 border-uva-200 hover:border-uva-500 hover:bg-uva-50',
  sucesso:
    'bg-lima-400 text-lima-900 hover:bg-lima-500 shadow-[0_2px_0_var(--color-lima-700)] active:translate-y-px active:shadow-none',
  perigo: 'bg-tomate-500 text-white hover:bg-tomate-600 active:bg-tomate-700',
  fantasma: 'bg-transparent text-tinta-suave hover:bg-creme hover:text-tinta',
}

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-5 text-base gap-2 rounded-2xl',
  xl: 'h-16 px-6 text-lg gap-3 rounded-2xl',
}

/** Botão base do design system. Alvos grandes (≥ 44px) pensando em tablet. */
export function Button({
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  icone,
  atalho,
  larguraTotal,
  className,
  children,
  disabled,
  type = 'button',
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center font-bold transition-[background-color,border-color,transform,box-shadow] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        VARIANTES[variante],
        TAMANHOS[tamanho],
        larguraTotal && 'w-full',
        className,
      )}
      {...props}
    >
      {carregando ? <Spinner className="size-5" /> : icone}
      {children}
      {atalho && (
        <kbd className="ml-auto rounded-md bg-black/10 px-1.5 py-0.5 font-sans text-xs font-extrabold opacity-80">
          {atalho}
        </kbd>
      )}
    </button>
  )
}
