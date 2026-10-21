import type { Cliente, Venda } from '@/types/dominio'
import { Button, Dialog } from '@/components/ui'
import { formatBRL } from '@/lib/money'
import { AreaImpressao, Cupom } from './Cupom'

interface Props {
  venda: Venda | null
  clientes: Cliente[]
  aoFechar: () => void
  rotuloFechar?: string
}

/** Pré-visualização do cupom com impressão (window.print + CSS de impressão). */
export function CupomDialog({ venda, clientes, aoFechar, rotuloFechar = 'Próxima venda' }: Props) {
  const troco = venda?.pagamentos.reduce((a, p) => a + (p.trocoCentavos ?? 0), 0) ?? 0
  return (
    <Dialog
      aberto={venda !== null}
      aoFechar={aoFechar}
      titulo={venda ? `Venda nº ${venda.numero}` : ''}
      descricao={venda ? `Total ${formatBRL(venda.totalCentavos)}${troco ? ` · troco ${formatBRL(troco)}` : ''}` : undefined}
      tamanho="md"
      rodape={
        <>
          <Button variante="secundario" onClick={() => window.print()} icone={<span aria-hidden>🖨️</span>}>
            Imprimir cupom
          </Button>
          <Button variante="sucesso" data-autofocus onClick={aoFechar}>
            {rotuloFechar}
          </Button>
        </>
      }
    >
      {venda && (
        <>
          <div className="rounded-2xl bg-creme p-3">
            <div className="mx-auto w-[80mm] max-w-full border-b-4 border-dotted border-creme bg-white shadow-cartao">
              <Cupom venda={venda} clientes={clientes} />
            </div>
          </div>
          <AreaImpressao venda={venda} clientes={clientes} />
        </>
      )}
    </Dialog>
  )
}
