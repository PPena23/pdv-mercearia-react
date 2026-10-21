import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Produto } from '@/types/dominio'
import { Button, Dialog, Input } from '@/components/ui'
import { formatBRL, formatQuantidade, multiplicar, parsePesoKg } from '@/lib/money'
import { esperar } from '@/services/rede'

interface Props {
  produto: Produto | null
  gramasIniciais?: number
  aoFechar: () => void
  aoConfirmar: (gramas: number) => void
}

const ATALHOS_PESO = [250, 500, 1000]

/** Diálogo de pesagem: digita "0,532" ou "lê" a balança (simulada, assíncrona). */
export function PesoDialog({ produto, gramasIniciais, aoFechar, aoConfirmar }: Props) {
  return (
    <Dialog aberto={produto !== null} aoFechar={aoFechar} titulo={produto ? `Pesar: ${produto.nome}` : ''} tamanho="sm">
      {/* key: reinicia o estado interno a cada produto */}
      {produto && <ConteudoPeso key={produto.id} produto={produto} gramasIniciais={gramasIniciais} aoConfirmar={aoConfirmar} />}
    </Dialog>
  )
}

function ConteudoPeso({ produto, gramasIniciais, aoConfirmar }: Omit<Props, 'produto' | 'aoFechar'> & { produto: Produto }) {
  const [texto, setTexto] = useState(gramasIniciais ? formatQuantidade(gramasIniciais, 'kg').replace(' kg', '') : '')
  const [tocado, setTocado] = useState(false)
  const [lendo, setLendo] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // cancela a leitura da balança se o diálogo fechar no meio
  useEffect(() => () => abortRef.current?.abort(), [])

  const gramas = parsePesoKg(texto)
  const erro = tocado && gramas === null ? 'Informe o peso em kg, ex.: 0,532' : gramas !== null && gramas > 30000 ? 'Peso acima do limite da balança (30 kg)' : undefined
  const valido = gramas !== null && gramas <= 30000

  async function lerBalanca() {
    abortRef.current = new AbortController()
    setLendo(true)
    try {
      await esperar(900, abortRef.current.signal)
      const lido = 150 + Math.floor(Math.random() * 1350)
      setTexto(formatQuantidade(lido, 'kg').replace(' kg', ''))
      setTocado(true)
    } catch {
      /* leitura cancelada */
    } finally {
      setLendo(false)
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setTocado(true)
    if (valido) aoConfirmar(gramas)
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <Input
        rotulo="Peso (kg)"
        data-autofocus
        inputMode="decimal"
        placeholder="0,532"
        className="num"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => setTocado(true)}
        erro={erro}
        sufixo={<span className="font-bold text-tinta-suave">kg</span>}
      />
      <div className="flex flex-wrap gap-2">
        {ATALHOS_PESO.map((g) => (
          <Button key={g} variante="secundario" tamanho="sm" onClick={() => setTexto(formatQuantidade(g, 'kg').replace(' kg', ''))}>
            {g < 1000 ? `${g} g` : '1 kg'}
          </Button>
        ))}
        <Button variante="fantasma" tamanho="sm" carregando={lendo} onClick={lerBalanca}>
          {lendo ? 'Lendo balança…' : '⚖ Ler balança'}
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-creme px-4 py-3" aria-live="polite">
        <span className="text-sm font-bold text-tinta-suave">{formatBRL(produto.precoCentavos)}/kg</span>
        <span className="num text-2xl font-black text-uva-700">
          {valido ? formatBRL(multiplicar(produto.precoCentavos, gramas, 'kg')) : '—'}
        </span>
      </div>
      <Button type="submit" variante="sucesso" tamanho="lg" larguraTotal disabled={!valido || lendo}>
        Confirmar peso
      </Button>
    </form>
  )
}
