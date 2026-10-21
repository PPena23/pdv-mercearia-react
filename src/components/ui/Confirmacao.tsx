import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmacaoProps {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  mensagem: ReactNode
  rotuloConfirmar: string
  perigoso?: boolean
  /** pode ser assíncrono: o botão mostra "carregando" até a Promise resolver */
  aoConfirmar: () => void | Promise<void>
}

export function Confirmacao({ aberto, aoFechar, titulo, mensagem, rotuloConfirmar, perigoso, aoConfirmar }: ConfirmacaoProps) {
  const [processando, setProcessando] = useState(false)

  async function confirmar() {
    setProcessando(true)
    try {
      await aoConfirmar()
      aoFechar()
    } catch {
      // continua aberto: quem chamou já avisou o erro (toast)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      tamanho="sm"
      bloquearFechar={processando}
      rodape={
        <>
          <Button variante="fantasma" onClick={aoFechar} disabled={processando}>
            Voltar
          </Button>
          <Button variante={perigoso ? 'perigo' : 'primario'} carregando={processando} onClick={confirmar}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-tinta-suave">{mensagem}</div>
    </Dialog>
  )
}
