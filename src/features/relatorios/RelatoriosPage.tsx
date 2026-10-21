import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CabecalhoPagina, Card, EmptyState, Skeleton, Tabs } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useDados } from '@/store/DadosProvider'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { formatBRL } from '@/lib/money'
import { ROTULO_FORMA } from '@/lib/pagamento'
import { faturamento, porDia, porForma, porHora, ticketMedio, topProdutos, vendasNoPeriodo } from '@/lib/relatorios'

type Periodo = '1' | '7' | '14'

// cores dos gráficos vêm dos tokens do tema (uma série = um matiz)
const COR_SERIE = 'var(--color-uva-500)'
const COR_DESTAQUE = 'var(--color-lima-700)'
const EIXO = { fontSize: 12, fill: 'var(--color-tinta-suave)' }
const reaisCurto = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${v.toFixed(0)}`)

function Dica({ active, payload, label, formatar }: { active?: boolean; payload?: { value: number }[]; label?: string; formatar: (v: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-borda bg-papel px-3 py-2 text-sm shadow-elevado">
      <p className="font-bold capitalize">{label}</p>
      <p className="num text-tinta-suave">{formatar(payload[0].value)}</p>
    </div>
  )
}

function Grafico({ titulo, subtitulo, children, className }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className ?? ''}`}>
      <h2 className="font-extrabold">{titulo}</h2>
      {subtitulo && <p className="text-sm text-tinta-suave">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

/** Exportação default para funcionar com React.lazy (code splitting). */
export default function RelatoriosPage() {
  useTituloPagina('Relatórios')
  const [periodo, setPeriodo] = useState<Periodo>('7')
  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios"
        subtitulo="Como a mercearia está indo — só vendas concluídas."
        acoes={
          <Tabs
            variante="segmentado"
            rotulo="Período"
            ativa={periodo}
            aoMudar={setPeriodo}
            className="w-72"
            abas={[
              { id: '1', rotulo: 'Hoje' },
              { id: '7', rotulo: '7 dias' },
              { id: '14', rotulo: '14 dias' },
            ]}
          />
        }
      />
      <ComDados
        esqueleto={
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
            <Skeleton className="h-80" />
          </div>
        }
      >
        <Painel dias={Number(periodo)} />
      </ComDados>
    </>
  )
}

function Painel({ dias }: { dias: number }) {
  const { vendas } = useDados()

  // todas as agregações memorizadas: só recalculam quando vendas/período mudam
  const dados = useMemo(() => {
    const agora = new Date()
    const periodo = vendasNoPeriodo(vendas, dias, agora)
    const hoje = vendasNoPeriodo(vendas, 1, agora)
    const semana = vendasNoPeriodo(vendas, 7, agora)
    return {
      periodo,
      fatHoje: faturamento(hoje),
      qtdHoje: hoje.length,
      fatSemana: faturamento(semana),
      ticket: ticketMedio(periodo),
      fatPeriodo: faturamento(periodo),
      diario: porDia(vendasNoPeriodo(vendas, Math.max(dias, 7), agora), Math.max(dias, 7), agora),
      horas: porHora(periodo),
      formas: porForma(periodo),
      top: topProdutos(periodo),
    }
  }, [vendas, dias])

  const kpis = [
    { rotulo: 'Faturamento hoje', valor: formatBRL(dados.fatHoje), detalhe: `${dados.qtdHoje} vendas`, destaque: true },
    { rotulo: 'Últimos 7 dias', valor: formatBRL(dados.fatSemana), detalhe: 'faturamento' },
    { rotulo: 'Ticket médio', valor: formatBRL(dados.ticket), detalhe: 'no período' },
    { rotulo: 'Vendas no período', valor: String(dados.periodo.length), detalhe: formatBRL(dados.fatPeriodo) },
  ]
  const maxForma = Math.max(1, ...dados.formas.map((f) => f.centavos))
  const totalFormas = dados.formas.reduce((a, f) => a + f.centavos, 0)

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.rotulo}>
            <Card className={k.destaque ? 'border-0 bg-uva-700 p-5 text-white' : 'p-5'}>
              <p className={k.destaque ? 'text-sm font-bold text-uva-200' : 'text-sm font-bold text-tinta-suave'}>{k.rotulo}</p>
              <p className="num mt-1 text-3xl font-black tracking-tight">{k.valor}</p>
              <p className={k.destaque ? 'num text-sm text-lima-300' : 'num text-sm text-tinta-suave'}>{k.detalhe}</p>
            </Card>
          </li>
        ))}
      </ul>

      {dados.periodo.length === 0 ? (
        <Card>
          <EmptyState icone="📉" titulo="Sem vendas no período" descricao="Faça uma venda no caixa ou escolha um período maior." />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Grafico titulo="Faturamento por dia" subtitulo="Em reais">
              <div className="h-64" role="img" aria-label="Gráfico de barras do faturamento diário">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.diario} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-borda)" />
                    <XAxis dataKey="dia" tick={EIXO} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={EIXO} tickLine={false} axisLine={false} tickFormatter={reaisCurto} width={64} />
                    <Tooltip cursor={{ fill: 'var(--color-uva-50)' }} content={<Dica formatar={(v) => formatBRL(Math.round(v * 100))} />} />
                    <Bar dataKey="reais" fill={COR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-bold text-uva-700">Ver dados em tabela</summary>
                <table className="num mt-2 w-full text-left">
                  <thead className="text-tinta-suave">
                    <tr>
                      <th className="py-1">Dia</th>
                      <th className="py-1 text-right">Vendas</th>
                      <th className="py-1 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.diario.map((d) => (
                      <tr key={d.dia} className="border-t border-borda">
                        <td className="py-1 capitalize">{d.dia}</td>
                        <td className="py-1 text-right">{d.vendas}</td>
                        <td className="py-1 text-right">{formatBRL(Math.round(d.reais * 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </Grafico>

            <Grafico titulo="Movimento por hora" subtitulo="Número de vendas — bom para planejar a escala do caixa">
              <div className="h-64" role="img" aria-label="Gráfico de barras com o número de vendas por hora do dia">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.horas} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-borda)" />
                    <XAxis dataKey="hora" tick={EIXO} tickLine={false} axisLine={false} interval={1} />
                    <YAxis tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                    <Tooltip cursor={{ fill: 'var(--color-lima-50)' }} content={<Dica formatar={(v) => `${v} vendas`} />} />
                    <Bar dataKey="vendas" fill={COR_DESTAQUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Grafico>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Grafico titulo="Por forma de pagamento">
              <ul className="space-y-3">
                {dados.formas.map((f) => (
                  <li key={f.forma}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold">{ROTULO_FORMA[f.forma]}</span>
                      <span className="num text-tinta-suave">
                        {formatBRL(f.centavos)} · {totalFormas ? Math.round((f.centavos / totalFormas) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-creme">
                      <div className="h-full rounded-full bg-uva-500" style={{ width: `${(f.centavos / maxForma) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Grafico>

            <Grafico titulo="Produtos que mais faturaram">
              <ol className="space-y-2">
                {dados.top.map((p, i) => (
                  <li key={p.nome} className="flex items-center gap-3">
                    <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-uva-50 text-sm font-black text-uva-700">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{p.nome}</span>
                    <span className="num text-sm text-tinta-suave">{p.vezes}×</span>
                    <span className="num w-24 text-right font-extrabold">{formatBRL(p.centavos)}</span>
                  </li>
                ))}
              </ol>
            </Grafico>
          </div>
        </>
      )}
    </div>
  )
}
