import { Link, useLocation } from 'react-router'
import { EmptyState } from '@/components/ui'
import { useTituloPagina } from '@/hooks/useTituloPagina'

export function NaoEncontrada() {
  const { pathname } = useLocation()
  useTituloPagina('Página não encontrada')
  return (
    <EmptyState
      className="min-h-[60dvh]"
      icone="🥫"
      titulo="Essa prateleira está vazia"
      descricao={
        <>
          Não encontramos a página <code className="rounded bg-creme px-1.5 font-mono">{pathname}</code>.
        </>
      }
      acao={
        <Link
          to="/caixa"
          className="inline-flex h-12 items-center rounded-2xl bg-uva-700 px-5 font-bold text-white hover:bg-uva-800"
        >
          Voltar para o caixa
        </Link>
      }
    />
  )
}
