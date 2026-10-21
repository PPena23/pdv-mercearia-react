import type { Cliente, EntradaEstoque, Produto, Venda } from '@/types/dominio'
import type { DadosIniciais, ResultadoVenda } from '@/services/api'

export type StatusCarga = 'carregando' | 'pronto' | 'erro'

export interface EstadoDados extends DadosIniciais {
  status: StatusCarga
  erro: string | null
}

export type AcaoDados =
  | { type: 'carga/iniciada' }
  | { type: 'carga/concluida'; dados: DadosIniciais }
  | { type: 'carga/falhou'; erro: string }
  | { type: 'produto/salvo'; produto: Produto }
  | { type: 'produto/removido'; id: string }
  | { type: 'estoque/entrada'; produto: Produto; entrada: EntradaEstoque }
  | { type: 'venda/registrada'; resultado: ResultadoVenda }
  | { type: 'venda/cancelada'; resultado: ResultadoVenda }
  | { type: 'cliente/salvo'; cliente: Cliente }

export const estadoInicialDados: EstadoDados = {
  status: 'carregando',
  erro: null,
  produtos: [],
  vendas: [],
  clientes: [],
  entradas: [],
}

/** Insere ou substitui pelo id, mantendo a ordem (imutável). */
function upsert<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id)
    ? lista.map((x) => (x.id === item.id ? item : x))
    : [...lista, item]
}

function upsertVarios<T extends { id: string }>(lista: T[], itens: T[]): T[] {
  return itens.reduce(upsert, lista)
}

function aplicarResultadoVenda(estado: EstadoDados, r: ResultadoVenda): EstadoDados {
  return {
    ...estado,
    vendas: upsert<Venda>(estado.vendas, r.venda),
    produtos: upsertVarios(estado.produtos, r.produtos),
    clientes: r.cliente ? upsert(estado.clientes, r.cliente) : estado.clientes,
  }
}

export function dadosReducer(estado: EstadoDados, acao: AcaoDados): EstadoDados {
  switch (acao.type) {
    case 'carga/iniciada':
      return { ...estado, status: 'carregando', erro: null }
    case 'carga/concluida':
      return { ...acao.dados, status: 'pronto', erro: null }
    case 'carga/falhou':
      return { ...estado, status: 'erro', erro: acao.erro }
    case 'produto/salvo':
      return { ...estado, produtos: upsert(estado.produtos, acao.produto) }
    case 'produto/removido':
      return { ...estado, produtos: estado.produtos.filter((p) => p.id !== acao.id) }
    case 'estoque/entrada':
      return {
        ...estado,
        produtos: upsert(estado.produtos, acao.produto),
        entradas: [acao.entrada, ...estado.entradas],
      }
    case 'venda/registrada':
    case 'venda/cancelada':
      return aplicarResultadoVenda(estado, acao.resultado)
    case 'cliente/salvo':
      return { ...estado, clientes: upsert(estado.clientes, acao.cliente) }
  }
}
