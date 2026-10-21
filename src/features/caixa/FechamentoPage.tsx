import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, CabecalhoPagina, Card, Confirmacao, EmptyState, Skeleton, useToast } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useCaixa } from '@/hooks/useCaixa'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { FORMAS, diferencas, type ValoresPorForma } from '@/lib/caixa'
import { campoMoeda, centavos } from '@/lib/schemas'
import { formatBRL, formatDecimal, parseBRL } from '@/lib/money'
import { formatDataHora, formatHora } from '@/lib/datas'
import { ROTULO_FORMA } from '@/lib/pagamento'
import { cx } from '@/lib/cx'

const schema = z.object(
  Object.fromEntries(FORMAS.map((f) => [f, campoMoeda(ROTULO_FORMA[f], { permitirZero: true })])) as Record<
    keyof ValoresPorForma,
    ReturnType<typeof campoMoeda>
  >,
)
type Campos = z.infer<typeof schema>

export function FechamentoPage() {
  useTituloPagina('Fechamento de caixa')
  return (
    <ComDados esqueleto={<Skeleton className="h-96" />}>
      <Fechamento />
    </ComDados>
  )
}

function Fechamento() {
  const { sessao, esperado, vendasDaSessao, fechar } = useCaixa()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmando, setConfirmando] = useState<Campos | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<Campos>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    // eletrônicos já vêm conferidos pelo sistema; o dinheiro precisa ser contado
    defaultValues: Object.fromEntries(
      FORMAS.map((f) => [f, f === 'dinheiro' || !esperado ? '' : formatDecimal(esperado[f])]),
    ) as Campos,
  })

  if (!sessao || !esperado) {
    return (
      <EmptyState
        icone="🔒"
        titulo="Nenhum caixa aberto"
        descricao="Abra o caixa para começar a vender. O fechamento aparece aqui depois."
        acao={
          <Link to="/caixa" className="inline-flex h-11 items-center rounded-xl bg-uva-700 px-4 font-bold text-white">
            Ir para o caixa
          </Link>
        }
      />
    )
  }

  const valores = watch()
  const contado = Object.fromEntries(FORMAS.map((f) => [f, parseBRL(valores[f] ?? '') ?? 0])) as ValoresPorForma
  const dif = diferencas(esperado, contado)
  const totalEsperado = FORMAS.reduce((a, f) => a + esperado[f], 0)
  const totalDif = FORMAS.reduce((a, f) => a + dif[f], 0)
  const concluidas = vendasDaSessao.filter((v) => v.status === 'concluida')
  const sangrias = sessao.movimentos.filter((m) => m.tipo === 'sangria')
  const suprimentos = sessao.movimentos.filter((m) => m.tipo === 'suprimento')

  function confirmarFechamento(campos: Campos) {
    fechar(Object.fromEntries(FORMAS.map((f) => [f, centavos(campos[f])])))
    toast({
      tipo: totalDif === 0 ? 'sucesso' : 'info',
      titulo: 'Caixa fechado',
      descricao: totalDif === 0 ? 'Tudo batendo. Bom descanso!' : `Diferença de ${formatBRL(totalDif)} registrada.`,
    })
    navigate('/caixa')
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Fechamento de caixa"
        subtitulo={`${sessao.operador} · aberto em ${formatDataHora(sessao.abertaEm)}`}
        acoes={
          <Link to="/caixa" className="inline-flex h-11 items-center rounded-xl px-4 font-bold text-uva-700 hover:bg-uva-50">
            ← Voltar ao caixa
          </Link>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <form onSubmit={handleSubmit((c) => setConfirmando(c))} noValidate>
            <table className="w-full text-left">
              <caption className="sr-only">Conferência por forma de pagamento</caption>
              <thead className="bg-creme text-sm text-tinta-suave">
                <tr>
                  <th scope="col" className="px-4 py-3">Forma</th>
                  <th scope="col" className="px-4 py-3 text-right">Esperado</th>
                  <th scope="col" className="px-4 py-3">Contado</th>
                  <th scope="col" className="px-4 py-3 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {FORMAS.map((f) => (
                  <tr key={f}>
                    <th scope="row" className="px-4 py-3 font-bold">
                      {ROTULO_FORMA[f]}
                      {f === 'dinheiro' && <span className="block text-xs font-semibold text-tinta-suave">contar a gaveta</span>}
                    </th>
                    <td className="num px-4 py-3 text-right">{formatBRL(esperado[f])}</td>
                    <td className="px-4 py-2">
                      <label className="sr-only" htmlFor={`contado-${f}`}>Contado em {ROTULO_FORMA[f]}</label>
                      <input
                        id={`contado-${f}`}
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-invalid={errors[f] ? true : undefined}
                        className="num h-11 w-full min-w-24 rounded-xl border-2 border-borda px-3 focus:border-uva-500 focus:outline-none aria-[invalid=true]:border-tomate-500"
                        {...register(f)}
                      />
                      {errors[f] && <span className="text-xs font-bold text-tomate-600">{errors[f]?.message}</span>}
                    </td>
                    <td
                      className={cx(
                        'num px-4 py-3 text-right font-extrabold',
                        !valores[f] ? 'text-tinta-suave' : dif[f] === 0 ? 'text-lima-700' : dif[f] > 0 ? 'text-mel-800' : 'text-tomate-600',
                      )}
                    >
                      {valores[f] ? (dif[f] > 0 ? '+' : '') + formatBRL(dif[f]) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-creme font-black">
                <tr>
                  <th scope="row" className="px-4 py-3">Total</th>
                  <td className="num px-4 py-3 text-right">{formatBRL(totalEsperado)}</td>
                  <td className="num px-4 py-3">{formatBRL(FORMAS.reduce((a, f) => a + contado[f], 0))}</td>
                  <td className={cx('num px-4 py-3 text-right', totalDif === 0 ? 'text-lima-700' : totalDif > 0 ? 'text-mel-800' : 'text-tomate-600')}>
                    {(totalDif > 0 ? '+' : '') + formatBRL(totalDif)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-end border-t border-borda p-4">
              <Button type="submit" tamanho="lg" disabled={!isValid}>
                Fechar caixa
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-extrabold">Resumo da sessão</h2>
          <dl className="num grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-creme p-3">
              <dt className="text-tinta-suave">Vendas</dt>
              <dd className="text-2xl font-black">{concluidas.length}</dd>
            </div>
            <div className="rounded-xl bg-creme p-3">
              <dt className="text-tinta-suave">Faturado</dt>
              <dd className="text-2xl font-black">{formatBRL(concluidas.reduce((a, v) => a + v.totalCentavos, 0))}</dd>
            </div>
            <div className="rounded-xl bg-creme p-3">
              <dt className="text-tinta-suave">Troco inicial</dt>
              <dd className="font-black">{formatBRL(sessao.trocoInicialCentavos)}</dd>
            </div>
            <div className="rounded-xl bg-creme p-3">
              <dt className="text-tinta-suave">Canceladas</dt>
              <dd className="font-black">{vendasDaSessao.length - concluidas.length}</dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-extrabold">Movimentos da gaveta</h3>
            {sessao.movimentos.length === 0 ? (
              <p className="text-sm text-tinta-suave">Sem sangrias ou suprimentos.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {[...sangrias, ...suprimentos].map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span>
                      {formatHora(m.em)} · {m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} · {m.motivo}
                    </span>
                    <span className={cx('num font-bold', m.tipo === 'sangria' ? 'text-tomate-600' : 'text-lima-700')}>
                      {m.tipo === 'sangria' ? '−' : '+'}
                      {formatBRL(m.valorCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Confirmacao
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Confirmar fechamento?"
        mensagem={
          totalDif === 0
            ? 'Os valores conferem. Depois de fechar, novas vendas exigem uma nova abertura.'
            : `Há ${totalDif > 0 ? 'sobra' : 'falta'} de ${formatBRL(Math.abs(totalDif))}. A diferença fica registrada no histórico.`
        }
        rotuloConfirmar="Fechar caixa"
        aoConfirmar={() => {
          if (confirmando) confirmarFechamento(confirmando)
        }}
      />
    </>
  )
}
