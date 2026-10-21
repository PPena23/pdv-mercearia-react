import { memo, useMemo, useState } from 'react'
import type { CategoriaId, Produto } from '@/types/dominio'
import { Tabs, type Aba } from '@/components/ui'
import { CATEGORIAS, iconeProduto } from '@/lib/categorias'
import { formatBRL } from '@/lib/money'

type Filtro = 'favoritos' | CategoriaId

const ABAS: Aba<Filtro>[] = [
  { id: 'favoritos', rotulo: 'Favoritos', icone: '⭐' },
  ...CATEGORIAS.map((c) => ({ id: c.id, rotulo: c.nome, icone: c.emoji })),
]

interface Props {
  produtos: Produto[]
  aoEscolher: (produto: Produto) => void
}

/**
 * Grade de acesso rápido (pão, banana, leite…). memo: não re-renderiza a cada
 * mudança no carrinho, só quando o catálogo ou o handler mudam.
 */
export const GradeRapida = memo(function GradeRapida({ produtos, aoEscolher }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('favoritos')

  const visiveis = useMemo(
    () =>
      produtos
        .filter((p) => (filtro === 'favoritos' ? p.favorito : p.categoria === filtro))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos, filtro],
  )

  return (
    <Tabs abas={ABAS} ativa={filtro} aoMudar={setFiltro} rotulo="Categorias de produtos">
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {visiveis.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => aoEscolher(p)}
              className="group flex h-full min-h-28 w-full flex-col rounded-2xl border-2 border-borda bg-papel p-3 text-left transition-[border-color,transform] hover:border-uva-200 active:scale-[0.98]"
            >
              <span className="flex items-start justify-between gap-2">
                <span aria-hidden className="text-3xl leading-none">{iconeProduto(p.nome, p.categoria)}</span>
                {p.unidade === 'kg' && (
                  <span className="rounded-full bg-mel-50 px-2 py-0.5 text-[11px] font-extrabold text-mel-800">⚖ kg</span>
                )}
              </span>
              <span className="mt-2 line-clamp-2 flex-1 text-[15px] font-bold leading-snug text-tinta">{p.nome}</span>
              <span className="num mt-1 text-lg font-black text-uva-700">
                {formatBRL(p.precoCentavos)}
                {p.unidade === 'kg' && <span className="text-sm font-bold text-tinta-suave">/kg</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Tabs>
  )
})
