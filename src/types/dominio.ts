// Tipos de domínio do PDV. Todo valor monetário é inteiro em CENTAVOS.
// Quantidades usam a "unidade base": unidades inteiras para 'un' e GRAMAS para 'kg'.

export type Centavos = number

export type Unidade = 'un' | 'kg'

export type CategoriaId =
  | 'padaria'
  | 'hortifruti'
  | 'laticinios'
  | 'mercearia'
  | 'bebidas'
  | 'frios'
  | 'acougue'
  | 'doces'
  | 'limpeza'
  | 'higiene'

export interface Produto {
  id: string
  ean: string
  nome: string
  categoria: CategoriaId
  precoCentavos: Centavos
  unidade: Unidade
  /** em unidades (un) ou gramas (kg) */
  estoque: number
  estoqueMinimo: number
  favorito: boolean
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado'

export interface Pagamento {
  forma: FormaPagamento
  /** valor efetivamente abatido do total da venda */
  valorCentavos: Centavos
  /** só para dinheiro: quanto o cliente entregou */
  recebidoCentavos?: Centavos
  trocoCentavos?: Centavos
  clienteId?: string
  autorizacao?: string
}

export interface ItemVenda {
  produtoId: string
  nome: string
  ean: string
  unidade: Unidade
  precoUnitarioCentavos: Centavos
  quantidade: number
  descontoCentavos: Centavos
}

export type StatusVenda = 'concluida' | 'cancelada'

export interface Venda {
  id: string
  numero: number
  criadaEm: string // ISO
  itens: ItemVenda[]
  descontoGeralCentavos: Centavos
  subtotalCentavos: Centavos
  totalCentavos: Centavos
  pagamentos: Pagamento[]
  status: StatusVenda
  canceladaEm?: string
  sessaoId: string
  operador: string
}

export interface MovimentoFiado {
  id: string
  tipo: 'compra' | 'pagamento' | 'estorno'
  valorCentavos: Centavos
  em: string
  vendaId?: string
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  limiteCentavos: Centavos
  saldoDevedorCentavos: Centavos
  movimentos: MovimentoFiado[]
}

export interface EntradaEstoque {
  id: string
  produtoId: string
  quantidade: number
  custoUnitarioCentavos?: Centavos
  fornecedor?: string
  em: string
}

export interface MovimentoCaixa {
  id: string
  tipo: 'sangria' | 'suprimento'
  valorCentavos: Centavos
  motivo: string
  em: string
}

export interface SessaoCaixa {
  id: string
  operador: string
  abertaEm: string
  trocoInicialCentavos: Centavos
  movimentos: MovimentoCaixa[]
  fechadaEm?: string
  /** valores contados no fechamento, por forma */
  contado?: Partial<Record<FormaPagamento, Centavos>>
  /** valores esperados pelo sistema no momento do fechamento */
  esperado?: Record<FormaPagamento, Centavos>
}
