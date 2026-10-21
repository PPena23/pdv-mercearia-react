/*
 * EAN-13: 12 dígitos + 1 dígito verificador.
 * Pesos alternados 1 e 3 da esquerda para a direita; o verificador
 * é o que falta para a soma chegar ao próximo múltiplo de 10.
 */

export function calcularDigitoEAN13(dozeDigitos: string): number {
  if (!/^\d{12}$/.test(dozeDigitos)) {
    throw new Error('São necessários exatamente 12 dígitos')
  }
  const soma = [...dozeDigitos].reduce(
    (acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3),
    0,
  )
  return (10 - (soma % 10)) % 10
}

export function completarEAN13(dozeDigitos: string): string {
  return dozeDigitos + calcularDigitoEAN13(dozeDigitos)
}

export function validarEAN13(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false
  return calcularDigitoEAN13(codigo.slice(0, 12)) === Number(codigo[12])
}

/** Código interno (prefixo 2, faixa reservada para uso da própria loja). */
export function gerarEANInterno(sequencial: number): string {
  return completarEAN13(`2${String(sequencial).padStart(11, '0')}`)
}
