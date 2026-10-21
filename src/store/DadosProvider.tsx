import { createContext, use, useCallback, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Centavos, Cliente, EntradaEstoque } from '@/types/dominio'
import { api, type NovaVenda, type NovoProduto } from '@/services/api'
import { dadosReducer, estadoInicialDados, type AcaoDados, type EstadoDados } from './dadosReducer'

/*
 * Store global dos dados do negócio (produtos, vendas, clientes, entradas).
 * Padrão: a ação chama a API (async) e, se der certo, despacha uma ação
 * tipada para o reducer — o reducer nunca faz efeito colateral.
 * Estado e ações ficam em contextos separados: componentes que só disparam
 * ações não re-renderizam quando os dados mudam.
 */

function mensagemDeErro(e: unknown): string {
  return e instanceof Error ? e.message : 'Erro inesperado'
}

function criarAcoes(dispatch: Dispatch<AcaoDados>) {
  return {
    async carregar() {
      dispatch({ type: 'carga/iniciada' })
      try {
        const dados = await api.carregarTudo()
        dispatch({ type: 'carga/concluida', dados })
      } catch (e) {
        dispatch({ type: 'carga/falhou', erro: mensagemDeErro(e) })
      }
    },
    async salvarProduto(dados: NovoProduto) {
      const produto = await api.salvarProduto(dados)
      dispatch({ type: 'produto/salvo', produto })
      return produto
    },
    async removerProduto(id: string) {
      await api.removerProduto(id)
      dispatch({ type: 'produto/removido', id })
    },
    async registrarEntrada(dados: Omit<EntradaEstoque, 'id' | 'em'>) {
      const { produto, entrada } = await api.registrarEntrada(dados)
      dispatch({ type: 'estoque/entrada', produto, entrada })
      return entrada
    },
    async registrarVenda(dados: NovaVenda) {
      const resultado = await api.registrarVenda(dados)
      dispatch({ type: 'venda/registrada', resultado })
      return resultado.venda
    },
    async cancelarVenda(id: string) {
      const resultado = await api.cancelarVenda(id)
      dispatch({ type: 'venda/cancelada', resultado })
      return resultado.venda
    },
    async salvarCliente(dados: Pick<Cliente, 'nome' | 'telefone' | 'limiteCentavos'> & { id?: string }) {
      const cliente = await api.salvarCliente(dados)
      dispatch({ type: 'cliente/salvo', cliente })
      return cliente
    },
    async receberFiado(clienteId: string, valor: Centavos) {
      const cliente = await api.receberFiado(clienteId, valor)
      dispatch({ type: 'cliente/salvo', cliente })
      return cliente
    },
  }
}

export type AcoesDados = ReturnType<typeof criarAcoes>

const EstadoContext = createContext<EstadoDados | null>(null)
const AcoesContext = createContext<AcoesDados | null>(null)

export function DadosProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(dadosReducer, estadoInicialDados)
  const acoes = useMemo(() => criarAcoes(dispatch), [])

  // carga inicial ao montar o app
  useEffect(() => {
    void acoes.carregar()
  }, [acoes])

  return (
    <AcoesContext value={acoes}>
      <EstadoContext value={estado}>{children}</EstadoContext>
    </AcoesContext>
  )
}

export function useDados(): EstadoDados {
  const ctx = use(EstadoContext)
  if (!ctx) throw new Error('useDados precisa estar dentro de <DadosProvider>')
  return ctx
}

export function useAcoesDados(): AcoesDados {
  const ctx = use(AcoesContext)
  if (!ctx) throw new Error('useAcoesDados precisa estar dentro de <DadosProvider>')
  return ctx
}

/** Atalho para buscar um produto por id com memo. */
export function useProdutoPorId() {
  const { produtos } = useDados()
  const mapa = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  return useCallback((id: string) => mapa.get(id), [mapa])
}
