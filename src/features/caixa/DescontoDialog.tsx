import { useState, type FormEvent } from 'react'
import type { Centavos } from '@/types/dominio'
import { Button, Dialog, Input, Tabs } from '@/components/ui'
import { formatBRL, parseBRL, percentual } from '@/lib/money'
import type { LinhaCarrinho } from './carrinhoReducer'
import { brutoItem } from '@/lib/carrinho'

type Alvo = 'item' | 'venda'
type Modo = 'valor' | 'percentual'

interface Props {
  aberto: boolean
  aoFechar: () => void
  linha: LinhaCarrinho | null
  /** base para o desconto na venda inteira (total após descontos por item) */
  baseVenda: Centavos
  descontoGeralAtual: Centavos
  aoAplicarItem: (linhaId: string, centavos: Centavos) => void
  aoAplicarVenda: (centavos: Centavos) => void
}

/** Regra de negócio: acima de 20% o desconto exige autorização do gerente. */
const LIMITE_SEM_AUTORIZACAO = 20

export function DescontoDialog(props: Props) {
  return (
    <Dialog aberto={props.aberto} aoFechar={props.aoFechar} titulo="Aplicar desconto" tamanho="sm">
      {props.aberto && <ConteudoDesconto {...props} />}
    </Dialog>
  )
}

function ConteudoDesconto({ linha, baseVenda, descontoGeralAtual, aoAplicarItem, aoAplicarVenda, aoFechar }: Props) {
  const [alvo, setAlvo] = useState<Alvo>(linha ? 'item' : 'venda')
  const [modo, setModo] = useState<Modo>('percentual')
  const [texto, setTexto] = useState('')
  const [autorizado, setAutorizado] = useState(false)

  const base = alvo === 'item' && linha ? brutoItem(linha) : baseVenda + descontoGeralAtual
  const numero = parseBRL(texto) // em centavos (para % usamos /100)
  const desconto =
    numero === null ? null : modo === 'valor' ? numero : percentual(base, numero / 100)
  const pct = desconto !== null && base > 0 ? (desconto / base) * 100 : 0

  let erro: string | undefined
  if (texto && numero === null) erro = 'Número inválido'
  else if (modo === 'percentual' && numero !== null && numero > 100_00) erro = 'Máximo de 100%'
  else if (desconto !== null && desconto > base) erro = `Desconto maior que ${formatBRL(base)}`

  const precisaAutorizacao = pct > LIMITE_SEM_AUTORIZACAO
  const valido = desconto !== null && !erro && (!precisaAutorizacao || autorizado)

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido || desconto === null) return
    if (alvo === 'item' && linha) aoAplicarItem(linha.linhaId, desconto)
    else aoAplicarVenda(desconto)
    aoFechar()
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <Tabs
        variante="segmentado"
        rotulo="Onde aplicar o desconto"
        ativa={alvo}
        aoMudar={setAlvo}
        abas={[
          ...(linha ? [{ id: 'item' as const, rotulo: 'Neste item' }] : []),
          { id: 'venda' as const, rotulo: 'Na venda toda' },
        ]}
      />
      <p className="truncate text-sm text-tinta-suave">
        {alvo === 'item' && linha ? linha.nome : 'Subtotal da venda'}: <strong className="num text-tinta">{formatBRL(base)}</strong>
      </p>
      <Tabs
        variante="segmentado"
        rotulo="Tipo de desconto"
        ativa={modo}
        aoMudar={(m) => {
          setModo(m)
          setTexto('')
        }}
        abas={[
          { id: 'percentual', rotulo: '% Percentual' },
          { id: 'valor', rotulo: 'R$ Valor' },
        ]}
      />
      <Input
        rotulo={modo === 'valor' ? 'Desconto em reais' : 'Desconto em %'}
        data-autofocus
        inputMode="decimal"
        className="num"
        prefixo={modo === 'valor' ? 'R$' : '%'}
        placeholder={modo === 'valor' ? '0,00' : '10'}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        erro={erro}
      />
      {precisaAutorizacao && !erro && (
        <label className="flex items-start gap-3 rounded-2xl border-2 border-mel-100 bg-mel-50 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 accent-uva-700" checked={autorizado} onChange={(e) => setAutorizado(e.target.checked)} />
          <span>
            <strong className="block text-mel-800">Desconto acima de {LIMITE_SEM_AUTORIZACAO}%</strong>
            Confirmo a autorização do gerente (simulada).
          </span>
        </label>
      )}
      <div className="flex items-center justify-between rounded-2xl bg-lima-50 px-4 py-3" aria-live="polite">
        <span className="text-sm font-bold text-lima-700">Desconto</span>
        <span className="num text-xl font-black text-lima-700">
          {desconto !== null && !erro ? `−${formatBRL(desconto)} (${pct.toFixed(1).replace('.', ',')}%)` : '—'}
        </span>
      </div>
      <div className="flex gap-2">
        {(alvo === 'item' ? (linha?.descontoCentavos ?? 0) : descontoGeralAtual) > 0 && (
          <Button
            variante="fantasma"
            onClick={() => {
              if (alvo === 'item' && linha) aoAplicarItem(linha.linhaId, 0)
              else aoAplicarVenda(0)
              aoFechar()
            }}
          >
            Remover desconto
          </Button>
        )}
        <Button type="submit" variante="primario" tamanho="lg" className="flex-1" disabled={!valido}>
          Aplicar
        </Button>
      </div>
    </form>
  )
}
