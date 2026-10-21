import { useState } from 'react'
import type { Centavos, Cliente, FormaPagamento, Pagamento } from '@/types/dominio'
import { Button, Dialog, Tabs, type Aba } from '@/components/ui'
import { formatBRL } from '@/lib/money'
import { ROTULO_FORMA, totalPago, valorRestante } from '@/lib/pagamento'
import { cx } from '@/lib/cx'
import { PainelCartao, PainelDinheiro, PainelFiado, PainelPix } from './paineis'

const ABAS: Aba<FormaPagamento>[] = [
  { id: 'dinheiro', rotulo: 'Dinheiro', icone: '💵' },
  { id: 'pix', rotulo: 'Pix', icone: '⚡' },
  { id: 'debito', rotulo: 'Débito', icone: '💳' },
  { id: 'credito', rotulo: 'Crédito', icone: '💳' },
  { id: 'fiado', rotulo: 'Fiado', icone: '📒' },
]

interface Props {
  aberto: boolean
  aoFechar: () => void
  total: Centavos
  pagamentos: Pagamento[]
  aoMudarPagamentos: (p: Pagamento[]) => void
  clientes: Cliente[]
  finalizando: boolean
  erroFinalizacao: string | null
  aoFinalizar: () => void
}

/**
 * Pagamento com divisão entre formas. Os pagamentos ficam no componente pai
 * (estado "levantado"): fechar o diálogo não perde o que já foi pago.
 */
export function PagamentoDialog({
  aberto,
  aoFechar,
  total,
  pagamentos,
  aoMudarPagamentos,
  clientes,
  finalizando,
  erroFinalizacao,
  aoFinalizar,
}: Props) {
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [ocupado, setOcupado] = useState(false)

  const pago = totalPago(pagamentos)
  const restante = valorRestante(total, pagamentos)
  const troco = pagamentos.reduce((a, p) => a + (p.trocoCentavos ?? 0), 0)
  const excedente = pago > total
  const quitado = restante === 0 && !excedente

  const lancar = (p: Pagamento) => aoMudarPagamentos([...pagamentos, p])
  const nomeCliente = (id?: string) => clientes.find((c) => c.id === id)?.nome.split(' ')[0]

  const propsPainel = { restante, aoLancar: lancar, aoOcupar: setOcupado }

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Pagamento"
      descricao="Divida entre quantas formas precisar. Pagamentos eletrônicos são simulados."
      tamanho="xl"
      bloquearFechar={ocupado || finalizando}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Resumo */}
        <section aria-label="Resumo do pagamento" className="space-y-3">
          <div className="rounded-3xl bg-uva-700 p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-wider text-uva-200">Total da venda</p>
            <p className="num text-4xl font-black">{formatBRL(total)}</p>
          </div>

          {pagamentos.length > 0 && (
            <ul className="space-y-1.5" aria-label="Pagamentos lançados">
              {pagamentos.map((p, i) => (
                <li key={i} className="flex animate-deslizar items-center gap-2 rounded-xl bg-creme px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">
                      {ROTULO_FORMA[p.forma]}
                      {p.forma === 'fiado' && ` · ${nomeCliente(p.clienteId)}`}
                    </span>
                    {p.recebidoCentavos !== undefined && p.recebidoCentavos !== p.valorCentavos && (
                      <span className="num block text-xs text-tinta-suave">recebido {formatBRL(p.recebidoCentavos)}</span>
                    )}
                    {p.autorizacao && <span className="num block text-xs text-tinta-suave">aut. {p.autorizacao}</span>}
                  </span>
                  <span className="num font-extrabold">{formatBRL(p.valorCentavos)}</span>
                  <button
                    type="button"
                    disabled={ocupado || finalizando}
                    onClick={() => aoMudarPagamentos(pagamentos.filter((_, j) => j !== i))}
                    className="grid size-9 place-items-center rounded-lg text-tinta-suave hover:bg-tomate-50 hover:text-tomate-600 disabled:opacity-40"
                    aria-label={`Estornar pagamento em ${ROTULO_FORMA[p.forma]}`}
                    title="Estornar (simulado)"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <dl className="space-y-1 rounded-2xl border-2 border-borda p-4" aria-live="polite">
            <div className="flex justify-between">
              <dt className="text-tinta-suave">Pago</dt>
              <dd className="num font-bold">{formatBRL(pago)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="font-extrabold">Falta</dt>
              <dd className={cx('num text-3xl font-black', quitado ? 'text-lima-700' : 'text-uva-700')}>{formatBRL(restante)}</dd>
            </div>
            {troco > 0 && (
              <div className="flex items-baseline justify-between rounded-xl bg-lima-100 px-3 py-2">
                <dt className="font-extrabold text-lima-900">Troco</dt>
                <dd className="num text-2xl font-black text-lima-900">{formatBRL(troco)}</dd>
              </div>
            )}
          </dl>
          {excedente && (
            <p role="alert" className="rounded-xl bg-tomate-50 p-3 text-sm font-bold text-tomate-700">
              O total mudou e ficou menor que o valor pago. Estorne um pagamento para continuar.
            </p>
          )}
        </section>

        {/* Formas */}
        <section aria-label="Forma de pagamento">
          {quitado ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl bg-lima-50 p-6 text-center">
              <div aria-hidden className="mb-3 grid size-16 place-items-center rounded-full bg-lima-400 text-3xl font-black text-lima-900">
                ✓
              </div>
              <p className="text-xl font-black text-lima-900">Pagamento completo!</p>
              {troco > 0 && <p className="num mt-1 text-lg font-bold">Entregue {formatBRL(troco)} de troco.</p>}
              {erroFinalizacao && (
                <p role="alert" className="mt-3 rounded-xl bg-tomate-50 px-3 py-2 text-sm font-bold text-tomate-700">
                  {erroFinalizacao}
                </p>
              )}
              <Button data-autofocus autoFocus variante="sucesso" tamanho="xl" className="mt-5 w-full" carregando={finalizando} onClick={aoFinalizar}>
                {finalizando ? 'Registrando venda…' : erroFinalizacao ? 'Tentar novamente' : 'Concluir venda'}
              </Button>
            </div>
          ) : (
            // key com o restante: o painel reinicia com o novo valor após cada lançamento
            <Tabs abas={ABAS} ativa={forma} aoMudar={(f) => !ocupado && setForma(f)} rotulo="Formas de pagamento" variante="segmentado">
              {forma === 'dinheiro' && <PainelDinheiro key={`d${restante}`} {...propsPainel} />}
              {forma === 'pix' && <PainelPix key={`p${restante}`} {...propsPainel} />}
              {(forma === 'debito' || forma === 'credito') && <PainelCartao key={`${forma}${restante}`} tipo={forma} {...propsPainel} />}
              {forma === 'fiado' && <PainelFiado key={`f${restante}`} clientes={clientes} {...propsPainel} />}
            </Tabs>
          )}
        </section>
      </div>
    </Dialog>
  )
}
