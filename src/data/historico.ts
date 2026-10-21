import type { Cliente, FormaPagamento, ItemVenda, Pagamento, Produto, Venda } from '@/types/dominio'
import { criarAleatorio, type Aleatorio } from '@/lib/aleatorio'
import { calcularTotais } from '@/lib/carrinho'
import { adicionarDias, inicioDoDia } from '@/lib/datas'

/*
 * Gera ~2 semanas de vendas FICTÍCIAS relativas à data de hoje, com picos
 * de movimento de manhã (pão e leite) e no fim da tarde.
 */

const CLIENTES_BASE: Omit<Cliente, 'saldoDevedorCentavos' | 'movimentos'>[] = [
  { id: 'c01', nome: 'Josefa Andrade (Dona Zefa)', telefone: '(16) 90000-0101', limiteCentavos: 50000 },
  { id: 'c02', nome: 'Antônio Prado (Seu Tonico)', telefone: '(16) 90000-0102', limiteCentavos: 30000 },
  { id: 'c03', nome: 'Marlene Souza', telefone: '(16) 90000-0103', limiteCentavos: 40000 },
  { id: 'c04', nome: 'Cláudio Ribeiro', telefone: '(16) 90000-0104', limiteCentavos: 20000 },
  { id: 'c05', nome: 'Juliana Ferraz', telefone: '(16) 90000-0105', limiteCentavos: 60000 },
  { id: 'c06', nome: 'Benedito Lima (Seu Dito)', telefone: '(16) 90000-0106', limiteCentavos: 15000 },
]

// peso relativo de movimento por hora (7h às 20h)
const PESO_HORA: Record<number, number> = {
  7: 6, 8: 9, 9: 6, 10: 4, 11: 6, 12: 5, 13: 3, 14: 3, 15: 3, 16: 5, 17: 8, 18: 9, 19: 6, 20: 3,
}

function sortearHora(rnd: Aleatorio): number {
  const total = Object.values(PESO_HORA).reduce((a, b) => a + b, 0)
  let alvo = rnd.proximo() * total
  for (const [h, p] of Object.entries(PESO_HORA)) {
    alvo -= p
    if (alvo <= 0) return Number(h)
  }
  return 18
}

function sortearForma(rnd: Aleatorio): FormaPagamento {
  const r = rnd.proximo()
  if (r < 0.3) return 'dinheiro'
  if (r < 0.66) return 'pix'
  if (r < 0.84) return 'debito'
  if (r < 0.94) return 'credito'
  return 'fiado'
}

function montarItens(rnd: Aleatorio, produtos: Produto[], hora: number): ItemVenda[] {
  const favoritos = produtos.filter((p) => p.favorito)
  const qtdLinhas = rnd.inteiro(1, rnd.chance(0.25) ? 9 : 4)
  const itens: ItemVenda[] = []
  for (let i = 0; i < qtdLinhas; i++) {
    // de manhã, pão francês aparece muito
    const p =
      hora < 10 && i === 0 && rnd.chance(0.7)
        ? produtos.find((x) => x.nome === 'Pão francês')!
        : rnd.chance(0.45)
          ? rnd.escolher(favoritos)
          : rnd.escolher(produtos)
    if (itens.some((it) => it.produtoId === p.id)) continue
    itens.push({
      produtoId: p.id,
      nome: p.nome,
      ean: p.ean,
      unidade: p.unidade,
      precoUnitarioCentavos: p.precoCentavos,
      quantidade: p.unidade === 'kg' ? rnd.inteiro(15, 140) * 10 : rnd.chance(0.75) ? 1 : rnd.inteiro(2, 4),
      descontoCentavos: 0,
    })
  }
  return itens
}

export interface DadosSemente {
  vendas: Venda[]
  clientes: Cliente[]
}

