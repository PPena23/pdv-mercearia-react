import type { Centavos, ItemVenda, Produto } from '@/types/dominio'
import { brutoItem } from '@/lib/carrinho'

export interface LinhaCarrinho extends ItemVenda {
  linhaId: string
}

export interface EstadoCarrinho {
  linhas: LinhaCarrinho[]
  descontoGeralCentavos: Centavos
  selecionada: string | null
}

// Ações tipadas (união discriminada): o TS garante o payload certo para cada `type`
export type AcaoCarrinho =
  | { type: 'adicionar'; produto: Produto; quantidade: number; linhaId: string }
  | { type: 'definirQuantidade'; linhaId: string; quantidade: number }
  | { type: 'alterarQuantidade'; linhaId: string; delta: number }
  | { type: 'remover'; linhaId: string }
  | { type: 'restaurar'; linha: LinhaCarrinho; indice: number }
  | { type: 'descontoItem'; linhaId: string; centavos: Centavos }
  | { type: 'descontoGeral'; centavos: Centavos }
  | { type: 'selecionar'; linhaId: string | null }
  | { type: 'limpar' }

export const carrinhoVazio: EstadoCarrinho = { linhas: [], descontoGeralCentavos: 0, selecionada: null }

function atualizarLinha(
  estado: EstadoCarrinho,
  linhaId: string,
  fn: (l: LinhaCarrinho) => LinhaCarrinho,
): EstadoCarrinho {
  return { ...estado, linhas: estado.linhas.map((l) => (l.linhaId === linhaId ? fn(l) : l)) }
}

export function carrinhoReducer(estado: EstadoCarrinho, acao: AcaoCarrinho): EstadoCarrinho {
  switch (acao.type) {
    case 'adicionar': {
      const { produto, quantidade } = acao
      // item por unidade já no carrinho: só soma a quantidade
      const existente =
        produto.unidade === 'un' ? estado.linhas.find((l) => l.produtoId === produto.id) : undefined
      if (existente) {
        return {
          ...atualizarLinha(estado, existente.linhaId, (l) => ({ ...l, quantidade: l.quantidade + quantidade })),
          selecionada: existente.linhaId,
        }
      }
      const nova: LinhaCarrinho = {
        linhaId: acao.linhaId,
        produtoId: produto.id,
        nome: produto.nome,
        ean: produto.ean,
        unidade: produto.unidade,
        precoUnitarioCentavos: produto.precoCentavos,
        quantidade,
        descontoCentavos: 0,
      }
      return { ...estado, linhas: [...estado.linhas, nova], selecionada: nova.linhaId }
    }
    case 'definirQuantidade':
      if (acao.quantidade <= 0) return carrinhoReducer(estado, { type: 'remover', linhaId: acao.linhaId })
      return atualizarLinha(estado, acao.linhaId, (l) => ({ ...l, quantidade: acao.quantidade }))
    case 'alterarQuantidade': {
      const linha = estado.linhas.find((l) => l.linhaId === acao.linhaId)
      if (!linha) return estado
      return carrinhoReducer(estado, {
        type: 'definirQuantidade',
        linhaId: acao.linhaId,
        quantidade: Math.min(999, linha.quantidade + acao.delta),
      })
    }
    case 'remover': {
      const linhas = estado.linhas.filter((l) => l.linhaId !== acao.linhaId)
      return {
        ...estado,
        linhas,
        selecionada: estado.selecionada === acao.linhaId ? (linhas.at(-1)?.linhaId ?? null) : estado.selecionada,
      }
    }
    case 'restaurar': {
      const linhas = [...estado.linhas]
      linhas.splice(Math.min(acao.indice, linhas.length), 0, acao.linha)
      return { ...estado, linhas, selecionada: acao.linha.linhaId }
    }
    case 'descontoItem':
      return atualizarLinha(estado, acao.linhaId, (l) => ({
        ...l,
        descontoCentavos: Math.min(Math.max(0, acao.centavos), brutoItem(l)),
      }))
    case 'descontoGeral':
      return { ...estado, descontoGeralCentavos: Math.max(0, acao.centavos) }
    case 'selecionar':
      return { ...estado, selecionada: acao.linhaId }
    case 'limpar':
      return carrinhoVazio
  }
}
