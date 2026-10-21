import { Input } from '@/components/ui'
import { parseBRL } from '@/lib/money'
import type { Centavos } from '@/types/dominio'

/** Campo de valor em reais usado nos painéis de pagamento. */
export function CampoValor({
  rotulo,
  texto,
  aoMudar,
  erro,
  disabled,
}: {
  rotulo: string
  texto: string
  aoMudar: (t: string) => void
  erro?: string
  disabled?: boolean
}) {
  return (
    <Input
      rotulo={rotulo}
      prefixo="R$"
      inputMode="decimal"
      data-autofocus
      className="num"
      value={texto}
      disabled={disabled}
      onChange={(e) => aoMudar(e.target.value)}
      onFocus={(e) => e.target.select()}
      erro={erro}
    />
  )
}

/** Valida um valor de pagamento parcial contra o restante. */
export function validarValor(texto: string, restante: Centavos, permitirAcima = false): { valor: Centavos | null; erro?: string } {
  const valor = parseBRL(texto)
  if (!texto.trim()) return { valor: null, erro: 'Informe o valor' }
  if (valor === null) return { valor: null, erro: 'Use o formato 12,90' }
  if (valor <= 0) return { valor: null, erro: 'Valor deve ser maior que zero' }
  if (!permitirAcima && valor > restante) return { valor: null, erro: 'Maior que o restante — só dinheiro gera troco' }
  return { valor }
}