export function gerarHistorico(produtos: Produto[], agora = new Date(), dias = 14): DadosSemente {
  const rnd = criarAleatorio(20261019)
  const clientes: Cliente[] = CLIENTES_BASE.map((c) => ({ ...c, saldoDevedorCentavos: 0, movimentos: [] }))
  const vendas: Venda[] = []
  let numero = 1000

  for (let d = dias - 1; d >= 0; d--) {
    const dia = inicioDoDia(adicionarDias(agora, -d))
    const domingo = dia.getDay() === 0
    const qtdVendas = rnd.inteiro(domingo ? 14 : 26, domingo ? 22 : 42)
    const momentos: Date[] = []
    for (let i = 0; i < qtdVendas; i++) {
      const m = new Date(dia)
      m.setHours(sortearHora(rnd), rnd.inteiro(0, 59), rnd.inteiro(0, 59))
      if (m < agora) momentos.push(m)
    }
    momentos.sort((a, b) => a.getTime() - b.getTime())

    for (const momento of momentos) {
      const itens = montarItens(rnd, produtos, momento.getHours())
      const totais = calcularTotais(itens)
      let forma = sortearForma(rnd)
      const pagamentos: Pagamento[] = []
      const id = `v_seed_${numero}`

      if (forma === 'fiado') {
        const cliente = rnd.escolher(clientes)
        if (cliente.saldoDevedorCentavos + totais.total <= cliente.limiteCentavos) {
          cliente.saldoDevedorCentavos += totais.total
          cliente.movimentos.push({
            id: `mf_${id}`, tipo: 'compra', valorCentavos: totais.total, em: momento.toISOString(), vendaId: id,
          })
          pagamentos.push({ forma, valorCentavos: totais.total, clienteId: cliente.id })
        } else {
          forma = 'pix'
        }
      }
      if (pagamentos.length === 0) {
        if (forma === 'dinheiro') {
          const recebido = Math.ceil(totais.total / 1000) * 1000 + (rnd.chance(0.3) ? 1000 : 0)
          pagamentos.push({ forma, valorCentavos: totais.total, recebidoCentavos: recebido, trocoCentavos: recebido - totais.total })
        } else if (rnd.chance(0.06) && totais.total > 2000) {
          // pagamento dividido: parte em dinheiro, resto no cartão
          const parte = Math.floor(totais.total / 2000) * 1000
          pagamentos.push({ forma: 'dinheiro', valorCentavos: parte, recebidoCentavos: parte, trocoCentavos: 0 })
          pagamentos.push({ forma: 'debito', valorCentavos: totais.total - parte, autorizacao: String(rnd.inteiro(100000, 999999)) })
        } else {
          pagamentos.push({ forma, valorCentavos: totais.total, autorizacao: forma === 'pix' ? undefined : String(rnd.inteiro(100000, 999999)) })
        }
      }

      const cancelada = rnd.chance(0.02) && forma !== 'fiado'
      vendas.push({
        id,
        numero: numero++,
        criadaEm: momento.toISOString(),
        itens,
        descontoGeralCentavos: 0,
        subtotalCentavos: totais.subtotal,
        totalCentavos: totais.total,
        pagamentos,
        status: cancelada ? 'cancelada' : 'concluida',
        canceladaEm: cancelada ? new Date(momento.getTime() + 4 * 60_000).toISOString() : undefined,
        sessaoId: 'historico',
        operador: rnd.escolher(['Rita', 'Pedro', 'Lúcia']),
      })
    }

    // alguns clientes acertam a caderneta no fim do dia
    for (const c of clientes) {
      if (c.saldoDevedorCentavos > 0 && rnd.chance(0.12)) {
        const valor = Math.min(c.saldoDevedorCentavos, rnd.inteiro(2, 10) * 1000)
        c.saldoDevedorCentavos -= valor
        const em = new Date(dia)
        em.setHours(19, 30)
        if (em < agora) {
          c.movimentos.push({ id: `mf_pg_${c.id}_${d}`, tipo: 'pagamento', valorCentavos: valor, em: em.toISOString() })
        } else {
          c.saldoDevedorCentavos += valor
        }
      }
    }
  }

  return { vendas, clientes }
}
