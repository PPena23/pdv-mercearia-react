import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Centavos, Cliente, Pagamento } from '@/types/dominio'
import { Button, Spinner } from '@/components/ui'
import { formatBRL, formatDecimal, parseBRL } from '@/lib/money'
import { NOTAS_RAPIDAS, aplicarPagamento, calcularTroco, creditoDisponivel } from '@/lib/pagamento'
import { normalizar } from '@/lib/scanner'
import { cx } from '@/lib/cx'
import { aguardarPix, gerarTxidPix, processarCartao, type EtapaCartao } from '@/services/maquininha'
import { CampoValor, validarValor } from './CampoValor'
import { QrCodeFicticio } from './QrCodeFicticio'

export interface PropsPainel {
  restante: Centavos
  aoLancar: (pagamento: Pagamento) => void
  aoOcupar: (ocupado: boolean) => void
}

/* ---------------------------------- Dinheiro ---------------------------------- */

export function PainelDinheiro({ restante, aoLancar }: PropsPainel) {
  const [texto, setTexto] = useState(formatDecimal(restante))
  const recebido = parseBRL(texto)
  const { erro } = validarValor(texto, restante, true)
  const troco = recebido !== null ? calcularTroco(restante, recebido) : 0

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (recebido === null || erro) return
    const r = aplicarPagamento(restante, [], 'dinheiro', recebido)
    if (r.ok) aoLancar(r.pagamento)
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <CampoValor rotulo="Valor recebido" texto={texto} aoMudar={setTexto} erro={texto ? erro : undefined} />
      <div className="grid grid-cols-5 gap-2">
        <Button variante="secundario" tamanho="lg" className="px-2" onClick={() => setTexto(formatDecimal(restante))}>
          Exato
        </Button>
        {NOTAS_RAPIDAS.map((nota) => (
          <Button key={nota} variante="secundario" tamanho="lg" className="num px-2" onClick={() => setTexto(formatDecimal(nota))}>
            {nota / 100}
          </Button>
        ))}
      </div>
      <div
        className={cx('flex items-center justify-between rounded-2xl px-4 py-3', troco > 0 ? 'bg-lima-100' : 'bg-creme')}
        aria-live="polite"
      >
        <span className="font-extrabold text-tinta-suave">Troco</span>
        <span className={cx('num text-3xl font-black', troco > 0 ? 'text-lima-900' : 'text-tinta-suave')}>{formatBRL(troco)}</span>
      </div>
      <Button type="submit" variante="sucesso" tamanho="xl" larguraTotal disabled={!!erro}>
        Lançar dinheiro
      </Button>
    </form>
  )
}

/* ------------------------------------ Pix ------------------------------------ */

