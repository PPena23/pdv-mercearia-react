import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface Aba<T extends string> {
  id: T
  rotulo: ReactNode
  icone?: ReactNode
}

interface TabsProps<T extends string> {
  abas: Aba<T>[]
  ativa: T
  aoMudar: (id: T) => void
  rotulo: string
  children?: ReactNode
  variante?: 'chips' | 'segmentado'
  className?: string
}

/**
 * Abas acessíveis (padrão WAI-ARIA): setas ←/→, Home e End movem entre abas,
 * só a aba ativa entra na ordem de Tab. Genérico no tipo do id.
 */
export function Tabs<T extends string>({ abas, ativa, aoMudar, rotulo, children, variante = 'chips', className }: TabsProps<T>) {
  const base = useId()
  const lista = useRef<HTMLDivElement>(null)

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = abas.findIndex((a) => a.id === ativa)
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % abas.length
      : e.key === 'ArrowLeft' ? (i - 1 + abas.length) % abas.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? abas.length - 1
      : -1
    if (destino < 0) return
    e.preventDefault()
    aoMudar(abas[destino].id)
    lista.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[destino]?.focus()
  }

  return (
    <div className={className}>
      <div
        ref={lista}
        role="tablist"
        aria-label={rotulo}
        onKeyDown={aoTeclar}
        className={cx(
          'flex gap-2 overflow-x-auto [scrollbar-width:none]',
          variante === 'segmentado' && 'gap-1 rounded-2xl bg-creme p-1',
        )}
      >
        {abas.map((aba) => {
          const selecionada = aba.id === ativa
          return (
            <button
              key={aba.id}
              type="button"
              role="tab"
              id={`${base}-tab-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={children ? `${base}-painel` : undefined}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => aoMudar(aba.id)}
              className={cx(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-bold transition-colors',
                variante === 'chips' && 'h-11 rounded-full border-2 px-4 text-[15px]',
                variante === 'chips' &&
                  (selecionada
                    ? 'border-uva-700 bg-uva-700 text-white'
                    : 'border-borda bg-papel text-tinta-suave hover:border-uva-200 hover:text-uva-700'),
                variante === 'segmentado' && 'h-11 flex-1 justify-center rounded-xl px-2 text-sm',
                variante === 'segmentado' &&
                  (selecionada ? 'bg-papel text-uva-700 shadow-cartao' : 'text-tinta-suave hover:text-tinta'),
              )}
            >
              {aba.icone && <span aria-hidden>{aba.icone}</span>}
              {aba.rotulo}
            </button>
          )
        })}
      </div>
      {children && (
        <div role="tabpanel" id={`${base}-painel`} aria-labelledby={`${base}-tab-${ativa}`} className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}
