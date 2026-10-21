import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

type TipoToast = 'sucesso' | 'erro' | 'info'

export interface OpcoesToast {
  tipo?: TipoToast
  titulo: string
  descricao?: string
  acao?: { rotulo: string; aoClicar: () => void }
  duracaoMs?: number
}

interface ToastAtivo extends Required<Pick<OpcoesToast, 'tipo' | 'titulo' | 'duracaoMs'>> {
  id: number
  descricao?: string
  acao?: OpcoesToast['acao']
}

const ToastContext = createContext<((opcoes: OpcoesToast) => void) | null>(null)

const ESTILO: Record<TipoToast, { caixa: string; icone: string }> = {
  sucesso: { caixa: 'border-lima-400 bg-papel', icone: '✓' },
  erro: { caixa: 'border-tomate-500 bg-tomate-50', icone: '!' },
  info: { caixa: 'border-uva-200 bg-papel', icone: 'i' },
}

function ItemToast({ toast, aoSair }: { toast: ToastAtivo; aoSair: (id: number) => void }) {
  const [pausado, setPausado] = useState(false)

  // some sozinho depois de X ms; pausa com mouse/foco em cima (dá tempo de clicar em "Desfazer")
  useEffect(() => {
    if (pausado) return
    const t = setTimeout(() => aoSair(toast.id), toast.duracaoMs)
    return () => clearTimeout(t)
  }, [pausado, toast.id, toast.duracaoMs, aoSair])

  const estilo = ESTILO[toast.tipo]
  return (
    <li
      className={cx(
        'pointer-events-auto flex w-full animate-surgir items-start gap-3 rounded-2xl border-2 p-3.5 pr-2 shadow-elevado',
        estilo.caixa,
      )}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span
        aria-hidden
        className={cx(
          'grid size-7 shrink-0 place-items-center rounded-full text-sm font-black',
          toast.tipo === 'sucesso' && 'bg-lima-400 text-lima-900',
          toast.tipo === 'erro' && 'bg-tomate-500 text-white',
          toast.tipo === 'info' && 'bg-uva-700 text-white',
        )}
      >
        {estilo.icone}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-extrabold leading-tight text-tinta">{toast.titulo}</p>
        {toast.descricao && <p className="mt-0.5 text-sm text-tinta-suave">{toast.descricao}</p>}
      </div>
      {toast.acao && (
        <button
          type="button"
          className="h-9 shrink-0 rounded-lg bg-uva-700 px-3 text-sm font-extrabold text-white hover:bg-uva-800"
          onClick={() => {
            toast.acao?.aoClicar()
            aoSair(toast.id)
          }}
        >
          {toast.acao.rotulo}
        </button>
      )}
      <button
        type="button"
        onClick={() => aoSair(toast.id)}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-tinta-suave hover:bg-black/5"
        aria-label="Dispensar aviso"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}

/** Avisos temporários (feedback de ações). A região é aria-live para leitores de tela. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastAtivo[]>([])
  const proximoId = useRef(1)

  const remover = useCallback((id: number) => setToasts((lista) => lista.filter((t) => t.id !== id)), [])

  const mostrar = useCallback((o: OpcoesToast) => {
    const toast: ToastAtivo = {
      id: proximoId.current++,
      tipo: o.tipo ?? 'info',
      titulo: o.titulo,
      descricao: o.descricao,
      acao: o.acao,
      duracaoMs: o.duracaoMs ?? (o.acao ? 6000 : 3500),
    }
    setToasts((lista) => [...lista.slice(-3), toast]) // no máximo 4 na tela
  }, [])

  const valor = useMemo(() => mostrar, [mostrar])

  return (
    <ToastContext value={valor}>
      {children}
      <ol
        aria-live="polite"
        aria-label="Avisos"
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex w-[min(100%-1.5rem,26rem)] flex-col gap-2 print:hidden"
      >
        {toasts.map((t) => (
          <ItemToast key={t.id} toast={t} aoSair={remover} />
        ))}
      </ol>
    </ToastContext>
  )
}

export function useToast() {
  const ctx = use(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