export function PainelPix({ restante, aoLancar, aoOcupar }: PropsPainel) {
  const [texto, setTexto] = useState(formatDecimal(restante))
  const [cobranca, setCobranca] = useState<{ txid: string; valor: Centavos } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const confirmarAgoraRef = useRef<(() => void) | null>(null)
  const { valor, erro } = validarValor(texto, restante)

  // ao desmontar (fechar diálogo / trocar de aba) cancela a espera
  useEffect(() => () => abortRef.current?.abort(), [])

  async function gerar(e: FormEvent) {
    e.preventDefault()
    if (valor === null) return
    const controle = new AbortController()
    abortRef.current = controle
    const txid = gerarTxidPix()
    setCobranca({ txid, valor })
    aoOcupar(true)
    try {
      // corrida entre a "confirmação do banco" e o botão de simular confirmação
      const manual = new Promise<{ e2eId: string }>((resolve) => {
        confirmarAgoraRef.current = () => resolve({ e2eId: 'E-MANUAL-' + txid.slice(-6) })
      })
      const { e2eId } = await Promise.race([aguardarPix(controle.signal), manual])
      aoLancar({ forma: 'pix', valorCentavos: valor, autorizacao: e2eId })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') throw err
    } finally {
      aoOcupar(false)
      setCobranca(null)
    }
  }

  if (cobranca) {
    const copiaECola = `00020126PIX.FICTICIO.PEDEFEIJAO52040000530398654${formatDecimal(cobranca.valor).replace(',', '.')}5802BR62${cobranca.txid}`
    return (
      <div className="flex flex-col items-center text-center">
        <div className="rounded-3xl border-2 border-borda bg-white p-3 text-uva-900">
          <QrCodeFicticio conteudo={cobranca.txid} className="size-52" />
        </div>
        <p className="num mt-3 text-2xl font-black">{formatBRL(cobranca.valor)}</p>
        <p role="status" className="mt-1 flex items-center gap-2 font-bold text-uva-700">
          <Spinner className="size-5" /> Aguardando pagamento…
        </p>
        <p className="mt-2 max-w-full truncate rounded-lg bg-creme px-2 py-1 font-mono text-xs text-tinta-suave" title={copiaECola}>
          {copiaECola}
        </p>
        <div className="mt-4 flex w-full gap-2">
          <Button variante="fantasma" className="flex-1" onClick={() => abortRef.current?.abort()}>
            Cancelar cobrança
          </Button>
          <Button variante="secundario" className="flex-1" onClick={() => confirmarAgoraRef.current?.()}>
            Simular confirmação
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={gerar} noValidate className="space-y-4">
      <CampoValor rotulo="Valor no Pix" texto={texto} aoMudar={setTexto} erro={texto ? erro : undefined} />
      <p className="text-sm text-tinta-suave">O QR Code é fictício; a confirmação chega sozinha em alguns segundos.</p>
      <Button type="submit" variante="primario" tamanho="xl" larguraTotal disabled={!!erro}>
        Gerar QR Code Pix
      </Button>
    </form>
  )
}

/* ---------------------------------- Cartão ---------------------------------- */

const ETAPAS: { id: EtapaCartao; rotulo: string }[] = [
  { id: 'insira', rotulo: 'Insira ou aproxime o cartão' },
  { id: 'senha', rotulo: 'Cliente digitando a senha' },
  { id: 'processando', rotulo: 'Processando com o banco' },
]

export function PainelCartao({ restante, aoLancar, aoOcupar, tipo }: PropsPainel & { tipo: 'debito' | 'credito' }) {
  const [texto, setTexto] = useState(formatDecimal(restante))
  const [etapa, setEtapa] = useState<EtapaCartao | null>(null)
  const [recusa, setRecusa] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { valor, erro } = validarValor(texto, restante)

  useEffect(() => () => abortRef.current?.abort(), [])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (valor === null) return
    const controle = new AbortController()
    abortRef.current = controle
    setRecusa(null)
    aoOcupar(true)
    try {
      const resposta = await processarCartao(valor, setEtapa, controle.signal)
      if (resposta.aprovado) aoLancar({ forma: tipo, valorCentavos: valor, autorizacao: resposta.autorizacao })
      else setRecusa(resposta.mensagem)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setRecusa('Falha de comunicação com a maquininha')
    } finally {
      setEtapa(null)
      aoOcupar(false)
    }
  }

  if (etapa) {
    const indice = ETAPAS.findIndex((x) => x.id === etapa)
    return (
      <div className="space-y-4">
        <div className="mx-auto w-48 rounded-[28px] bg-uva-900 p-4 text-center text-white shadow-elevado" aria-hidden>
          <div className="rounded-xl bg-lima-100 px-3 py-4 font-mono text-sm font-bold text-lima-900">
            {tipo === 'debito' ? 'DÉBITO' : 'CRÉDITO'}
            <br />
            {formatBRL(valor ?? 0)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, i) => <span key={i} className="h-4 rounded bg-white/15" />)}
          </div>
        </div>
        <ol className="space-y-2" aria-label="Etapas da maquininha">
          {ETAPAS.map((x, i) => (
            <li key={x.id} className={cx('flex items-center gap-3 rounded-xl px-3 py-2 font-bold', i === indice ? 'bg-uva-50 text-uva-700' : i < indice ? 'text-lima-700' : 'text-tinta-suave/60')}>
              <span className="grid size-6 place-items-center" aria-hidden>
                {i < indice ? '✓' : i === indice ? <Spinner className="size-5" /> : '•'}
              </span>
              {x.rotulo}
            </li>
          ))}
        </ol>
        <p role="status" className="sr-only">{ETAPAS[indice]?.rotulo}</p>
        <Button variante="fantasma" larguraTotal onClick={() => abortRef.current?.abort()}>
          Cancelar na maquininha
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <CampoValor rotulo={`Valor no ${tipo === 'debito' ? 'débito' : 'crédito'}`} texto={texto} aoMudar={setTexto} erro={texto ? erro : undefined} />
      {recusa && (
        <p role="alert" className="rounded-2xl border-2 border-tomate-100 bg-tomate-50 px-4 py-3 font-bold text-tomate-700">
          ✕ {recusa}. Tente de novo ou use outra forma.
        </p>
      )}
      <Button type="submit" variante="primario" tamanho="xl" larguraTotal disabled={!!erro}>
        {recusa ? 'Tentar novamente' : 'Enviar para a maquininha'}
      </Button>
    </form>
  )
}

