import type { Cliente, EntradaEstoque, Produto, Venda } from '@/types/dominio'
import { gerarCatalogo } from '@/data/catalogo'
import { gerarHistorico } from '@/data/historico'

/*
 * "Banco de dados" do back-end simulado. Fica no localStorage para que
 * os dados sobrevivam ao recarregar a página. Só a camada de API mexe aqui.
 */

export interface BancoDados {
  versao: 1
  geradoEm: string
  proximoNumeroVenda: number
  produtos: Produto[]
  vendas: Venda[]
  clientes: Cliente[]
  entradas: EntradaEstoque[]
}

const CHAVE = 'pe-de-feijao:db:v1'

// fallback em memória quando o localStorage estiver bloqueado (aba anônima etc.)
let memoria: BancoDados | null = null

export function criarBancoSemente(agora = new Date()): BancoDados {
  const produtos = gerarCatalogo()
  const { vendas, clientes } = gerarHistorico(produtos, agora)
  return {
    versao: 1,
    geradoEm: agora.toISOString(),
    proximoNumeroVenda: (vendas.at(-1)?.numero ?? 999) + 1,
    produtos,
    vendas,
    clientes,
    entradas: [],
  }
}

export function lerBanco(): BancoDados {
  if (memoria) return memoria
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const db = JSON.parse(bruto) as BancoDados
      if (db.versao === 1) return (memoria = db)
    }
  } catch {
    // ignora e recria abaixo
  }
  memoria = criarBancoSemente()
  gravarBanco(memoria)
  return memoria
}

export function gravarBanco(db: BancoDados): void {
  memoria = db
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db))
  } catch {
    // sem persistência: segue só em memória
  }
}

export function resetarBanco(): void {
  memoria = null
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* nada a fazer */
  }
}
