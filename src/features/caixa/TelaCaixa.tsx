import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Pagamento, Produto, Venda } from '@/types/dominio'
import { Button, Card, Confirmacao, useToast } from '@/components/ui'
import { useCarrinho } from '@/hooks/useCarrinho'
import { useAtalhos } from '@/hooks/useAtalhos'
import { useCaixa } from '@/hooks/useCaixa'
import { useAcoesDados, useDados } from '@/store/DadosProvider'
import { formatBRL, formatQuantidade, multiplicar } from '@/lib/money'
import { quantidadeDoMultiplicador } from '@/lib/scanner'
import { totalPago } from '@/lib/pagamento'
import { BuscaProduto } from './BuscaProduto'
import { GradeRapida } from './GradeRapida'
import { ListaCarrinho } from './ListaCarrinho'
import { LegendaAtalhos } from './LegendaAtalhos'
import { PesoDialog } from './PesoDialog'
import { DescontoDialog } from './DescontoDialog'
import { MovimentoDialog } from './MovimentoDialog'
import { CupomDialog } from './CupomDialog'
import { PagamentoDialog } from './pagamento/PagamentoDialog'
import type { LinhaCarrinho } from './carrinhoReducer'

type DialogoAberto = 'desconto' | 'pagamento' | 'movimento' | 'cancelarVenda' | null

