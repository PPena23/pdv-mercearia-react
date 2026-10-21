import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Button } from './Button'

/* Peças pequenas do design system: Card, Badge, Kbd, Skeleton, EmptyState, EstadoErro. */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-borda bg-papel shadow-cartao', className)} {...props} />
}

type TomBadge = 'neutro' | 'uva' | 'lima' | 'mel' | 'tomate'
const TONS: Record<TomBadge, string> = {
  neutro: 'bg-creme text-tinta-suave border-borda',
  uva: 'bg-uva-50 text-uva-700 border-uva-200',
  lima: 'bg-lima-50 text-lima-700 border-lima-300',
  mel: 'bg-mel-50 text-mel-800 border-mel-100',
  tomate: 'bg-tomate-50 text-tomate-700 border-tomate-100',
}

export function Badge({ tom = 'neutro', className, children }: { tom?: TomBadge; className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-extrabold',
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex min-w-7 items-center justify-center rounded-md border border-b-[3px] border-borda-forte bg-papel px-1.5 py-0.5 font-sans text-xs font-extrabold text-tinta',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-xl bg-borda/70', className)} />
}

export function EmptyState({
  icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: ReactNode
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <div aria-hidden className="mb-3 grid size-16 place-items-center rounded-full bg-creme text-3xl">
        {icone}
      </div>
      <p className="text-lg font-extrabold text-tinta">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-tinta-suave">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border-2 border-tomate-100 bg-tomate-50 px-6 py-10 text-center">
      <div aria-hidden className="mb-3 grid size-14 place-items-center rounded-full bg-tomate-500 text-2xl font-black text-white">
        !
      </div>
      <p className="text-lg font-extrabold text-tomate-700">Não foi possível carregar</p>
      <p className="mt-1 max-w-md text-sm text-tinta-suave">{mensagem}</p>
      {aoTentarDeNovo && (
        <Button className="mt-4" variante="secundario" onClick={aoTentarDeNovo}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/** Título de página padrão: título, subtítulo e ações à direita. */
export function CabecalhoPagina({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-tinta-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}
