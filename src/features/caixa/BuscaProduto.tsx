import { useId, useMemo, useState, type KeyboardEvent, type Ref } from 'react'
import type { Produto } from '@/types/dominio'
import { useDebounce } from '@/hooks/useDebounce'
import { interpretarEntrada, normalizar } from '@/lib/scanner'
import { formatBRL } from '@/lib/money'
import { iconeProduto } from '@/lib/categorias'
import { cx } from '@/lib/cx'
import { Kbd } from '@/components/ui'

interface Props {
  produtos: Produto[]
  aoEscolher: (produto: Produto, multiplicador?: string) => void
  aoErro: (mensagem: string) => void
  ref?: Ref<HTMLInputElement>
}

function buscar(produtos: Produto[], termo: string): Produto[] {
  const t = normalizar(termo.trim())
  if (t.length < 2) return []
  const palavras = t.split(/\s+/)
  return produtos
    .filter((p) => {
      const nome = normalizar(p.nome)
      return palavras.every((w) => nome.includes(w)) || p.ean.startsWith(t)
    })
    .sort((a, b) => Number(normalizar(b.nome).startsWith(t)) - Number(normalizar(a.nome).startsWith(t)))
    .slice(0, 8)
}

/**
 * Campo único de busca/leitura: aceita nome, código EAN (leitor de código de barras
 * "digita" o código e manda Enter) e multiplicador (3*789… ou 0,532*2…).
 * Implementa o padrão combobox do WAI-ARIA para a lista de sugestões.
 */
export function BuscaProduto({ produtos, aoEscolher, aoErro, ref }: Props) {
  const [texto, setTexto] = useState('')
  const [destaque, setDestaque] = useState(0)
  const idLista = useId()
  const textoAtrasado = useDebounce(texto, 150)

  const entrada = interpretarEntrada(textoAtrasado)
  const termo = entrada.tipo === 'busca' ? entrada.termo : ''
  const sugestoes = useMemo(() => buscar(produtos, termo), [produtos, termo])
  const aberta = sugestoes.length > 0 && texto.trim().length > 0

  function escolher(p: Produto, multiplicador?: string) {
    aoEscolher(p, multiplicador)
    setTexto('')
    setDestaque(0)
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && aberta) {
      e.preventDefault()
      setDestaque((d) => (d + 1) % sugestoes.length)
    } else if (e.key === 'ArrowUp' && aberta) {
      e.preventDefault()
      setDestaque((d) => (d - 1 + sugestoes.length) % sugestoes.length)
    } else if (e.key === 'Escape' && texto) {
      e.preventDefault()
      setTexto('')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // no Enter usamos o texto ATUAL (não o "debounced"): o leitor de código é rápido
      const atual = interpretarEntrada(texto)
      if (atual.tipo === 'vazio') return
      if (atual.tipo === 'codigo') {
        const p = produtos.find((x) => x.ean === atual.codigo)
        if (p) escolher(p, atual.multiplicador)
        else aoErro(`Código ${atual.codigo} não encontrado`)
        return
      }
      const lista = buscar(produtos, atual.termo)
      const alvo = aberta ? sugestoes[destaque] : lista[0]
      if (alvo) escolher(alvo, atual.multiplicador)
      else aoErro(`Nenhum produto para "${atual.termo}"`)
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${idLista}-input`} className="sr-only">
        Buscar produto por nome ou código de barras
      </label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-uva-200 bg-papel px-4 shadow-cartao focus-within:border-uva-700 focus-within:ring-4 focus-within:ring-uva-100">
        <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-uva-700" aria-hidden>
          <path d="M3 5v14M6 5v14M9 5v14M13 5v14M16 5v14M18 5v14M21 5v14" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <input
          ref={ref}
          id={`${idLista}-input`}
          role="combobox"
          aria-expanded={aberta}
          aria-controls={`${idLista}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={aberta ? `${idLista}-op-${destaque}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setDestaque(0)
          }}
          onKeyDown={aoTeclar}
          placeholder="Bipe o código ou digite o nome…"
          className="h-16 min-w-0 flex-1 bg-transparent text-xl font-bold text-tinta outline-none placeholder:font-semibold placeholder:text-tinta-suave/60 focus-visible:outline-none"
        />
        <span className="hidden sm:block">
          <Kbd>F2</Kbd>
        </span>
      </div>

      {aberta && (
        <ul
          id={`${idLista}-lista`}
          role="listbox"
          aria-label="Sugestões de produtos"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(60dvh,420px)] overflow-y-auto rounded-2xl border border-borda bg-papel p-1.5 shadow-elevado"
        >
          {sugestoes.map((p, i) => (
            <li
              key={p.id}
              id={`${idLista}-op-${i}`}
              role="option"
              aria-selected={i === destaque}
              onMouseDown={(e) => e.preventDefault()} // mantém o foco no input
              onClick={() => escolher(p, entrada.tipo === 'busca' ? entrada.multiplicador : undefined)}
              onMouseEnter={() => setDestaque(i)}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
                i === destaque ? 'bg-uva-50' : 'hover:bg-creme',
              )}
            >
              <span aria-hidden className="text-2xl">{iconeProduto(p.nome, p.categoria)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.nome}</span>
                <span className="num block text-xs text-tinta-suave">{p.ean}</span>
              </span>
              <span className="num font-extrabold text-uva-700">
                {formatBRL(p.precoCentavos)}
                {p.unidade === 'kg' && <span className="text-xs font-bold text-tinta-suave">/kg</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
