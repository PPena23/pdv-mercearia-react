import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  tamanho?: 'sm' | 'md' | 'lg' | 'xl'
  /** impede fechar (Esc/clique fora) enquanto algo assíncrono acontece */
  bloquearFechar?: boolean
  className?: string
}

const LARGURAS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

// pilha de diálogos abertos: só o do topo responde a Esc/Tab (diálogo dentro de diálogo)
const pilha: symbol[] = []

/**
 * Diálogo modal acessível: portal, foco preso dentro (Tab/Shift+Tab),
 * Esc fecha, foco volta para quem abriu e a rolagem da página trava.
 */
export function Dialog({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  tamanho = 'md',
  bloquearFechar = false,
  className,
}: DialogProps) {
  const painelRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const descId = useId()
  // refs evitam re-executar o efeito de foco quando as props mudam
  const aoFecharRef = useRef(aoFechar)
  const bloqueadoRef = useRef(bloquearFechar)
  useEffect(() => {
    aoFecharRef.current = aoFechar
    bloqueadoRef.current = bloquearFechar
  })

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    const painel = painelRef.current
    // foca o primeiro campo marcado com autofocus, ou o primeiro focável
    const alvo =
      painel?.querySelector<HTMLElement>('[data-autofocus]') ?? painel?.querySelector<HTMLElement>(FOCAVEIS)
    ;(alvo ?? painel)?.focus()

    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const eu = Symbol('dialog')
    pilha.push(eu)

    const aoTeclar = (e: KeyboardEvent) => {
      if (pilha[pilha.length - 1] !== eu) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!bloqueadoRef.current) aoFecharRef.current()
        return
      }
      if (e.key !== 'Tab' || !painel) return
      const itens = [...painel.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((el) => el.offsetParent !== null)
      if (itens.length === 0) return e.preventDefault()
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)

    // limpeza: devolve foco e rolagem quando o diálogo fecha/desmonta
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      pilha.splice(pilha.indexOf(eu), 1)
      if (pilha.length === 0) document.body.style.overflow = overflow
      anterior?.focus?.()
    }
  }, [aberto])

  if (!aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-[surgir_150ms_ease-out] bg-uva-900/45 backdrop-blur-[2px]"
        onClick={() => !bloquearFechar && aoFechar()}
        aria-hidden
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricao ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-surgir flex-col overflow-hidden rounded-t-3xl bg-papel shadow-elevado sm:rounded-3xl',
          LARGURAS[tamanho],
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-borda px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-xl font-extrabold leading-tight text-tinta">
              {titulo}
            </h2>
            {descricao && (
              <p id={descId} className="mt-1 text-sm text-tinta-suave">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={bloquearFechar}
            className="-mr-1 grid size-10 shrink-0 place-items-center rounded-xl text-tinta-suave hover:bg-creme hover:text-tinta disabled:opacity-40"
            aria-label="Fechar (Esc)"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {rodape && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-borda bg-creme/60 px-5 py-4 sm:px-6">
            {rodape}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
