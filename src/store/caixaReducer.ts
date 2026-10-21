import type { Centavos, FormaPagamento, MovimentoCaixa, SessaoCaixa } from '@/types/dominio'

export interface EstadoCaixa {
  sessao: SessaoCaixa | null
  historico: SessaoCaixa[]
}

export type AcaoCaixa =
  | { type: 'abrir'; id: string; operador: string; trocoInicialCentavos: Centavos; em: string }
  | { type: 'movimento'; movimento: MovimentoCaixa }
  | {
      type: 'fechar'
      contado: Partial<Record<FormaPagamento, Centavos>>
      esperado: Record<FormaPagamento, Centavos>
      em: string
    }

export const caixaInicial: EstadoCaixa = { sessao: null, historico: [] }

export function caixaReducer(estado: EstadoCaixa, acao: AcaoCaixa): EstadoCaixa {
  switch (acao.type) {
    case 'abrir':
      if (estado.sessao) return estado // já existe caixa aberto
      return {
        ...estado,
        sessao: {
          id: acao.id,
          operador: acao.operador,
          abertaEm: acao.em,
          trocoInicialCentavos: acao.trocoInicialCentavos,
          movimentos: [],
        },
      }
    case 'movimento':
      if (!estado.sessao) return estado
      return { ...estado, sessao: { ...estado.sessao, movimentos: [...estado.sessao.movimentos, acao.movimento] } }
    case 'fechar': {
      if (!estado.sessao) return estado
      const fechada: SessaoCaixa = { ...estado.sessao, fechadaEm: acao.em, contado: acao.contado, esperado: acao.esperado }
      return { sessao: null, historico: [fechada, ...estado.historico].slice(0, 30) }
    }
  }
}
