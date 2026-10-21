import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { Centavos, Produto } from '@/types/dominio'
import { calcularTotais } from '@/lib/carrinho'
import { gerarId } from '@/lib/aleatorio'
import {
  carrinhoReducer,
  carrinhoVazio,
  type EstadoCarrinho,
  type LinhaCarrinho,
} from '@/features/caixa/carrinhoReducer'

const CHAVE = 'pe-de-feijao:carrinho'

function iniciar(): EstadoCarrinho {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as EstadoCarrinho) : carrinhoVazio
  } catch {
    return carrinhoVazio
  }
}

/**
 * Estado da venda em andamento. Persiste no localStorage para não perder
 * a compra do cliente se a página recarregar no meio do atendimento.
 */
export function useCarrinho() {
  const [estado, dispatch] = useReducer(carrinhoReducer, undefined, iniciar)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado))
    } catch {
      /* ignora */
    }
  }, [estado])

  // totais recalculados só quando itens/desconto mudam
  const totais = useMemo(
    () => calcularTotais(estado.linhas, estado.descontoGeralCentavos),
    [estado.linhas, estado.descontoGeralCentavos],
  )

  const adicionar = useCallback(
    (produto: Produto, quantidade: number) =>
      dispatch({ type: 'adicionar', produto, quantidade, linhaId: gerarId('l') }),
    [],
  )

  /** Remove e devolve a linha + posição, para o "Desfazer". */
  const remover = useCallback(
    (linhaId: string): { linha: LinhaCarrinho; indice: number } | null => {
      const indice = estado.linhas.findIndex((l) => l.linhaId === linhaId)
      if (indice < 0) return null
      dispatch({ type: 'remover', linhaId })
      return { linha: estado.linhas[indice], indice }
    },
    [estado.linhas],
  )

  const acoes = useMemo(
    () => ({
      restaurar: (linha: LinhaCarrinho, indice: number) => dispatch({ type: 'restaurar', linha, indice }),
      alterarQuantidade: (linhaId: string, delta: number) => dispatch({ type: 'alterarQuantidade', linhaId, delta }),
      definirQuantidade: (linhaId: string, quantidade: number) =>
        dispatch({ type: 'definirQuantidade', linhaId, quantidade }),
      descontoItem: (linhaId: string, centavos: Centavos) => dispatch({ type: 'descontoItem', linhaId, centavos }),
      descontoGeral: (centavos: Centavos) => dispatch({ type: 'descontoGeral', centavos }),
      selecionar: (linhaId: string | null) => dispatch({ type: 'selecionar', linhaId }),
      limpar: () => dispatch({ type: 'limpar' }),
    }),
    [],
  )

  const linhaSelecionada = estado.linhas.find((l) => l.linhaId === estado.selecionada) ?? null

  return { ...estado, totais, linhaSelecionada, adicionar, remover, ...acoes }
}

export type Carrinho = ReturnType<typeof useCarrinho>
