import type { Centavos, Cliente, EntradaEstoque, ItemVenda, Pagamento, Produto, Venda } from '@/types/dominio'
import { gerarId } from '@/lib/aleatorio'
import { calcularTotais } from '@/lib/carrinho'
import { podeComprarFiado, totalPago } from '@/lib/pagamento'
import { lerBanco, gravarBanco, resetarBanco, type BancoDados } from './db'
import { ErroApi, simularRede } from './rede'

/*
 * API FICTÍCIA. Cada função devolve uma Promise com atraso, imitando um back-end.
 * As regras críticas (estoque, limite do fiado, numeração) ficam "no servidor".
 */

function mutar<T>(fn: (db: BancoDados) => T): T {
  const db = lerBanco()
  const resultado = fn(db)
  gravarBanco(db)
  return resultado
}

function acharProduto(db: BancoDados, id: string): Produto {
  const p = db.produtos.find((x) => x.id === id)
  if (!p) throw new ErroApi('Produto não encontrado')
  return p
}

function acharCliente(db: BancoDados, id: string): Cliente {
  const c = db.clientes.find((x) => x.id === id)
  if (!c) throw new ErroApi('Cliente não encontrado')
  return c
}

export interface DadosIniciais {
  produtos: Produto[]
  vendas: Venda[]
  clientes: Cliente[]
  entradas: EntradaEstoque[]
}

export type NovoProduto = Omit<Produto, 'id'> & { id?: string }

export interface NovaVenda {
  itens: ItemVenda[]
  descontoGeralCentavos: Centavos
  pagamentos: Pagamento[]
  sessaoId: string
  operador: string
}

/** Resultado de operações que mexem em várias entidades de uma vez. */
export interface ResultadoVenda {
  venda: Venda
  produtos: Produto[]
  cliente?: Cliente
}

