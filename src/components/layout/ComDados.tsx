import type { ReactNode } from 'react'
import { EstadoErro } from '@/components/ui'
import { useAcoesDados, useDados } from '@/store/DadosProvider'

/**
 * Portão de carregamento reutilizável: mostra o skeleton enquanto a API
 * responde, o estado de erro com "Tentar novamente", ou o conteúdo.
 */
export function ComDados({ esqueleto, children }: { esqueleto: ReactNode; children: ReactNode }) {
  const { status, erro } = useDados()
  const { carregar } = useAcoesDados()

  if (status === 'carregando') {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando dados…</span>
        {esqueleto}
      </div>
    )
  }
  if (status === 'erro') return <EstadoErro mensagem={erro ?? 'Erro desconhecido'} aoTentarDeNovo={carregar} />
  return <>{children}</>
}
