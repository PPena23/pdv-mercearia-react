import { useMemo, useState } from 'react'
import type { Cliente } from '@/types/dominio'
import { Button, CabecalhoPagina, Card, EmptyState, Input, Skeleton } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useDados } from '@/store/DadosProvider'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { useDebounce } from '@/hooks/useDebounce'
import { formatBRL } from '@/lib/money'
import { formatDataHora } from '@/lib/datas'
import { creditoDisponivel } from '@/lib/pagamento'
import { normalizar } from '@/lib/scanner'
import { cx } from '@/lib/cx'
import { ClienteDialog, RecebimentoDialog } from './dialogos'

export function ClientesPage() {
  useTituloPagina('Clientes do fiado')
  const [editando, setEditando] = useState<Cliente | 'novo' | null>(null)
  return (
    <>
      <CabecalhoPagina
        titulo="Caderneta do fiado"
        subtitulo="Clientes de confiança, limite de crédito e acerto de contas."
        acoes={<Button onClick={() => setEditando('novo')}>+ Novo cliente</Button>}
      />
      <ComDados esqueleto={<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56" />)}</div>}>
        <ListaClientes aoEditar={setEditando} />
      </ComDados>
      <ClienteDialog cliente={editando} aoFechar={() => setEditando(null)} />
    </>
  )
}

const LABEL_MOV = { compra: 'Compra', pagamento: 'Pagamento', estorno: 'Estorno' } as const

function ListaClientes({ aoEditar }: { aoEditar: (c: Cliente) => void }) {
  const { clientes } = useDados()
  const [busca, setBusca] = useState('')
  const [recebendo, setRecebendo] = useState<Cliente | null>(null)
  const termo = useDebounce(busca)

  const filtrados = useMemo(
    () =>
      clientes
        .filter((c) => normalizar(c.nome).includes(normalizar(termo)) || c.telefone.includes(termo))
        .sort((a, b) => b.saldoDevedorCentavos - a.saldoDevedorCentavos),
    [clientes, termo],
  )

  const aReceber = clientes.reduce((a, c) => a + c.saldoDevedorCentavos, 0)
  const devedores = clientes.filter((c) => c.saldoDevedorCentavos > 0).length

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <Card className="border-0 bg-uva-700 p-4 text-white">
          <p className="text-sm font-bold text-uva-200">Total a receber</p>
          <p className="num text-3xl font-black">{formatBRL(aReceber)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-bold text-tinta-suave">Clientes com saldo</p>
          <p className="num text-3xl font-black">
            {devedores}
            <span className="text-lg text-tinta-suave">/{clientes.length}</span>
          </p>
        </Card>
        <Card className="p-4">
          <Input rotulo="Buscar cliente" type="search" placeholder="Nome ou telefone…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </Card>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState icone="📒" titulo="Ninguém na caderneta com esse nome" descricao="Cadastre um novo cliente pelo botão acima." />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => {
            const pct = c.limiteCentavos ? Math.min(100, (c.saldoDevedorCentavos / c.limiteCentavos) * 100) : 0
            const disponivel = creditoDisponivel(c)
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-uva-100 font-black text-uva-700">
                      {c.nome.split(' ').slice(0, 2).map((p) => p[0]).join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{c.nome}</p>
                      <p className="num text-sm text-tinta-suave">{c.telefone}</p>
                    </div>
                    <Button variante="fantasma" tamanho="sm" onClick={() => aoEditar(c)} aria-label={`Editar ${c.nome}`}>
                      Editar
                    </Button>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-tinta-suave">Deve</span>
                      <span className={cx('num text-2xl font-black', c.saldoDevedorCentavos > 0 ? 'text-tinta' : 'text-lima-700')}>
                        {formatBRL(c.saldoDevedorCentavos)}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-creme"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(pct)}
                      aria-label={`Uso do limite de ${c.nome}`}
                    >
                      <div className={cx('h-full rounded-full', pct > 85 ? 'bg-tomate-500' : pct > 60 ? 'bg-mel-500' : 'bg-uva-500')} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="num mt-1.5 flex justify-between text-xs text-tinta-suave">
                      <span>Limite {formatBRL(c.limiteCentavos)}</span>
                      <span className={cx('font-bold', disponivel === 0 && 'text-tomate-600')}>Livre {formatBRL(disponivel)}</span>
                    </p>
                  </div>

                  <details className="group mt-3 text-sm">
                    <summary className="cursor-pointer rounded-lg py-1 font-bold text-uva-700">Extrato ({c.movimentos.length})</summary>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                      {[...c.movimentos].reverse().slice(0, 15).map((m) => (
                        <li key={m.id} className="flex justify-between gap-2">
                          <span className="text-tinta-suave">
                            {formatDataHora(m.em)} · {LABEL_MOV[m.tipo]}
                          </span>
                          <span className={cx('num font-bold', m.tipo === 'compra' ? 'text-tinta' : 'text-lima-700')}>
                            {m.tipo === 'compra' ? '+' : '−'}
                            {formatBRL(m.valorCentavos)}
                          </span>
                        </li>
                      ))}
                      {c.movimentos.length === 0 && <li className="text-tinta-suave">Sem movimentos.</li>}
                    </ul>
                  </details>

                  <div className="mt-auto pt-4">
                    <Button variante="sucesso" larguraTotal disabled={c.saldoDevedorCentavos === 0} onClick={() => setRecebendo(c)}>
                      {c.saldoDevedorCentavos === 0 ? 'Em dia ✓' : 'Receber pagamento'}
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      <RecebimentoDialog cliente={recebendo} aoFechar={() => setRecebendo(null)} />
    </>
  )
}
