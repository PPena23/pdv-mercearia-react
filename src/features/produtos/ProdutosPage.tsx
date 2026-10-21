import { Suspense, useMemo, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router'
import type { CategoriaId, Produto } from '@/types/dominio'
import { Button, CabecalhoPagina, Card, Confirmacao, EmptyState, Input, Select, Skeleton, useToast } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useAcoesDados, useDados } from '@/store/DadosProvider'
import { useDebounce } from '@/hooks/useDebounce'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { CATEGORIAS, categoria } from '@/lib/categorias'
import { formatBRL, formatQuantidade } from '@/lib/money'
import { normalizar } from '@/lib/scanner'
import { BadgeEstoque } from '@/features/estoque/BadgeEstoque'

const POR_PAGINA = 25

function EsqueletoTabela() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-14" />
      {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  )
}

export function ProdutosPage() {
  useTituloPagina('Produtos')
  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        subtitulo="Catálogo da mercearia: preços, códigos e o que aparece na grade do caixa."
        acoes={
          <Link
            to="/produtos/novo"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-uva-700 px-4 font-bold text-white shadow-[0_2px_0_var(--color-uva-900)] hover:bg-uva-800"
          >
            <span aria-hidden>+</span> Novo produto
          </Link>
        }
      />
      <ComDados esqueleto={<EsqueletoTabela />}>
        <ListaProdutos />
      </ComDados>
      {/* rotas filhas (/produtos/novo, /produtos/:id) renderizam aqui */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </>
  )
}

function ListaProdutos() {
  const { produtos } = useDados()
  const { removerProduto } = useAcoesDados()
  const toast = useToast()
  // filtros na URL: dá pra compartilhar/voltar com o navegador
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const cat = (params.get('categoria') ?? '') as CategoriaId | ''
  const ordem = params.get('ordem') ?? 'nome'
  const [limite, setLimite] = useState(POR_PAGINA)
  const [excluindo, setExcluindo] = useState<Produto | null>(null)
  const termo = useDebounce(busca, 200)

  function setParam(chave: string, valor: string) {
    const novo = new URLSearchParams(params)
    if (valor) novo.set(chave, valor)
    else novo.delete(chave)
    setParams(novo, { replace: true })
    setLimite(POR_PAGINA)
  }

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim())
    const lista = produtos.filter(
      (p) => (!cat || p.categoria === cat) && (!t || normalizar(p.nome).includes(t) || p.ean.includes(t)),
    )
    const cmp: Record<string, (a: Produto, b: Produto) => number> = {
      nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
      'preco-asc': (a, b) => a.precoCentavos - b.precoCentavos,
      'preco-desc': (a, b) => b.precoCentavos - a.precoCentavos,
    }
    return lista.sort(cmp[ordem] ?? cmp.nome)
  }, [produtos, termo, cat, ordem])

  const visiveis = filtrados.slice(0, limite)

  return (
    <>
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Input
          rotulo="Buscar"
          type="search"
          placeholder="Nome ou código…"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setParam('q', e.target.value)
          }}
        />
        <Select rotulo="Categoria" value={cat} onChange={(e) => setParam('categoria', e.target.value)}>
          <option value="">Todas</option>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.nome}
            </option>
          ))}
        </Select>
        <Select rotulo="Ordenar por" value={ordem} onChange={(e) => setParam('ordem', e.target.value === 'nome' ? '' : e.target.value)}>
          <option value="nome">Nome (A–Z)</option>
          <option value="preco-asc">Menor preço</option>
          <option value="preco-desc">Maior preço</option>
        </Select>
      </Card>

      <p className="mb-2 text-sm text-tinta-suave" aria-live="polite">
        {filtrados.length} {filtrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
      </p>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState
            icone="🔍"
            titulo="Nenhum produto com esses filtros"
            descricao="Tente outro nome ou limpe a categoria."
            acao={
              <Button
                variante="secundario"
                onClick={() => {
                  setBusca('')
                  setParams({}, { replace: true })
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-borda">
            {visiveis.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-creme/60">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-creme text-2xl">
                  {categoria(p.categoria).emoji}
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-bold">
                    {p.favorito && <span title="Favorito no caixa" aria-label="Favorito">⭐ </span>}
                    {p.nome}
                  </p>
                  <p className="num text-sm text-tinta-suave">
                    {p.ean} · {categoria(p.categoria).nome}
                  </p>
                </div>
                <div className="num w-28 text-right font-black text-uva-700">
                  {formatBRL(p.precoCentavos)}
                  {p.unidade === 'kg' && <span className="text-xs font-bold text-tinta-suave">/kg</span>}
                </div>
                <div className="flex w-40 items-center justify-end gap-2">
                  <span className="num text-sm text-tinta-suave">{formatQuantidade(Math.max(0, p.estoque), p.unidade)}</span>
                  <BadgeEstoque produto={p} />
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`/produtos/${p.id}`}
                    className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-bold text-uva-700 hover:bg-uva-50"
                  >
                    Editar
                  </Link>
                  <Button variante="fantasma" tamanho="sm" className="h-10 hover:!text-tomate-600" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {limite < filtrados.length && (
            <div className="border-t border-borda p-3 text-center">
              <Button variante="secundario" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Mostrar mais ({filtrados.length - limite} restantes)
              </Button>
            </div>
          )}
        </Card>
      )}

      <Confirmacao
        aberto={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        titulo="Excluir produto?"
        mensagem={
          <>
            <strong className="text-tinta">{excluindo?.nome}</strong> sai do catálogo. Vendas antigas continuam no histórico.
          </>
        }
        rotuloConfirmar="Excluir"
        perigoso
        aoConfirmar={async () => {
          if (!excluindo) return
          try {
            await removerProduto(excluindo.id)
            toast({ tipo: 'sucesso', titulo: 'Produto excluído', descricao: excluindo.nome })
          } catch (e) {
            toast({ tipo: 'erro', titulo: 'Não foi possível excluir', descricao: (e as Error).message })
            throw e
          }
        }}
      />
    </>
  )
}
