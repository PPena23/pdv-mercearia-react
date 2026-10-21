import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

const BASE_CONTROLE =
  'w-full rounded-xl border-2 border-borda bg-papel px-3.5 text-[16px] text-tinta placeholder:text-tinta-suave/60 transition-colors ' +
  'hover:border-borda-forte focus:border-uva-500 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-uva-100 ' +
  'aria-[invalid=true]:border-tomate-500 aria-[invalid=true]:focus:ring-tomate-100 disabled:bg-creme disabled:text-tinta-suave'

interface CampoBaseProps {
  rotulo: string
  erro?: string
  dica?: ReactNode
  /** esconde o rótulo visualmente (continua para leitores de tela) */
  rotuloOculto?: boolean
}

function Rodape({ id, erro, dica }: { id: string; erro?: string; dica?: ReactNode }) {
  if (erro) {
    return (
      <p id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-tomate-600">
        <span aria-hidden>⚠</span> {erro}
      </p>
    )
  }
  return dica ? (
    <p id={id} className="mt-1.5 text-sm text-tinta-suave">
      {dica}
    </p>
  ) : null
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, CampoBaseProps {
  prefixo?: string
  sufixo?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/** Input com rótulo, dica e erro já ligados por aria-describedby. */
export function Input({ rotulo, erro, dica, rotuloOculto, prefixo, sufixo, className, id, ref, ...props }: InputProps) {
  const autoId = useId()
  const campoId = id ?? autoId
  const descId = `${campoId}-desc`
  return (
    <div className={className}>
      <label htmlFor={campoId} className={cx('mb-1.5 block text-sm font-bold text-tinta', rotuloOculto && 'sr-only')}>
        {rotulo}
      </label>
      <div className="relative flex items-center">
        {prefixo && (
          <span className="pointer-events-none absolute left-3.5 font-bold text-tinta-suave" aria-hidden>
            {prefixo}
          </span>
        )}
        <input
          ref={ref}
          id={campoId}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro || dica ? descId : undefined}
          className={cx(BASE_CONTROLE, 'h-12', prefixo && 'pl-11', sufixo ? 'pr-12' : undefined)}
          {...props}
        />
        {sufixo && <span className="absolute right-3">{sufixo}</span>}
      </div>
      <Rodape id={descId} erro={erro} dica={dica} />
    </div>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, CampoBaseProps {
  ref?: Ref<HTMLSelectElement>
}

export function Select({ rotulo, erro, dica, rotuloOculto, className, id, children, ref, ...props }: SelectProps) {
  const autoId = useId()
  const campoId = id ?? autoId
  const descId = `${campoId}-desc`
  return (
    <div className={className}>
      <label htmlFor={campoId} className={cx('mb-1.5 block text-sm font-bold text-tinta', rotuloOculto && 'sr-only')}>
        {rotulo}
      </label>
      <select
        ref={ref}
        id={campoId}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro || dica ? descId : undefined}
        className={cx(BASE_CONTROLE, 'h-12 cursor-pointer appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2366566d' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
      <Rodape id={descId} erro={erro} dica={dica} />
    </div>
  )
}
