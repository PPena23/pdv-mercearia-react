import { use, useMemo } from 'react'
import type { Centavos, FormaPagamento } from '@/types/dominio'
import { CaixaContext } from '@/store/CaixaProvider'
import { useDados } from '@/store/DadosProvider'
import { esperadoNoFechamento } from '@/lib/caixa'
import { gerarId } from '@/lib/aleatorio'

/** Sessão de caixa atual + regras de abertura, sangria/suprimento e fechamento. */
export function useCaixa() {
  const ctx = use(CaixaContext)
  if (!ctx) throw new Error('useCaixa precisa estar dentro de <CaixaProvider>')
  const { estado, dispatch } = ctx
  const { vendas } = useDados()
  const { sessao } = estado

  const vendasDaSessao = useMemo(
    () => (sessao ? vendas.filter((v) => v.sessaoId === sessao.id) : []),
    [vendas, sessao],
  )

  const esperado = useMemo(
    () => (sessao ? esperadoNoFechamento(sessao, vendasDaSessao) : null),
    [sessao, vendasDaSessao],
  )

  return {
    sessao,
    historico: estado.historico,
    vendasDaSessao,
    esperado,
    abrir(operador: string, trocoInicialCentavos: Centavos) {
      dispatch({ type: 'abrir', id: gerarId('cx'), operador, trocoInicialCentavos, em: new Date().toISOString() })
    },
    registrarMovimento(tipo: 'sangria' | 'suprimento', valorCentavos: Centavos, motivo: string) {
      // regra: não dá pra retirar mais dinheiro do que há na gaveta
      if (tipo === 'sangria' && esperado && valorCentavos > esperado.dinheiro) {
        throw new Error('Sangria maior que o dinheiro disponível na gaveta')
      }
      dispatch({
        type: 'movimento',
        movimento: { id: gerarId('mv'), tipo, valorCentavos, motivo, em: new Date().toISOString() },
      })
    },
    fechar(contado: Partial<Record<FormaPagamento, Centavos>>) {
      if (!esperado) return
      dispatch({ type: 'fechar', contado, esperado, em: new Date().toISOString() })
    },
  }
}
