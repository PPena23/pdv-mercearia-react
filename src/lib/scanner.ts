import type { Unidade } from '@/types/dominio'
import { parsePesoKg } from './money'

/*
 * Interpreta o que o operador digitou (ou o leitor de código de barras "digitou"):
 *   7891234567895        -> código EAN
 *   3*7891234567895      -> 3 unidades do código
 *   0,532*2000000000015  -> 0,532 kg do item pesável
 *   banana               -> busca por nome
 */
export type EntradaScanner =
  | { tipo: 'vazio' }
  | { tipo: 'codigo'; codigo: string; multiplicador?: string }
  | { tipo: 'busca'; termo: string; multiplicador?: string }

export function interpretarEntrada(texto: string): EntradaScanner {
  const limpo = texto.trim()
  if (!limpo) return { tipo: 'vazio' }

  let multiplicador: string | undefined
  let resto = limpo
  const m = /^([\d.,]+)\s*[*xX]\s*(.+)$/.exec(limpo)
  if (m) {
    multiplicador = m[1]
    resto = m[2].trim()
  }
  if (/^\d{8,14}$/.test(resto)) return { tipo: 'codigo', codigo: resto, multiplicador }
  return { tipo: 'busca', termo: resto, multiplicador }
}

export type ResultadoQuantidade = { ok: true; quantidade: number } | { ok: false; erro: string }

/**
 * Converte o multiplicador para a unidade base do produto (un ou gramas).
 * Para item pesável sem multiplicador devolve 0 = "precisa pesar".
 */
export function quantidadeDoMultiplicador(
  multiplicador: string | undefined,
  unidade: Unidade,
): ResultadoQuantidade {
  if (multiplicador === undefined) return { ok: true, quantidade: unidade === 'kg' ? 0 : 1 }
  if (unidade === 'un') {
    if (!/^\d+$/.test(multiplicador)) {
      return { ok: false, erro: 'Quantidade fracionada só vale para itens vendidos por kg' }
    }
    const q = Number(multiplicador)
    if (q < 1 || q > 999) return { ok: false, erro: 'Quantidade deve ficar entre 1 e 999' }
    return { ok: true, quantidade: q }
  }
  const gramas = parsePesoKg(multiplicador)
  if (gramas === null) return { ok: false, erro: 'Peso inválido. Use o formato 0,532' }
  return { ok: true, quantidade: gramas }
}

/** Normaliza para busca: sem acento e em minúsculas. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
