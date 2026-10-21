import type { CategoriaId } from '@/types/dominio'

export interface Categoria {
  id: CategoriaId
  nome: string
  emoji: string
}

export const CATEGORIAS: Categoria[] = [
  { id: 'padaria', nome: 'Padaria', emoji: '🥖' },
  { id: 'hortifruti', nome: 'Hortifrúti', emoji: '🍌' },
  { id: 'laticinios', nome: 'Laticínios', emoji: '🥛' },
  { id: 'mercearia', nome: 'Mercearia', emoji: '🍚' },
  { id: 'bebidas', nome: 'Bebidas', emoji: '🧃' },
  { id: 'frios', nome: 'Frios', emoji: '🧀' },
  { id: 'acougue', nome: 'Açougue', emoji: '🥩' },
  { id: 'doces', nome: 'Doces', emoji: '🍫' },
  { id: 'limpeza', nome: 'Limpeza', emoji: '🧽' },
  { id: 'higiene', nome: 'Higiene', emoji: '🧴' },
]

const POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c])) as Record<CategoriaId, Categoria>

export function categoria(id: CategoriaId): Categoria {
  return POR_ID[id]
}

export const IDS_CATEGORIAS = CATEGORIAS.map((c) => c.id) as [CategoriaId, ...CategoriaId[]]

/*
 * Ícone do produto: procura uma palavra-chave no nome (sem acento) e, se não
 * achar, usa o ícone da categoria. A ordem importa: "pão de queijo" deve cair
 * em pão antes de queijo, por isso as chaves mais específicas vêm primeiro.
 */
const ICONES_POR_NOME: [string, string][] = [
  ['pao de queijo', '🧀'], ['pao', '🍞'], ['bisnaguinha', '🍞'], ['croissant', '🥐'],
  ['bolo', '🍰'], ['sonho', '🍩'], ['rosca', '🍩'], ['biscoito', '🍪'], ['torrada', '🍞'],
  ['banana', '🍌'], ['tomate', '🍅'], ['batata', '🥔'], ['cebola', '🧅'], ['maca', '🍎'],
  ['laranja', '🍊'], ['alface', '🥬'], ['cenoura', '🥕'], ['limao', '🍋'], ['alho', '🧄'],
  ['mamao', '🥭'], ['cheiro-verde', '🌿'], ['abobrinha', '🥒'], ['pepino', '🥒'],
  ['uva', '🍇'], ['abacaxi', '🍍'], ['melancia', '🍉'], ['morango', '🍓'], ['pimentao', '🫑'],
  ['milho', '🌽'], ['ovo', '🥚'],
  ['chocolate', '🍫'], ['doce de leite', '🍯'], ['sorvete', '🍦'], ['leite', '🥛'], ['iogurte', '🥛'], ['manteiga', '🧈'],
  ['queijo', '🧀'], ['requeijao', '🧀'], ['presunto', '🥓'], ['mortadela', '🥓'],
  ['salame', '🥓'], ['bacon', '🥓'], ['linguica', '🌭'], ['salsicha', '🌭'],
  ['frango', '🍗'], ['peixe', '🐟'], ['carne', '🥩'], ['bife', '🥩'], ['costela', '🥩'],
  ['cafe', '☕'], ['cha', '🍵'], ['arroz', '🍚'], ['feijao', '🫘'], ['macarrao', '🍝'],
  ['farinha', '🌾'], ['acucar', '🧂'], ['sal ', '🧂'], ['oleo', '🫒'], ['azeite', '🫒'],
  ['molho', '🥫'], ['extrato', '🥫'], ['sardinha', '🥫'], ['atum', '🥫'], ['milho verde', '🥫'],
  ['agua', '💧'], ['refrigerante', '🥤'], ['suco', '🧃'], ['cerveja', '🍺'], ['vinho', '🍷'],
  ['bala', '🍬'], ['pacoca', '🥜'],
  ['detergente', '🧽'], ['sabao', '🧼'], ['sabonete', '🧼'], ['agua sanitaria', '🧴'],
  ['desinfetante', '🧴'], ['papel higienico', '🧻'], ['papel toalha', '🧻'], ['esponja', '🧽'],
  ['shampoo', '🧴'], ['creme dental', '🪥'], ['escova', '🪥'], ['fralda', '👶'],
]

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function iconeProduto(nome: string, idCategoria: CategoriaId): string {
  const alvo = semAcento(nome) + ' '
  const achado = ICONES_POR_NOME.find(([chave]) => alvo.includes(chave))
  return achado ? achado[1] : categoria(idCategoria).emoji
}
