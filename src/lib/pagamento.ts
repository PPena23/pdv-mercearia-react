import type { Centavos, Cliente, FormaPagamento, Pagamento } from '@/types/dominio'
import { somar } from './money'

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
  fiado: 'Fiado',
}

export function totalPago(pagamentos: Pagamento[]): Centavos {
  return somar(pagamentos.map((p) => p.valorCentavos))
}

export function valorRestante(total: Centavos, pagamentos: Pagamento[]): Centavos {
  return Math.max(0, total - totalPago(pagamentos))
}

export function calcularTroco(restante: Centavos, recebido: Centavos): Centavos {
  return Math.max(0, recebido - restante)
}

export type ResultadoPagamento = { ok: true; pagamento: Pagamento } | { ok: false; erro: string }

/**
 * Regra do pagamento dividido: cada forma abate parte do restante.
 * Só dinheiro pode passar do restante (gera troco); as demais não.
 */
export function aplicarPagamento(
  total: Centavos,
  anteriores: Pagamento[],
  forma: FormaPagamento,
  valor: Centavos,
  extras: Pick<Pagamento, 'clienteId' | 'autorizacao'> = {},
): ResultadoPagamento {
  const restante = valorRestante(total, anteriores)
  if (restante === 0) return { ok: false, erro: 'A venda já está totalmente paga' }
  if (!Number.isInteger(valor) || valor <= 0) {
    return { ok: false, erro: 'Informe um valor maior que zero' }
  }

  if (forma === 'dinheiro') {
    const aplicado = Math.min(valor, restante)
    return {
      ok: true,
      pagamento: {
        forma,
        valorCentavos: aplicado,
        recebidoCentavos: valor,
        trocoCentavos: calcularTroco(restante, valor),
      },
    }
  }
  if (valor > restante) {
    return { ok: false, erro: 'Valor maior que o restante — só dinheiro gera troco' }
  }
  return { ok: true, pagamento: { forma, valorCentavos: valor, ...extras } }
}

export function creditoDisponivel(cliente: Cliente): Centavos {
  return Math.max(0, cliente.limiteCentavos - cliente.saldoDevedorCentavos)
}

export function podeComprarFiado(cliente: Cliente, valor: Centavos): boolean {
  return valor <= creditoDisponivel(cliente)
}

/** Notas para o atalho de "valor recebido" no pagamento em dinheiro. */
export const NOTAS_RAPIDAS: Centavos[] = [1000, 2000, 5000, 10000]
