import type { Centavos, ItemVenda } from '@/types/dominio'
import { multiplicar, somar } from './money'

export function brutoItem(
  item: Pick<ItemVenda, 'precoUnitarioCentavos' | 'quantidade' | 'unidade'>,
): Centavos {
  return multiplicar(item.precoUnitarioCentavos, item.quantidade, item.unidade)
}

/** Desconto nunca passa do valor bruto da linha nem fica negativo. */
export function descontoValido(item: ItemVenda): Centavos {
  return Math.min(Math.max(0, item.descontoCentavos), brutoItem(item))
}

export function liquidoItem(item: ItemVenda): Centavos {
  return brutoItem(item) - descontoValido(item)
}

export interface TotaisCarrinho {
  subtotal: Centavos
  descontoItens: Centavos
  descontoGeral: Centavos
  descontoTotal: Centavos
  total: Centavos
  volumes: number
}

export function calcularTotais(itens: ItemVenda[], descontoGeralCentavos = 0): TotaisCarrinho {
  const subtotal = somar(itens.map(brutoItem))
  const descontoItens = somar(itens.map(descontoValido))
  const base = subtotal - descontoItens
  const descontoGeral = Math.min(Math.max(0, descontoGeralCentavos), base)
  // cada linha pesável conta como 1 volume
  const volumes = itens.reduce((acc, i) => acc + (i.unidade === 'kg' ? 1 : i.quantidade), 0)
  return {
    subtotal,
    descontoItens,
    descontoGeral,
    descontoTotal: descontoItens + descontoGeral,
    total: base - descontoGeral,
    volumes,
  }
}
