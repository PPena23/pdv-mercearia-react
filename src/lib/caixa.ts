import type { Centavos, FormaPagamento, SessaoCaixa, Venda } from '@/types/dominio'

export const FORMAS: FormaPagamento[] = ['dinheiro', 'pix', 'debito', 'credito', 'fiado']

export type ValoresPorForma = Record<FormaPagamento, Centavos>

export function zeradoPorForma(): ValoresPorForma {
  return { dinheiro: 0, pix: 0, debito: 0, credito: 0, fiado: 0 }
}

/** Soma o que entrou por forma de pagamento (vendas canceladas não contam). */
export function vendasPorForma(vendas: Venda[]): ValoresPorForma {
  const r = zeradoPorForma()
  for (const v of vendas) {
    if (v.status !== 'concluida') continue
    for (const p of v.pagamentos) r[p.forma] += p.valorCentavos
  }
  return r
}

/**
 * Valor esperado em cada forma ao fechar o caixa.
 * Dinheiro na gaveta = troco inicial + vendas em dinheiro + suprimentos − sangrias.
 */
export function esperadoNoFechamento(sessao: SessaoCaixa, vendasDaSessao: Venda[]): ValoresPorForma {
  const r = vendasPorForma(vendasDaSessao)
  const somaTipo = (tipo: 'sangria' | 'suprimento') =>
    sessao.movimentos.filter((m) => m.tipo === tipo).reduce((a, m) => a + m.valorCentavos, 0)
  r.dinheiro += sessao.trocoInicialCentavos + somaTipo('suprimento') - somaTipo('sangria')
  return r
}

/** Contado − esperado: positivo = sobra, negativo = falta. */
export function diferencas(
  esperado: ValoresPorForma,
  contado: Partial<ValoresPorForma>,
): ValoresPorForma {
  const r = zeradoPorForma()
  for (const f of FORMAS) r[f] = (contado[f] ?? 0) - esperado[f]
  return r
}
