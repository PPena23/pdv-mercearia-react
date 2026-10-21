import { Skeleton } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useCaixa } from '@/hooks/useCaixa'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { AberturaCaixa } from './AberturaCaixa'
import { TelaCaixa } from './TelaCaixa'

function EsqueletoCaixa() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-28 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  )
}

/** Rota /caixa: se não houver sessão aberta, pede a abertura do caixa. */
export function CaixaPage() {
  const { sessao } = useCaixa()
  useTituloPagina(sessao ? 'Caixa' : 'Abertura de caixa')
  return <ComDados esqueleto={<EsqueletoCaixa />}>{sessao ? <TelaCaixa /> : <AberturaCaixa />}</ComDados>
}
