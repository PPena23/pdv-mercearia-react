import { createContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import { caixaInicial, caixaReducer, type AcaoCaixa, type EstadoCaixa } from './caixaReducer'

/* Sessão do caixa (abertura, sangria/suprimento, fechamento), persistida no navegador. */

const CHAVE = 'pe-de-feijao:caixa'

function iniciar(): EstadoCaixa {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as EstadoCaixa) : caixaInicial
  } catch {
    return caixaInicial
  }
}

export const CaixaContext = createContext<{ estado: EstadoCaixa; dispatch: Dispatch<AcaoCaixa> } | null>(null)

export function CaixaProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(caixaReducer, undefined, iniciar)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado))
    } catch {
      /* ignora */
    }
  }, [estado])

  return <CaixaContext value={{ estado, dispatch }}>{children}</CaixaContext>
}
