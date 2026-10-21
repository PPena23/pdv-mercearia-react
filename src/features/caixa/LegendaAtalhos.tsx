import { Kbd } from '@/components/ui'

export const ATALHOS = [
  { tecla: 'F2', acao: 'Buscar produto' },
  { tecla: 'F4', acao: 'Desconto' },
  { tecla: 'F8', acao: 'Cancelar item' },
  { tecla: 'F10', acao: 'Finalizar' },
  { tecla: 'Esc', acao: 'Fechar diálogo' },
] as const

/** Legenda sempre visível dos atalhos (só em telas com teclado físico provável). */
export function LegendaAtalhos() {
  return (
    <section aria-label="Atalhos de teclado" className="hidden rounded-2xl border border-dashed border-borda-forte px-4 py-3 md:block">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-tinta-suave">
        {ATALHOS.map((a) => (
          <li key={a.tecla} className="flex items-center gap-2">
            <Kbd>{a.tecla}</Kbd>
            {a.acao}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Kbd>3*</Kbd> antes do código = quantidade
        </li>
      </ul>
    </section>
  )
}
