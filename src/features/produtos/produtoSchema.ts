import { z } from 'zod'
import type { Produto, Unidade } from '@/types/dominio'
import { calcularDigitoEAN13 } from '@/lib/ean'
import { IDS_CATEGORIAS } from '@/lib/categorias'
import { campoMoeda, centavos } from '@/lib/schemas'
import { formatDecimal, formatQuantidade } from '@/lib/money'

/** Estoque digitado: inteiro para 'un'; kg com até 3 casas ("12,5"). Devolve na unidade base. */
export function parseEstoque(texto: string, unidade: Unidade): number | null {
  const t = texto.trim().replace(',', '.')
  if (unidade === 'un') return /^\d{1,6}$/.test(t) ? Number(t) : null
  const m = /^(\d{1,5})(?:\.(\d{1,3}))?$/.exec(t)
  return m ? Number(m[1]) * 1000 + Number((m[2] ?? '0').padEnd(3, '0')) : null
}

const quantidadeTexto = (rotulo: string) => z.string().trim().min(1, `${rotulo} é obrigatório`)

/**
 * Schema criado por fábrica porque a validação de "código já cadastrado"
 * depende dos dados atuais (lista de EANs) e do produto em edição.
 */
export function criarSchemaProduto(produtos: Produto[], idEmEdicao?: string) {
  return z
    .object({
      ean: z
        .string()
        .trim()
        .regex(/^\d+$/, 'Só números')
        .length(13, 'O EAN-13 tem exatamente 13 dígitos')
        .superRefine((ean, ctx) => {
          // no Zod 4 os refinamentos rodam mesmo se o .length() falhou
          if (!/^\d{13}$/.test(ean)) return
          const esperado = calcularDigitoEAN13(ean.slice(0, 12))
          if (Number(ean[12]) !== esperado) {
            ctx.addIssue({ code: 'custom', message: `Dígito verificador inválido (deveria terminar em ${esperado})` })
            return
          }
          const dono = produtos.find((p) => p.ean === ean && p.id !== idEmEdicao)
          if (dono) ctx.addIssue({ code: 'custom', message: `Código já usado por "${dono.nome}"` })
        }),
      nome: z.string().trim().min(3, 'Mínimo de 3 letras').max(60, 'Máximo de 60 caracteres'),
      categoria: z.enum(IDS_CATEGORIAS, { error: 'Escolha uma categoria' }),
      preco: campoMoeda('Preço'),
      unidade: z.enum(['un', 'kg']),
      estoque: quantidadeTexto('Estoque'),
      estoqueMinimo: quantidadeTexto('Estoque mínimo'),
      favorito: z.boolean(),
    })
    .superRefine((v, ctx) => {
      // validação que depende de outro campo (unidade)
      const dica = v.unidade === 'un' ? 'número inteiro de unidades' : 'em kg, ex.: 12,5'
      if (parseEstoque(v.estoque, v.unidade) === null) {
        ctx.addIssue({ code: 'custom', path: ['estoque'], message: `Use ${dica}` })
      }
      if (parseEstoque(v.estoqueMinimo, v.unidade) === null) {
        ctx.addIssue({ code: 'custom', path: ['estoqueMinimo'], message: `Use ${dica}` })
      }
    })
}

export type CamposProduto = z.infer<ReturnType<typeof criarSchemaProduto>>

const quantidadeParaTexto = (q: number, u: Unidade) =>
  u === 'un' ? String(q) : formatQuantidade(Math.max(0, q), 'kg').replace(' kg', '')

export function produtoParaCampos(p?: Produto): CamposProduto {
  if (!p) {
    return { ean: '', nome: '', categoria: 'mercearia', preco: '', unidade: 'un', estoque: '0', estoqueMinimo: '5', favorito: false }
  }
  return {
    ean: p.ean,
    nome: p.nome,
    categoria: p.categoria,
    preco: formatDecimal(p.precoCentavos),
    unidade: p.unidade,
    estoque: quantidadeParaTexto(p.estoque, p.unidade),
    estoqueMinimo: quantidadeParaTexto(p.estoqueMinimo, p.unidade),
    favorito: p.favorito,
  }
}

export function camposParaProduto(c: CamposProduto, id?: string): Omit<Produto, 'id'> & { id?: string } {
  return {
    id,
    ean: c.ean,
    nome: c.nome.trim(),
    categoria: c.categoria,
    precoCentavos: centavos(c.preco),
    unidade: c.unidade,
    estoque: parseEstoque(c.estoque, c.unidade) ?? 0,
    estoqueMinimo: parseEstoque(c.estoqueMinimo, c.unidade) ?? 0,
    favorito: c.favorito,
  }
}
