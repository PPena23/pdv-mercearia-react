import type { Centavos, FormaPagamento, Venda } from '@/types/dominio'
import { adicionarDias, chaveDia, formatDiaCurto, inicioDoDia } from './datas'
import { FORMAS } from './caixa'
import { liquidoItem } from './carrinho'

/* Agregações puras para o painel de relatórios (fáceis de testar). */

export function vendasNoPeriodo(vendas: Venda[], dias: number, agora = new Date()): Venda[] {
  const inicio = inicioDoDia(adicionarDias(agora, -(dias - 1)))
  return vendas.filter((v) => v.status === 'concluida' && new Date(v.criadaEm) >= inicio)
}

export function faturamento(vendas: Venda[]): Centavos {
  return vendas.reduce((a, v) => a + v.totalCentavos, 0)
}

export function ticketMedio(vendas: Venda[]): Centavos {
  return vendas.length ? Math.round(faturamento(vendas) / vendas.length) : 0
}

export function porDia(vendas: Venda[], dias: number, agora = new Date()) {
  const mapa = new Map<string, { centavos: Centavos; qtd: number }>()
  for (const v of vendas) {
    const k = chaveDia(new Date(v.criadaEm))
    const atual = mapa.get(k) ?? { centavos: 0, qtd: 0 }
    mapa.set(k, { centavos: atual.centavos + v.totalCentavos, qtd: atual.qtd + 1 })
  }
  return Array.from({ length: dias }, (_, i) => {
    const d = adicionarDias(inicioDoDia(agora), -(dias - 1 - i))
    const r = mapa.get(chaveDia(d)) ?? { centavos: 0, qtd: 0 }
    return { dia: formatDiaCurto(d), reais: r.centavos / 100, vendas: r.qtd }
  })
}

export function porHora(vendas: Venda[]) {
  const horas = Array.from({ length: 15 }, (_, i) => ({ hora: `${i + 7}h`, vendas: 0, reais: 0 }))
  for (const v of vendas) {
    const h = new Date(v.criadaEm).getHours() - 7
    if (h >= 0 && h < horas.length) {
      horas[h].vendas++
      horas[h].reais += v.totalCentavos / 100
    }
  }
  return horas
}

export function porForma(vendas: Venda[]): { forma: FormaPagamento; centavos: Centavos }[] {
  const r = Object.fromEntries(FORMAS.map((f) => [f, 0])) as Record<FormaPagamento, number>
  for (const v of vendas) for (const p of v.pagamentos) r[p.forma] += p.valorCentavos
  return FORMAS.map((forma) => ({ forma, centavos: r[forma] })).sort((a, b) => b.centavos - a.centavos)
}

export function topProdutos(vendas: Venda[], limite = 8) {
  const mapa = new Map<string, { nome: string; centavos: Centavos; vezes: number }>()
  for (const v of vendas) {
    for (const item of v.itens) {
      const atual = mapa.get(item.produtoId) ?? { nome: item.nome, centavos: 0, vezes: 0 }
      atual.centavos += liquidoItem(item)
      atual.vezes++
      mapa.set(item.produtoId, atual)
    }
  }
  return [...mapa.values()].sort((a, b) => b.centavos - a.centavos).slice(0, limite)
}
