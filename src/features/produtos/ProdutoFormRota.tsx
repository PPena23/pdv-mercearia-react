import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, EmptyState, Input, Select, Tabs, useToast } from '@/components/ui'
import { useAcoesDados, useDados } from '@/store/DadosProvider'
import { CATEGORIAS } from '@/lib/categorias'
import { calcularDigitoEAN13, gerarEANInterno } from '@/lib/ean'
import { formatBRL, multiplicar, parseBRL } from '@/lib/money'
import type { Produto } from '@/types/dominio'
import { camposParaProduto, criarSchemaProduto, produtoParaCampos, type CamposProduto } from './produtoSchema'

/**
 * Rota aninhada (/produtos/novo e /produtos/:produtoId): o formulário abre
 * como diálogo por cima da lista. Fechar = navegar de volta para /produtos.
 */
export function ProdutoFormRota() {
  const { produtoId } = useParams()
  const navigate = useNavigate()
  const { produtos, status } = useDados()
  const produto = produtoId ? produtos.find((p) => p.id === produtoId) : undefined
  const fechar = () => navigate('/produtos')

  if (status !== 'pronto') return null

  return (
    <Dialog aberto aoFechar={fechar} titulo={produto ? 'Editar produto' : 'Novo produto'} descricao={produto?.nome} tamanho="lg">
      {produtoId && !produto ? (
        <EmptyState icone="🔎" titulo="Produto não encontrado" descricao="Ele pode ter sido excluído." acao={<Button onClick={fechar}>Voltar à lista</Button>} />
      ) : (
        <FormProduto key={produtoId ?? 'novo'} produto={produto} produtos={produtos} aoConcluir={fechar} />
      )}
    </Dialog>
  )
}

function FormProduto({ produto, produtos, aoConcluir }: { produto?: Produto; produtos: Produto[]; aoConcluir: () => void }) {
  const { salvarProduto } = useAcoesDados()
  const toast = useToast()
  const schema = useMemo(() => criarSchemaProduto(produtos, produto?.id), [produtos, produto?.id])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isValid, isSubmitting, isDirty },
  } = useForm<CamposProduto>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: produtoParaCampos(produto),
  })

  const [ean, unidade, preco] = watch(['ean', 'unidade', 'preco'])
  const digitoSugerido = /^\d{12}$/.test(ean) ? calcularDigitoEAN13(ean) : null
  const precoCentavos = parseBRL(preco ?? '')

  const onSubmit = handleSubmit(async (campos) => {
    try {
      const salvo = await salvarProduto(camposParaProduto(campos, produto?.id))
      toast({ tipo: 'sucesso', titulo: produto ? 'Produto atualizado' : 'Produto cadastrado', descricao: salvo.nome })
      aoConcluir()
    } catch (e) {
      // erro vindo da "API" (ex.: EAN duplicado em outra aba) aparece no topo do form
      setError('root', { message: (e as Error).message })
    }
  })

  function gerarCodigo() {
    const usados = new Set(produtos.map((p) => p.ean))
    let seq = 90000 + produtos.length
    while (usados.has(gerarEANInterno(seq))) seq++
    setValue('ean', gerarEANInterno(seq), { shouldValidate: true, shouldDirty: true })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.root && (
        <p role="alert" className="rounded-xl bg-tomate-50 px-4 py-3 font-bold text-tomate-700">
          {errors.root.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <Input
          rotulo="Código de barras (EAN-13)"
          inputMode="numeric"
          maxLength={13}
          data-autofocus
          className="num"
          erro={errors.ean?.message}
          dica={digitoSugerido !== null ? `Com 12 dígitos, o verificador seria ${digitoSugerido}` : 'O último dígito é verificado automaticamente.'}
          {...register('ean')}
        />
        <Button variante="secundario" className="sm:mt-7" onClick={gerarCodigo}>
          Gerar código interno
        </Button>
      </div>

      <Input rotulo="Nome do produto" autoComplete="off" erro={errors.nome?.message} {...register('nome')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select rotulo="Categoria" erro={errors.categoria?.message} {...register('categoria')}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.nome}
            </option>
          ))}
        </Select>
        <div>
          <span className="mb-1.5 block text-sm font-bold" id="rotulo-unidade">
            Vendido por
          </span>
          <Controller
            control={control}
            name="unidade"
            render={({ field }) => (
              <Tabs
                variante="segmentado"
                rotulo="Unidade de venda"
                ativa={field.value}
                aoMudar={(u) => {
                  field.onChange(u)
                  setValue('estoque', '0', { shouldValidate: true })
                  setValue('estoqueMinimo', u === 'kg' ? '3' : '5', { shouldValidate: true })
                }}
                abas={[
                  { id: 'un', rotulo: 'Unidade' },
                  { id: 'kg', rotulo: '⚖ Quilo (kg)' },
                ]}
              />
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          rotulo={unidade === 'kg' ? 'Preço por kg' : 'Preço'}
          prefixo="R$"
          inputMode="decimal"
          className="num"
          erro={errors.preco?.message}
          dica={precoCentavos && unidade === 'kg' ? `500 g = ${formatBRL(multiplicar(precoCentavos, 500, 'kg'))}` : undefined}
          {...register('preco')}
        />
        <Input
          rotulo={`Estoque (${unidade})`}
          inputMode="decimal"
          className="num"
          erro={errors.estoque?.message}
          {...register('estoque')}
        />
        <Input
          rotulo={`Estoque mínimo (${unidade})`}
          inputMode="decimal"
          className="num"
          erro={errors.estoqueMinimo?.message}
          dica="Abaixo disso, vira alerta."
          {...register('estoqueMinimo')}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-borda p-4 hover:border-uva-200">
        <input type="checkbox" className="size-5 accent-uva-700" {...register('favorito')} />
        <span>
          <span className="block font-bold">⭐ Mostrar na grade de favoritos do caixa</span>
          <span className="text-sm text-tinta-suave">Para itens que saem toda hora, como pão e leite.</span>
        </span>
      </label>

      <div className="flex justify-end gap-2 border-t border-borda pt-4">
        <Button variante="fantasma" onClick={aoConcluir} disabled={isSubmitting}>
          Cancelar
        </Button>
        {/* submit desabilitado enquanto o formulário estiver inválido ou salvando */}
        <Button type="submit" tamanho="lg" carregando={isSubmitting} disabled={!isValid || (!!produto && !isDirty)}>
          {isSubmitting ? 'Salvando…' : produto ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </div>
    </form>
  )
}
