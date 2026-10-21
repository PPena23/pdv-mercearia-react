import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Produto } from '@/types/dominio'
import { Button, CabecalhoPagina, Card, EmptyState, Input, Select, Skeleton, Tabs, useToast } from '@/components/ui'
import { ComDados } from '@/components/layout/ComDados'
import { useAcoesDados, useDados } from '@/store/DadosProvider'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import { CATEGORIAS, categoria } from '@/lib/categorias'
import { formatBRL, formatQuantidade, parseBRL } from '@/lib/money'
import { formatDataHora } from '@/lib/datas'
import { cx } from '@/lib/cx'
import { parseEstoque } from '@/features/produtos/produtoSchema'
import { BadgeEstoque, situacaoEstoque, type SituacaoEstoque } from './BadgeEstoque'

type Filtro = 'alerta' | 'todos' | SituacaoEstoque

export function EstoquePage() {
  useTituloPagina('Estoque')
  return (
    <>
      <CabecalhoPagina titulo="Estoque" subtitulo="Vendas baixam o estoque automaticamente; cancelamentos devolvem." />
      <ComDados
        esqueleto={
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-[480px]" />
            <Skeleton className="h-80" />
          </div>
        }
      >
        <ConteudoEstoque />
      </ComDados>
    </>
  )
}