/** Tela principal do PDV: busca + grade à esquerda, carrinho + total à direita. */
export function TelaCaixa() {
  const { produtos, clientes } = useDados()
  const { registrarVenda } = useAcoesDados()
  const { sessao, vendasDaSessao } = useCaixa()
  const carrinho = useCarrinho()
  const toast = useToast()

  const buscaRef = useRef<HTMLInputElement>(null)
  const [dialogo, setDialogo] = useState<DialogoAberto>(null)
  const [pesagem, setPesagem] = useState<{ produto: Produto; linha?: LinhaCarrinho } | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [finalizando, setFinalizando] = useState(false)
  const [erroFinalizacao, setErroFinalizacao] = useState<string | null>(null)
  const [vendaConcluida, setVendaConcluida] = useState<Venda | null>(null)
  const [anuncio, setAnuncio] = useState('')

  const { linhas, totais, linhaSelecionada } = carrinho
  const algumDialogo = dialogo !== null || pesagem !== null || vendaConcluida !== null

  const focarBusca = useCallback(() => buscaRef.current?.focus(), [])

  // mantém o foco no campo de busca sempre que nenhum diálogo estiver aberto
  useEffect(() => {
    if (!algumDialogo) {
      const t = setTimeout(focarBusca, 0)
      return () => clearTimeout(t)
    }
  }, [algumDialogo, focarBusca])

  // limpa o anúncio para que o mesmo texto seja lido de novo na próxima vez
  useEffect(() => {
    if (!anuncio) return
    const t = setTimeout(() => setAnuncio(''), 1500)
    return () => clearTimeout(t)
  }, [anuncio])

  /* ------------------------------ ações ------------------------------ */

  const adicionar = useCallback(
    (produto: Produto, multiplicador?: string) => {
      const r = quantidadeDoMultiplicador(multiplicador, produto.unidade)
      if (!r.ok) {
        toast({ tipo: 'erro', titulo: r.erro })
        return
      }
      if (r.quantidade === 0) {
        setPesagem({ produto }) // item pesável sem peso: abre a balança
        return
      }
      carrinho.adicionar(produto, r.quantidade)
      setAnuncio(`${produto.nome}, ${formatQuantidade(r.quantidade, produto.unidade)}, adicionado.`)
      if (produto.estoque - r.quantidade < 0) {
        toast({ tipo: 'info', titulo: 'Estoque no sistema zerado', descricao: `${produto.nome}: confira a entrada de mercadoria.` })
      }
    },
    [carrinho.adicionar, toast],
  )

  const escolherNaGrade = useCallback((p: Produto) => adicionar(p), [adicionar])

  function confirmarPeso(gramas: number) {
    if (!pesagem) return
    if (pesagem.linha) carrinho.definirQuantidade(pesagem.linha.linhaId, gramas)
    else {
      carrinho.adicionar(pesagem.produto, gramas)
      setAnuncio(`${pesagem.produto.nome}, ${formatQuantidade(gramas, 'kg')}, ${formatBRL(multiplicar(pesagem.produto.precoCentavos, gramas, 'kg'))}.`)
    }
    setPesagem(null)
  }

  const removerLinha = useCallback(
    (linhaId: string) => {
      const removida = carrinho.remover(linhaId)
      if (!removida) return
      setAnuncio(`${removida.linha.nome} removido.`)
      toast({
        titulo: 'Item removido',
        descricao: removida.linha.nome,
        acao: { rotulo: 'Desfazer', aoClicar: () => carrinho.restaurar(removida.linha, removida.indice) },
      })
    },
    [carrinho.remover, carrinho.restaurar, toast],
  )

  const repesar = useCallback(
    (linha: LinhaCarrinho) => {
      const produto = produtos.find((p) => p.id === linha.produtoId)
      if (produto) setPesagem({ produto, linha })
    },
    [produtos],
  )

  function abrirPagamento() {
    if (linhas.length === 0) {
      toast({ tipo: 'info', titulo: 'Adicione itens antes de finalizar' })
      return
    }
    setErroFinalizacao(null)
    setDialogo('pagamento')
  }

  async function finalizarVenda() {
    if (!sessao) return
    setFinalizando(true)
    setErroFinalizacao(null)
    try {
      const venda = await registrarVenda({
        itens: linhas.map(({ linhaId: _ignorado, ...item }) => item),
        descontoGeralCentavos: totais.descontoGeral,
        pagamentos,
        sessaoId: sessao.id,
        operador: sessao.operador,
      })
      carrinho.limpar()
      setPagamentos([])
      setDialogo(null)
      setVendaConcluida(venda)
      setAnuncio(`Venda ${venda.numero} concluída.`)
    } catch (e) {
      setErroFinalizacao((e as Error).message)
    } finally {
      setFinalizando(false)
    }
  }

  useAtalhos(
    {
      F2: focarBusca,
      F4: () => linhas.length > 0 && setDialogo('desconto'),
      F8: () => linhaSelecionada && removerLinha(linhaSelecionada.linhaId),
      F10: abrirPagamento,
    },
    !algumDialogo,
  )

  const pago = totalPago(pagamentos)

  /* ------------------------------ tela ------------------------------ */

  return (
    <div className="pb-28 lg:pb-0">
      {/* região lida por leitores de tela a cada item adicionado/removido */}
      <p className="sr-only" aria-live="polite" role="status">
        {anuncio}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-black sm:text-2xl">
          Caixa <span className="font-bold text-tinta-suave">· {sessao?.operador}</span>
        </h1>
        <span className="hidden text-sm text-tinta-suave sm:inline">
          {vendasDaSessao.length} {vendasDaSessao.length === 1 ? 'venda' : 'vendas'} nesta sessão
        </span>
        <Button variante="secundario" tamanho="sm" onClick={() => setDialogo('movimento')}>
          Sangria / suprimento
        </Button>
        <Link
          to="/caixa/fechamento"
          className="inline-flex h-9 items-center rounded-xl border-2 border-uva-200 bg-papel px-3 text-sm font-bold text-uva-700 hover:border-uva-500"
        >
          Fechar caixa
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        {/* coluna esquerda: busca e grade */}
        <div className="min-w-0 space-y-4">
          <BuscaProduto ref={buscaRef} produtos={produtos} aoEscolher={adicionar} aoErro={(m) => toast({ tipo: 'erro', titulo: m })} />
          <GradeRapida produtos={produtos} aoEscolher={escolherNaGrade} />
          <LegendaAtalhos />
        </div>

        {/* coluna direita: cesta + totais */}
        <Card className="flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7.5rem)]">
          <div className="flex items-center justify-between border-b border-borda px-4 py-3">
            <h2 className="font-extrabold">
              Cesta <span className="num text-tinta-suave">({totais.volumes} {totais.volumes === 1 ? 'volume' : 'volumes'})</span>
            </h2>
            {linhas.length > 0 && (
              <Button variante="fantasma" tamanho="sm" onClick={() => setDialogo('cancelarVenda')}>
                Cancelar venda
              </Button>
            )}
          </div>

          <div className="min-h-48 flex-1 overflow-y-auto p-2">
            <ListaCarrinho
              linhas={linhas}
              selecionada={carrinho.selecionada}
              aoSelecionar={carrinho.selecionar}
              aoAlterarQtd={carrinho.alterarQuantidade}
              aoRepesar={repesar}
              aoRemover={removerLinha}
            />
          </div>

          <div className="border-t border-borda p-4">
            <dl className="num space-y-1 text-[15px]">
              <div className="flex justify-between text-tinta-suave">
                <dt>Subtotal</dt>
                <dd>{formatBRL(totais.subtotal)}</dd>
              </div>
              {totais.descontoTotal > 0 && (
                <div className="flex justify-between font-bold text-lima-700">
                  <dt>Descontos</dt>
                  <dd>−{formatBRL(totais.descontoTotal)}</dd>
                </div>
              )}
              {pago > 0 && (
                <div className="flex justify-between font-bold text-uva-700">
                  <dt>Já pago (parcial)</dt>
                  <dd>{formatBRL(pago)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-2 flex items-end justify-between rounded-2xl bg-lima-400 px-4 py-3 text-lima-900">
              <span className="text-sm font-black uppercase tracking-wider">Total</span>
              <span key={totais.total} className="num animate-surgir text-4xl font-black tracking-tight xl:text-5xl">
                {formatBRL(totais.total)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variante="secundario" tamanho="lg" atalho="F4" disabled={linhas.length === 0} onClick={() => setDialogo('desconto')}>
                Desconto
              </Button>
              <Button
                variante="secundario"
                tamanho="lg"
                atalho="F8"
                disabled={!linhaSelecionada}
                onClick={() => linhaSelecionada && removerLinha(linhaSelecionada.linhaId)}
              >
                Tirar item
              </Button>
            </div>
            <Button variante="primario" tamanho="xl" larguraTotal atalho="F10" className="mt-2 hidden lg:flex" disabled={linhas.length === 0} onClick={abrirPagamento}>
              Finalizar venda
            </Button>
          </div>
        </Card>
      </div>

      {/* barra fixa de total no celular/tablet retrato */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-papel/95 p-3 backdrop-blur lg:hidden print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">Total · {totais.volumes} vol.</p>
            <p className="num truncate text-3xl font-black text-uva-700">{formatBRL(totais.total)}</p>
          </div>
          <Button variante="sucesso" tamanho="xl" disabled={linhas.length === 0} onClick={abrirPagamento}>
            Finalizar
          </Button>
        </div>
      </div>

      {/* diálogos */}
      <PesoDialog produto={pesagem?.produto ?? null} gramasIniciais={pesagem?.linha?.quantidade} aoFechar={() => setPesagem(null)} aoConfirmar={confirmarPeso} />
      <DescontoDialog
        aberto={dialogo === 'desconto'}
        aoFechar={() => setDialogo(null)}
        linha={linhaSelecionada}
        baseVenda={totais.total}
        descontoGeralAtual={totais.descontoGeral}
        aoAplicarItem={carrinho.descontoItem}
        aoAplicarVenda={carrinho.descontoGeral}
      />
      <PagamentoDialog
        aberto={dialogo === 'pagamento'}
        aoFechar={() => setDialogo(null)}
        total={totais.total}
        pagamentos={pagamentos}
        aoMudarPagamentos={setPagamentos}
        clientes={clientes}
        finalizando={finalizando}
        erroFinalizacao={erroFinalizacao}
        aoFinalizar={finalizarVenda}
      />
      <MovimentoDialog aberto={dialogo === 'movimento'} aoFechar={() => setDialogo(null)} />
      <Confirmacao
        aberto={dialogo === 'cancelarVenda'}
        aoFechar={() => setDialogo(null)}
        titulo="Cancelar a venda atual?"
        mensagem={
          pago > 0
            ? `Há ${formatBRL(pago)} em pagamentos lançados — eles serão estornados (simulado).`
            : 'Todos os itens da cesta serão removidos.'
        }
        rotuloConfirmar="Cancelar venda"
        perigoso
        aoConfirmar={() => {
          carrinho.limpar()
          setPagamentos([])
          toast({ titulo: 'Venda cancelada', tipo: 'info' })
        }}
      />
      <CupomDialog venda={vendaConcluida} clientes={clientes} aoFechar={() => setVendaConcluida(null)} />
    </div>
  )
}
