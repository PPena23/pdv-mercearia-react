import type { Centavos } from '@/types/dominio'
import { esperar } from './rede'

/*
 * Simulação de meios de pagamento eletrônicos. NENHUM pagamento real acontece:
 * são apenas Promises com atrasos para exercitar estados assíncronos na interface.
 */

export type EtapaCartao = 'insira' | 'senha' | 'processando'

export interface RespostaCartao {
  aprovado: boolean
  autorizacao?: string
  mensagem: string
}

/** Fluxo da maquininha: insira o cartão → senha → processando → aprovado/recusado (~10%). */
export async function processarCartao(
  valor: Centavos,
  aoMudarEtapa: (etapa: EtapaCartao) => void,
  signal: AbortSignal,
): Promise<RespostaCartao> {
  aoMudarEtapa('insira')
  await esperar(1400, signal)
  aoMudarEtapa('senha')
  await esperar(1100, signal)
  aoMudarEtapa('processando')
  await esperar(1300 + Math.random() * 800, signal)
  if (Math.random() < 0.1 || valor <= 0) {
    return { aprovado: false, mensagem: 'Transação recusada pelo emissor (simulado)' }
  }
  return {
    aprovado: true,
    autorizacao: String(Math.floor(100000 + Math.random() * 900000)),
    mensagem: 'Transação aprovada',
  }
}

/** Gera um "txid" para o Pix fictício. */
export function gerarTxidPix(): string {
  const base = 'PEDEFEIJAO' + Date.now().toString(36).toUpperCase()
  return base.padEnd(25, 'X').slice(0, 25)
}

/** Aguarda a "confirmação do banco" do Pix entre 3 e 6 segundos. */
export async function aguardarPix(signal: AbortSignal): Promise<{ confirmado: true; e2eId: string }> {
  await esperar(3000 + Math.random() * 3000, signal)
  return { confirmado: true, e2eId: 'E' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0') }
}