export const api = {
  carregarTudo(): Promise<DadosIniciais> {
    return simularRede(() => {
      const { produtos, vendas, clientes, entradas } = lerBanco()
      return { produtos, vendas, clientes, entradas }
    }, [500, 900])
  },

  salvarProduto(dados: NovoProduto): Promise<Produto> {
    return simularRede(() =>
      mutar((db) => {
        const duplicado = db.produtos.find((p) => p.ean === dados.ean && p.id !== dados.id)
        if (duplicado) throw new ErroApi(`O código ${dados.ean} já pertence a "${duplicado.nome}"`)
        if (dados.id) {
          const p = acharProduto(db, dados.id)
          Object.assign(p, dados)
          return p
        }
        const novo: Produto = { ...dados, id: gerarId('p') }
        db.produtos.push(novo)
        return novo
      }),
    )
  },

  removerProduto(id: string): Promise<string> {
    return simularRede(() =>
      mutar((db) => {
        db.produtos = db.produtos.filter((p) => p.id !== id)
        return id
      }),
    )
  },

  registrarEntrada(dados: Omit<EntradaEstoque, 'id' | 'em'>): Promise<{ produto: Produto; entrada: EntradaEstoque }> {
    return simularRede(() =>
      mutar((db) => {
        const produto = acharProduto(db, dados.produtoId)
        produto.estoque += dados.quantidade
        const entrada: EntradaEstoque = { ...dados, id: gerarId('e'), em: new Date().toISOString() }
        db.entradas.unshift(entrada)
        return { produto, entrada }
      }),
    )
  },

  registrarVenda(dados: NovaVenda): Promise<ResultadoVenda> {
    return simularRede(
      () =>
        mutar((db) => {
          if (dados.itens.length === 0) throw new ErroApi('A venda não tem itens')
          const totais = calcularTotais(dados.itens, dados.descontoGeralCentavos)
          if (totalPago(dados.pagamentos) !== totais.total) {
            throw new ErroApi('Pagamentos não fecham com o total da venda')
          }
          const id = gerarId('v')
          // fiado: confere limite de novo no "servidor"
          let cliente: Cliente | undefined
          for (const p of dados.pagamentos.filter((x) => x.forma === 'fiado')) {
            cliente = acharCliente(db, p.clienteId ?? '')
            if (!podeComprarFiado(cliente, p.valorCentavos)) {
              throw new ErroApi(`Limite de fiado de ${cliente.nome} insuficiente`)
            }
            cliente.saldoDevedorCentavos += p.valorCentavos
            cliente.movimentos.push({
              id: gerarId('mf'), tipo: 'compra', valorCentavos: p.valorCentavos, em: new Date().toISOString(), vendaId: id,
            })
          }
          // baixa de estoque
          const produtos = dados.itens.map((item) => {
            const p = acharProduto(db, item.produtoId)
            p.estoque -= item.quantidade
            return p
          })
          const venda: Venda = {
            id,
            numero: db.proximoNumeroVenda++,
            criadaEm: new Date().toISOString(),
            itens: dados.itens,
            descontoGeralCentavos: totais.descontoGeral,
            subtotalCentavos: totais.subtotal,
            totalCentavos: totais.total,
            pagamentos: dados.pagamentos,
            status: 'concluida',
            sessaoId: dados.sessaoId,
            operador: dados.operador,
          }
          db.vendas.push(venda)
          return { venda, produtos, cliente }
        }),
      [400, 800],
    )
  },

  cancelarVenda(id: string): Promise<ResultadoVenda> {
    return simularRede(() =>
      mutar((db) => {
        const venda = db.vendas.find((v) => v.id === id)
        if (!venda) throw new ErroApi('Venda não encontrada')
        if (venda.status === 'cancelada') throw new ErroApi('Venda já estava cancelada')
        venda.status = 'cancelada'
        venda.canceladaEm = new Date().toISOString()
        // devolve o estoque (se o produto ainda existir no catálogo)
        const produtos: Produto[] = []
        for (const item of venda.itens) {
          const p = db.produtos.find((x) => x.id === item.produtoId)
          if (p) {
            p.estoque += item.quantidade
            produtos.push(p)
          }
        }
        // estorna o fiado
        let cliente: Cliente | undefined
        for (const p of venda.pagamentos.filter((x) => x.forma === 'fiado')) {
          cliente = db.clientes.find((c) => c.id === p.clienteId)
          if (cliente) {
            cliente.saldoDevedorCentavos = Math.max(0, cliente.saldoDevedorCentavos - p.valorCentavos)
            cliente.movimentos.push({
              id: gerarId('mf'), tipo: 'estorno', valorCentavos: p.valorCentavos, em: venda.canceladaEm, vendaId: venda.id,
            })
          }
        }
        return { venda, produtos, cliente }
      }),
    )
  },

  salvarCliente(dados: Pick<Cliente, 'nome' | 'telefone' | 'limiteCentavos'> & { id?: string }): Promise<Cliente> {
    return simularRede(() =>
      mutar((db) => {
        if (dados.id) {
          const c = acharCliente(db, dados.id)
          Object.assign(c, dados)
          return c
        }
        const novo: Cliente = { ...dados, id: gerarId('c'), saldoDevedorCentavos: 0, movimentos: [] }
        db.clientes.push(novo)
        return novo
      }),
    )
  },

  receberFiado(clienteId: string, valor: Centavos): Promise<Cliente> {
    return simularRede(() =>
      mutar((db) => {
        const c = acharCliente(db, clienteId)
        if (valor <= 0 || valor > c.saldoDevedorCentavos) {
          throw new ErroApi('Valor deve ser maior que zero e até o saldo devedor')
        }
        c.saldoDevedorCentavos -= valor
        c.movimentos.push({ id: gerarId('mf'), tipo: 'pagamento', valorCentavos: valor, em: new Date().toISOString() })
        return c
      }),
    )
  },

  async restaurarDemonstracao(): Promise<void> {
    resetarBanco()
    await simularRede(() => lerBanco(), [300, 500])
  },
}
