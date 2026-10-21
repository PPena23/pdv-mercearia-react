import { z } from 'zod'
import { parseBRL } from './money'

/*
 * Peças de validação reaproveitadas pelos formulários (React Hook Form + Zod).
 * Os campos de valor são texto ("12,90") — convertemos para centavos com parseBRL.
 */

export const campoMoeda = (rotulo = 'Valor', { minimo = 1, permitirZero = false } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${rotulo} é obrigatório`)
    .refine((v) => parseBRL(v) !== null, 'Use o formato 12,90')
    .refine((v) => {
      const c = parseBRL(v)
      return c === null || (permitirZero ? c >= 0 : c >= minimo)
    }, permitirZero ? `${rotulo} não pode ser negativo` : `${rotulo} deve ser maior que zero`)
    .refine((v) => (parseBRL(v) ?? 0) <= 100_000_00, `${rotulo} acima do permitido`)

/** Converte um campo já validado por campoMoeda (nunca é null aqui). */
export const centavos = (v: string) => parseBRL(v) ?? 0
