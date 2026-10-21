import type { Produto } from '@/types/dominio'
import { Badge } from '@/components/ui'

export type SituacaoEstoque = 'ok' | 'baixo' | 'zerado'

export function situacaoEstoque(p: Produto): SituacaoEstoque {
  if (p.estoque <= 0) return 'zerado'
  if (p.estoque <= p.estoqueMinimo) return 'baixo'
  return 'ok'
}

export function BadgeEstoque({ produto }: { produto: Produto }) {
  const s = situacaoEstoque(produto)
  if (s === 'zerado') return <Badge tom="tomate">Zerado</Badge>
  if (s === 'baixo') return <Badge tom="mel">Baixo</Badge>
  return <Badge tom="lima">OK</Badge>
}
