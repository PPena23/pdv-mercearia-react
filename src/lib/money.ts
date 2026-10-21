import type { Centavos, Unidade } from '@/types/dominio'

/*
 * Dinheiro SEMPRE em centavos (inteiros). Em ponto flutuante, 0.1 + 0.2 !== 0.3;
 * somando centavos inteiros o resultado é exato e só formatamos na hora de exibir.
 */

const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(centavos: Centavos): string {
  // Intl usa espaço não separável (U+00A0) entre "R$" e o número
  return formatador.format(centavos / 100)
}

/** Formata sem o símbolo, ex.: 1290 -> "12,90" (útil em inputs) */
export function formatDecimal(centavos: Centavos): string {
  const negativo = centavos < 0
  const abs = Math.abs(Math.round(centavos))
  const reais = Math.floor(abs / 100).toLocaleString('pt-BR')
  const cents = String(abs % 100).padStart(2, '0')
  return `${negativo ? '-' : ''}${reais},${cents}`
}

/**
 * Converte texto digitado ("12,90", "R$ 1.234,5", "7.5", "10") em centavos.
 * Retorna null se o texto não for um valor válido. Não usa float em nenhum momento.
 */
export function parseBRL(texto: string): Centavos | null {
  let t = texto.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!t) return null
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (t.includes('.')) {
    const partes = t.split('.')
    const ultima = partes[partes.length - 1]
    // "1.234" é milhar; "7.5" ou "7.50" é decimal
    t = ultima.length <= 2 && partes.length === 2 ? t : partes.join('')
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t)
  if (!m) return null
  const reais = Number(m[1])
  const cents = Number((m[2] ?? '0').padEnd(2, '0'))
  return reais * 100 + cents
}

/** Preço × quantidade na unidade base (un ou gramas), arredondando ao centavo. */
export function multiplicar(precoCentavos: Centavos, quantidade: number, unidade: Unidade): Centavos {
  return unidade === 'kg'
    ? Math.round((precoCentavos * quantidade) / 1000)
    : precoCentavos * quantidade
}

/** Aplica percentual (ex.: 10 = 10%) sobre um valor, arredondando ao centavo. */
export function percentual(centavos: Centavos, pct: number): Centavos {
  return Math.round((centavos * pct) / 100)
}

export function somar(valores: Centavos[]): Centavos {
  return valores.reduce((acc, v) => acc + v, 0)
}

/** Exibe a quantidade: 3 -> "3 un", 532 (g) -> "0,532 kg" */
export function formatQuantidade(quantidade: number, unidade: Unidade): string {
  if (unidade === 'un') return `${quantidade} un`
  const kg = Math.floor(quantidade / 1000)
  const g = String(quantidade % 1000).padStart(3, '0')
  return `${kg},${g} kg`
}

/** Converte "0,532" / "1.5" / "2" (kg) em gramas inteiros. */
export function parsePesoKg(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  const m = /^(\d{1,3})(?:\.(\d{1,3}))?$/.exec(t)
  if (!m) return null
  const gramas = Number(m[1]) * 1000 + Number((m[2] ?? '0').padEnd(3, '0'))
  return gramas > 0 ? gramas : null
}
