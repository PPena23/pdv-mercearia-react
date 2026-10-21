import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Badge, Button, Confirmacao, Dialog, EmptyState, useToast } from '@/components/ui'
import { useAcoesDados, useDados } from '@/store/DadosProvider'
import { formatBRL } from '@/lib/money'
import { formatDataHora } from '@/lib/datas'
import { AreaImpressao, Cupom } from '@/features/caixa/Cupom'

/** Rota aninhada /vendas/:vendaId — detalhe em diálogo sobre a lista (os filtros continuam na URL). */
export function VendaDetalhe() {
  const { vendaId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { vendas, clientes, status } = useDados()
  const { cancelarVenda } = useAcoesDados()
  const toast = useToast()
  const [confirmando, setConfirmando] = useState(false)

  const venda = vendas.find((v) => v.id === vendaId)
  const fechar = () => navigate({ pathname: '/vendas', search })

  if (status !== 'pronto') return null

  return (
    <>
      <Dialog
        aberto
        aoFechar={fechar}
        titulo={venda ? `Venda nº ${venda.numero}` : 'Venda'}
        descricao={venda ? `${formatDataHora(venda.criadaEm)} · ${venda.operador}` : undefined}
        tamanho="md"
        rodape={
          venda && (
            <>
              {venda.status === 'concluida' && (
                <Button variante="perigo" onClick={() => setConfirmando(true)} className="mr-auto">
                  Cancelar venda
                </Button>
              )}
              <Button variante="secundario" onClick={() => window.print()}>
                🖨️ Reimprimir
              </Button>
              <Button onClick={fechar}>Fechar</Button>
            </>
          )
        }
      >
        {!venda ? (
          <EmptyState icone="🔎" titulo="Venda não encontrada" descricao="O link pode estar errado ou a venda não existe mais." />
        ) : (
          <>
            {venda.status === 'cancelada' && (
              <p className="mb-3 flex items-center gap-2 rounded-xl bg-tomate-50 px-3 py-2 text-sm font-bold text-tomate-700">
                <Badge tom="tomate">Cancelada</Badge>
                {venda.canceladaEm && `em ${formatDataHora(venda.canceladaEm)} — estoque devolvido`}
              </p>
            )}
            <div className="rounded-2xl bg-creme p-3">
              <div className="mx-auto w-[80mm] max-w-full bg-white shadow-cartao">
                <Cupom venda={venda} clientes={clientes} />
              </div>
            </div>
            <AreaImpressao venda={venda} clientes={clientes} />
          </>
        )}
      </Dialog>

      {venda && (
        <Confirmacao
          aberto={confirmando}
          aoFechar={() => setConfirmando(false)}
          titulo={`Cancelar a venda nº ${venda.numero}?`}
          mensagem={`Os ${venda.itens.length} itens voltam para o estoque${venda.pagamentos.some((p) => p.forma === 'fiado') ? ' e o valor sai da caderneta do cliente' : ''}. O total de ${formatBRL(venda.totalCentavos)} deixa de contar no faturamento.`}
          rotuloConfirmar="Sim, cancelar venda"
          perigoso
          aoConfirmar={async () => {
            try {
              await cancelarVenda(venda.id)
              toast({ tipo: 'sucesso', titulo: `Venda nº ${venda.numero} cancelada`, descricao: 'Estoque devolvido.' })
            } catch (e) {
              toast({ tipo: 'erro', titulo: 'Não foi possível cancelar', descricao: (e as Error).message })
              throw e
            }
          }}
        />
      )}
    </>
  )
}