/* ----------------------------------- Fiado ----------------------------------- */

export function PainelFiado({ restante, aoLancar, clientes }: PropsPainel & { clientes: Cliente[] }) {
  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [texto, setTexto] = useState(formatDecimal(restante))
  const filtrados = useMemo(
    () => clientes.filter((c) => normalizar(c.nome).includes(normalizar(busca))),
    [clientes, busca],
  )
  const cliente = clientes.find((c) => c.id === clienteId) ?? null
  const { valor, erro: erroValor } = validarValor(texto, restante)
  const disponivel = cliente ? creditoDisponivel(cliente) : 0
  const erroLimite =
    cliente && valor !== null && valor > disponivel
      ? `Limite insuficiente: disponível ${formatBRL(disponivel)}`
      : undefined
  const erro = erroValor ?? erroLimite

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!cliente || valor === null || erro) return
    aoLancar({ forma: 'fiado', valorCentavos: valor, clienteId: cliente.id })
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Cliente da caderneta</span>
        <input
          data-autofocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome…"
          className="h-11 w-full rounded-xl border-2 border-borda px-3 focus:border-uva-500 focus:outline-none"
        />
      </label>
      <div role="radiogroup" aria-label="Clientes" className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        {filtrados.map((c) => {
          const disp = creditoDisponivel(c)
          const pct = c.limiteCentavos ? (c.saldoDevedorCentavos / c.limiteCentavos) * 100 : 100
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === clienteId}
              onClick={() => setClienteId(c.id)}
              className={cx(
                'w-full rounded-xl border-2 px-3 py-2 text-left',
                c.id === clienteId ? 'border-uva-500 bg-uva-50' : 'border-borda hover:border-uva-200',
              )}
            >
              <span className="flex justify-between gap-2">
                <span className="truncate font-bold">{c.nome}</span>
                <span className={cx('num shrink-0 text-sm font-bold', disp === 0 ? 'text-tomate-600' : 'text-lima-700')}>
                  {formatBRL(disp)} livre
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-creme" aria-hidden>
                <span className={cx('block h-full rounded-full', pct > 85 ? 'bg-tomate-500' : 'bg-uva-500')} style={{ width: `${Math.min(100, pct)}%` }} />
              </span>
            </button>
          )
        })}
        {filtrados.length === 0 && <p className="py-4 text-center text-sm text-tinta-suave">Nenhum cliente encontrado.</p>}
      </div>
      <CampoValor rotulo="Valor na caderneta" texto={texto} aoMudar={setTexto} erro={texto && cliente ? erro : texto ? erroValor : undefined} />
      <Button type="submit" variante="primario" tamanho="xl" larguraTotal disabled={!cliente || !!erro}>
        {cliente ? `Anotar para ${cliente.nome.split(' ')[0]}` : 'Escolha um cliente'}
      </Button>
    </form>
  )
}