function ConteudoEstoque() {
  const { produtos, entradas } = useDados()
  const [filtro, setFiltro] = useState<Filtro>('alerta')
  const [produtoEntrada, setProdutoEntrada] = useState<string>('')
  const formRef = useRef<HTMLDivElement>(null)

  const contagem = useMemo(() => {
    const c = { ok: 0, baixo: 0, zerado: 0 }
    for (const p of produtos) c[situacaoEstoque(p)]++
    return c
  }, [produtos])

  const lista = useMemo(
    () =>
      produtos
        .filter((p) => {
          const s = situacaoEstoque(p)
          return filtro === 'todos' || (filtro === 'alerta' ? s !== 'ok' : s === filtro)
        })
        // mais críticos primeiro: menor razão estoque/mínimo
        .sort((a, b) => a.estoque / Math.max(1, a.estoqueMinimo) - b.estoque / Math.max(1, b.estoqueMinimo)),
    [produtos, filtro],
  )

  function repor(p: Produto) {
    setProdutoEntrada(p.id)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input[name="quantidade"]')?.focus(), 300)
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['OK', contagem.ok, 'bg-lima-50 text-lima-700'],
              ['Abaixo do mínimo', contagem.baixo, 'bg-mel-50 text-mel-800'],
              ['Zerados', contagem.zerado, 'bg-tomate-50 text-tomate-700'],
            ] as const
          ).map(([rotulo, valor, cor]) => (
            <Card key={rotulo} className={cx('border-0 p-4', cor)}>
              <p className="text-sm font-bold">{rotulo}</p>
              <p className="num text-3xl font-black">{valor}</p>
            </Card>
          ))}
        </div>

        <Tabs
          rotulo="Filtrar estoque"
          ativa={filtro}
          aoMudar={setFiltro}
          abas={[
            { id: 'alerta', rotulo: `Precisa repor (${contagem.baixo + contagem.zerado})`, icone: '⚠️' },
            { id: 'zerado', rotulo: 'Zerados' },
            { id: 'baixo', rotulo: 'Baixos' },
            { id: 'todos', rotulo: 'Todos' },
          ]}
        >
          {lista.length === 0 ? (
            <Card>
              <EmptyState icone="🎉" titulo="Prateleiras cheias!" descricao="Nenhum produto nesta situação." />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-borda">
                {lista.map((p) => {
                  const pct = Math.min(100, (Math.max(0, p.estoque) / Math.max(1, p.estoqueMinimo * 3)) * 100)
                  const s = situacaoEstoque(p)
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span aria-hidden className="text-2xl">{categoria(p.categoria).emoji}</span>
                      <div className="min-w-0 flex-1 basis-44">
                        <p className="truncate font-bold">{p.nome}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div
                            className="h-2 flex-1 overflow-hidden rounded-full bg-creme"
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(pct)}
                            aria-label={`Nível de estoque de ${p.nome}`}
                          >
                            <div
                              className={cx('h-full rounded-full', s === 'ok' ? 'bg-lima-400' : s === 'baixo' ? 'bg-mel-500' : 'bg-tomate-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="num w-44 whitespace-nowrap text-right text-xs text-tinta-suave">
                            {formatQuantidade(Math.max(0, p.estoque), p.unidade)} / mín. {formatQuantidade(p.estoqueMinimo, p.unidade)}
                          </span>
                        </div>
                      </div>
                      <BadgeEstoque produto={p} />
                      <Button variante="secundario" tamanho="sm" onClick={() => repor(p)}>
                        Repor
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </Tabs>
      </div>

      <div ref={formRef} className="scroll-mt-24 space-y-4 lg:sticky lg:top-24">
        <FormEntrada produtos={produtos} produtoId={produtoEntrada} aoMudarProduto={setProdutoEntrada} />
        <Card className="p-5">
          <h2 className="mb-3 font-extrabold">Últimas entradas</h2>
          {entradas.length === 0 ? (
            <p className="text-sm text-tinta-suave">Nenhuma entrada registrada ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {entradas.slice(0, 6).map((e) => {
                const p = produtos.find((x) => x.id === e.produtoId)
                return (
                  <li key={e.id} className="flex justify-between gap-2 rounded-xl bg-creme px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{p?.nome ?? 'Produto removido'}</span>
                      <span className="text-xs text-tinta-suave">
                        {formatDataHora(e.em)}
                        {e.fornecedor && ` · ${e.fornecedor}`}
                      </span>
                    </span>
                    <span className="num shrink-0 font-bold text-lima-700">+{formatQuantidade(e.quantidade, p?.unidade ?? 'un')}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

const schemaEntrada = z.object({
  produtoId: z.string().min(1, 'Escolha o produto'),
  quantidade: z.string().trim().min(1, 'Informe a quantidade'),
  custo: z
    .string()
    .trim()
    .refine((v) => v === '' || parseBRL(v) !== null, 'Use o formato 12,90'),
  fornecedor: z.string().trim().max(40, 'Máximo de 40 caracteres'),
})
type CamposEntrada = z.infer<typeof schemaEntrada>

function FormEntrada({ produtos, produtoId, aoMudarProduto }: { produtos: Produto[]; produtoId: string; aoMudarProduto: (id: string) => void }) {
  const { registrarEntrada } = useAcoesDados()
  const toast = useToast()
  const produto = produtos.find((p) => p.id === produtoId)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CamposEntrada>({
    resolver: zodResolver(schemaEntrada),
    mode: 'onChange',
    defaultValues: { produtoId: '', quantidade: '', custo: '', fornecedor: '' },
  })

  // botão "Repor" da lista pré-seleciona o produto no formulário
  useEffect(() => {
    if (produtoId) setValue('produtoId', produtoId, { shouldValidate: true })
  }, [produtoId, setValue])

  const onSubmit = handleSubmit(async (c) => {
    const p = produtos.find((x) => x.id === c.produtoId)
    if (!p) return
    const quantidade = parseEstoque(c.quantidade, p.unidade)
    if (!quantidade) {
      setError('quantidade', { message: p.unidade === 'un' ? 'Use um número inteiro maior que zero' : 'Use kg, ex.: 12,5' })
      return
    }
    try {
      await registrarEntrada({
        produtoId: p.id,
        quantidade,
        custoUnitarioCentavos: c.custo ? (parseBRL(c.custo) ?? undefined) : undefined,
        fornecedor: c.fornecedor || undefined,
      })
      toast({ tipo: 'sucesso', titulo: 'Entrada registrada', descricao: `+${formatQuantidade(quantidade, p.unidade)} de ${p.nome}` })
      aoMudarProduto('')
      reset({ produtoId: '', quantidade: '', custo: '', fornecedor: '' })
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Não foi possível registrar', descricao: (e as Error).message })
    }
  })

  const ordenados = useMemo(() => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [produtos])

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-extrabold">Entrada de mercadoria</h2>
      <p className="mb-4 text-sm text-tinta-suave">Chegou fornecedor? Lance aqui e o estoque sobe na hora.</p>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <Select
          rotulo="Produto"
          erro={errors.produtoId?.message}
          {...register('produtoId', { onChange: (e) => aoMudarProduto(e.target.value) })}
        >
          <option value="">Selecione…</option>
          {CATEGORIAS.map((c) => (
            <optgroup key={c.id} label={`${c.emoji} ${c.nome}`}>
              {ordenados
                .filter((p) => p.categoria === c.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            rotulo={`Quantidade${produto ? ` (${produto.unidade})` : ''}`}
            inputMode="decimal"
            className="num"
            erro={errors.quantidade?.message}
            {...register('quantidade')}
          />
          <Input rotulo="Custo unitário" prefixo="R$" inputMode="decimal" className="num" placeholder="opcional" erro={errors.custo?.message} {...register('custo')} />
        </div>
        <Input rotulo="Fornecedor" placeholder="opcional" erro={errors.fornecedor?.message} {...register('fornecedor')} />
        {produto && (
          <p className="text-sm text-tinta-suave">
            Estoque atual: <strong className="num text-tinta">{formatQuantidade(Math.max(0, produto.estoque), produto.unidade)}</strong> · preço de venda{' '}
            <strong className="num text-tinta">{formatBRL(produto.precoCentavos)}</strong>
          </p>
        )}
        <Button type="submit" variante="sucesso" tamanho="lg" larguraTotal carregando={isSubmitting} disabled={!isValid}>
          Registrar entrada
        </Button>
      </form>
    </Card>
  )
}
