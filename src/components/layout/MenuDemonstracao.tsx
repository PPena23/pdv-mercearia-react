import { useState } from 'react'
import { Button, Confirmacao, Dialog, Kbd, useToast } from '@/components/ui'
import { api } from '@/services/api'
import { definirSimulacaoFalhas, simulandoFalhas } from '@/services/rede'
import { useAcoesDados } from '@/store/DadosProvider'

/** Opções para quem está avaliando o projeto: resetar dados e simular falhas de rede. */
export function MenuDemonstracao({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { carregar } = useAcoesDados()
  const toast = useToast()
  const [falhas, setFalhas] = useState(simulandoFalhas)
  const [confirmando, setConfirmando] = useState(false)

  async function restaurar() {
    try {
      await api.restaurarDemonstracao()
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Não deu para restaurar', descricao: (e as Error).message })
      return
    }
    try {
      localStorage.removeItem('pe-de-feijao:carrinho')
      localStorage.removeItem('pe-de-feijao:caixa')
    } catch {
      /* ignora */
    }
    // recarrega para zerar também o estado em memória (carrinho/caixa)
    window.location.reload()
  }

  return (
    <>
      <Dialog aberto={aberto && !confirmando} aoFechar={aoFechar} titulo="Demonstração" descricao="Este PDV é um projeto de portfólio: dados fictícios e pagamentos simulados.">
        <div className="space-y-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-borda p-4 hover:border-uva-200">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-uva-700"
              checked={falhas}
              onChange={(e) => {
                setFalhas(e.target.checked)
                definirSimulacaoFalhas(e.target.checked)
              }}
            />
            <span>
              <span className="block font-extrabold">Simular instabilidade de rede</span>
              <span className="text-sm text-tinta-suave">
                ~25% das chamadas à API falham — para ver os estados de erro e o “Tentar novamente”.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variante="secundario"
              onClick={async () => {
                aoFechar()
                await carregar()
                toast({ titulo: 'Dados recarregados da API', tipo: 'info' })
              }}
            >
              Recarregar dados
            </Button>
            <Button variante="perigo" onClick={() => setConfirmando(true)}>
              Restaurar dados de demonstração
            </Button>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Atalhos no caixa</p>
            <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-tinta-suave">
              <span><Kbd>F2</Kbd> buscar</span>
              <span><Kbd>F4</Kbd> desconto</span>
              <span><Kbd>F8</Kbd> cancelar item</span>
              <span><Kbd>F10</Kbd> finalizar</span>
              <span><Kbd>Esc</Kbd> fechar diálogo</span>
            </p>
          </div>
        </div>
      </Dialog>
      <Confirmacao
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo="Restaurar demonstração?"
        mensagem="Produtos, vendas, clientes, carrinho e caixa voltam ao estado inicial. O histórico é gerado de novo a partir de hoje."
        rotuloConfirmar="Restaurar tudo"
        perigoso
        aoConfirmar={restaurar}
      />
    </>
  )
}
