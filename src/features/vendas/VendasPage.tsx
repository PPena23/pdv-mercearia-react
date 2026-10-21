import { Suspense, useMemo, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router'
import type { FormaPagamento, Venda } from '@/types/dominio'
import { Badge, Button, CabecalhoPagina, Card, EmptyState, Input, Select, Skeleton } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useDados } from '@/store/DadosProvider'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { FORMAS } from '@/lib/caixa'
import { ROTULO_FORMA } from '@/lib/pagamento'
import { formatBRL } from '@/lib/money'
import { adicionarDias, chaveDia, dataDeInput, formatHora } from '@/lib/datas'
import { cx } from '@/lib/cx'

const POR_PAGINA = 40
const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

export function VendasPage() {
  useTituloPagina('Vendas')
  return (
    <>
      <CabecalhoPagina titulo="Vendas" subtitulo="Histórico com filtros. Toque numa venda para ver o cupom ou cancelar." />
      <ComDados esqueleto={<div className="space-y-2">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>}>
        <ListaVendas />
      </ComDados>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </>
  )
}

function ListaVendas() {
  const { vendas } = useDados()
  const [params, setParams] = useSearchParams()
  const [limite, setLimite] = useState(POR_PAGINA)
  const hoje = chaveDia(new Date())
  const de = params.get('de') ?? chaveDia(adicionarDias(new Date(), -6))
  const ate = params.get('ate') ?? hoje
  const forma = (params.get('forma') ?? '') as FormaPagamento | ''
  const status = params.get('status') ?? ''

  function setParam(chave: string, valor: string) {
    const novo = new URLSearchParams(params)
    novo.set(chave, valor)
    if (!valor) novo.delete(chave)
    setParams(novo, { replace: true })
    setLimite(POR_PAGINA)
  }

  const filtradas = useMemo(() => {
    const ini = dataDeInput(de)
    const fimDia = dataDeInput(ate)
    const fim = fimDia ? adicionarDias(fimDia, 1) : null
    return vendas
      .filter((v) => {
        const d = new Date(v.criadaEm)
        return (
          (!ini || d >= ini) &&
          (!fim || d < fim) &&
          (!forma || v.pagamentos.some((p) => p.forma === forma)) &&
          (!status || v.status === status)
        )
      })
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
  }, [vendas, de, ate, forma, status])

  const concluidas = filtradas.filter((v) => v.status === 'concluida')
  const total = concluidas.reduce((a, v) => a + v.totalCentavos, 0)
  const visiveis = filtradas.slice(0, limite)

  // agrupa por dia para a lista ficar escaneável
  const grupos = useMemo(() => {
    const m = new Map<string, Venda[]>()
    for (const v of visiveis) {
      const k = chaveDia(new Date(v.criadaEm))
      m.set(k, [...(m.get(k) ?? []), v])
    }
    return [...m.entries()]
  }, [visiveis])

  return (
    <>
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input rotulo="De" type="date" value={de} max={ate} onChange={(e) => setParam('de', e.target.value)} />
        <Input rotulo="Até" type="date" value={ate} min={de} max={hoje} onChange={(e) => setParam('ate', e.target.value)} />
        <Select rotulo="Forma de pagamento" value={forma} onChange={(e) => setParam('forma', e.target.value)}>
          <option value="">Todas</option>
          {FORMAS.map((f) => (
            <option key={f} value={f}>
              {ROTULO_FORMA[f]}
            </option>
          ))}
        </Select>
        <Select rotulo="Situação" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Todas</option>
          <option value="concluida">Concluídas</option>
          <option value="cancelada">Canceladas</option>
        </Select>
      </Card>

      <p className="mb-3 text-tinta-suave" aria-live="polite">
        <strong className="num text-tinta">{concluidas.length}</strong> vendas concluídas ·{' '}
        <strong className="num text-tinta">{formatBRL(total)}</strong>
        {filtradas.length > concluidas.length && ` · ${filtradas.length - concluidas.length} canceladas`}
      </p>

      {filtradas.length === 0 ? (
        <Card>
          <EmptyState
            icone="🧾"
            titulo="Nenhuma venda no período"
            descricao="Ajuste as datas ou os filtros."
            acao={
              <Button variante="secundario" onClick={() => setParams({}, { replace: true })}>
                Voltar ao padrão (últimos 7 dias)
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grupos.map(([dia, lista]) => (
            <section key={dia} aria-label={fmtDia.format(dataDeInput(dia)!)}>
              <h2 className="mb-2 flex items-baseline justify-between px-1 text-sm font-extrabold capitalize text-tinta-suave">
                <span>{dia === hoje ? 'Hoje' : fmtDia.format(dataDeInput(dia)!)}</span>
              </h2>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-borda">
                  {lista.map((v) => (
                    <li key={v.id}>
                      <Link
                        to={{ pathname: `/vendas/${v.id}`, search: params.toString() }}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-creme/70"
                      >
                        <span className="num w-14 font-black text-uva-700">#{v.numero}</span>
                        <span className="num w-12 text-sm text-tinta-suave">{formatHora(v.criadaEm)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {v.itens.length} {v.itens.length === 1 ? 'item' : 'itens'} · {v.itens.map((i) => i.nome.split(' ')[0]).slice(0, 3).join(', ')}
                          {v.itens.length > 3 && '…'}
                        </span>
                        <span className="flex gap-1">
                          {v.pagamentos.map((p, i) => (
                            <Badge key={i} tom={p.forma === 'fiado' ? 'mel' : 'uva'}>
                              {ROTULO_FORMA[p.forma]}
                            </Badge>
                          ))}
                        </span>
                        <span className={cx('num w-28 text-right font-black', v.status === 'cancelada' && 'text-tinta-suave line-through')}>
                          {formatBRL(v.totalCentavos)}
                        </span>
                        {v.status === 'cancelada' && <Badge tom="tomate">Cancelada</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          {limite < filtradas.length && (
            <div className="text-center">
              <Button variante="secundario" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Carregar mais ({filtradas.length - limite})
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
