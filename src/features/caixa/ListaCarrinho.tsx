import { memo, useEffect, useRef, type ReactNode } from 'react'
import type { LinhaCarrinho } from './carrinhoReducer'
import { brutoItem, descontoValido, liquidoItem } from '@/lib/carrinho'
import { formatBRL, formatQuantidade } from '@/lib/money'
import { cx } from '@/lib/cx'
import { EmptyState } from '@/components/ui'

interface AcoesLinha {
  aoSelecionar: (linhaId: string) => void
  aoAlterarQtd: (linhaId: string, delta: number) => void
  aoRepesar: (linha: LinhaCarrinho) => void
  aoRemover: (linhaId: string) => void
}

const BotaoIcone = ({ rotulo, onClick, children, perigo }: { rotulo: string; onClick: () => void; children: ReactNode; perigo?: boolean }) => (
  <button
    type="button"
    aria-label={rotulo}
    title={rotulo}
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    className={cx(
      'grid size-10 shrink-0 place-items-center rounded-xl border-2 text-lg font-black transition-colors',
      perigo
        ? 'border-transparent text-tinta-suave hover:border-tomate-100 hover:bg-tomate-50 hover:text-tomate-600'
        : 'border-borda bg-papel text-uva-700 hover:border-uva-200 hover:bg-uva-50',
    )}
  >
    {children}
  </button>
)

const Linha = memo(function Linha({
  linha,
  numero,
  selecionada,
  aoSelecionar,
  aoAlterarQtd,
  aoRepesar,
  aoRemover,
}: { linha: LinhaCarrinho; numero: number; selecionada: boolean } & AcoesLinha) {
  const desconto = descontoValido(linha)
  return (
    <li
      onClick={() => aoSelecionar(linha.linhaId)}
      aria-current={selecionada || undefined}
      className={cx(
        'animate-deslizar cursor-pointer rounded-2xl border-2 p-3 transition-colors',
        selecionada ? 'border-uva-500 bg-uva-50/60' : 'border-transparent hover:bg-creme',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="num mt-0.5 w-6 shrink-0 text-sm font-bold text-tinta-suave">{String(numero).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug text-tinta">{linha.nome}</p>
          <p className="num text-sm text-tinta-suave">
            {formatQuantidade(linha.quantidade, linha.unidade)} × {formatBRL(linha.precoUnitarioCentavos)}
            {linha.unidade === 'kg' && '/kg'}
          </p>
        </div>
        <div className="text-right">
          {desconto > 0 && <p className="num text-xs text-tinta-suave line-through">{formatBRL(brutoItem(linha))}</p>}
          <p className="num text-lg font-black text-tinta">{formatBRL(liquidoItem(linha))}</p>
          {desconto > 0 && <p className="num text-xs font-bold text-lima-700">−{formatBRL(desconto)}</p>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 pl-8">
        {linha.unidade === 'un' ? (
          <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${linha.nome}`}>
            <BotaoIcone rotulo={`Diminuir ${linha.nome}`} onClick={() => aoAlterarQtd(linha.linhaId, -1)}>
              −
            </BotaoIcone>
            <span className="num w-10 text-center text-lg font-black" aria-live="polite">
              {linha.quantidade}
            </span>
            <BotaoIcone rotulo={`Aumentar ${linha.nome}`} onClick={() => aoAlterarQtd(linha.linhaId, 1)}>
              +
            </BotaoIcone>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              aoRepesar(linha)
            }}
            className="h-10 rounded-xl border-2 border-borda px-3 text-sm font-bold text-uva-700 hover:border-uva-200 hover:bg-uva-50"
          >
            ⚖ Alterar peso
          </button>
        )}
        <span className="flex-1" />
        <BotaoIcone rotulo={`Remover ${linha.nome}`} onClick={() => aoRemover(linha.linhaId)} perigo>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </BotaoIcone>
      </div>
    </li>
  )
})

export function ListaCarrinho({
  linhas,
  selecionada,
  ...acoes
}: { linhas: LinhaCarrinho[]; selecionada: string | null } & AcoesLinha) {
  const fimRef = useRef<HTMLDivElement>(null)
  const qtdAnterior = useRef(linhas.length)

  // rola até o último item quando entra produto novo
  useEffect(() => {
    if (linhas.length > qtdAnterior.current) fimRef.current?.scrollIntoView({ block: 'nearest' })
    qtdAnterior.current = linhas.length
  }, [linhas.length])

  if (linhas.length === 0) {
    return (
      <EmptyState
        icone="🧺"
        titulo="Cesta vazia"
        descricao="Bipe um código, digite o nome do produto ou toque num item da grade para começar a venda."
      />
    )
  }

  return (
    <>
      <ol className="space-y-1.5" aria-label="Itens da venda">
        {linhas.map((l, i) => (
          <Linha key={l.linhaId} linha={l} numero={i + 1} selecionada={l.linhaId === selecionada} {...acoes} />
        ))}
      </ol>
      <div ref={fimRef} />
    </>
  )
}
