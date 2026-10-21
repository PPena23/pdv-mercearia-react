import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Cliente } from '@/types/dominio'
import { Button, Dialog, Input, useToast } from '@/components/ui'
import { useAcoesDados } from '@/store/DadosProvider'
import { campoMoeda, centavos } from '@/lib/schemas'
import { formatBRL, formatDecimal } from '@/lib/money'

/** Máscara simples de telefone brasileiro: (16) 99999-9999 */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* --------------------------- cadastro / edição --------------------------- */

const schemaCliente = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo').max(50, 'Máximo de 50 caracteres'),
  telefone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone no formato (16) 99999-9999'),
  limite: campoMoeda('Limite', { permitirZero: true }).refine((v) => centavos(v) <= 2_000_00, 'Limite máximo da loja: R$ 2.000,00'),
})
type CamposCliente = z.infer<typeof schemaCliente>

export function ClienteDialog({ cliente, aoFechar }: { cliente: Cliente | 'novo' | null; aoFechar: () => void }) {
  const existente = cliente && cliente !== 'novo' ? cliente : undefined
  return (
    <Dialog aberto={cliente !== null} aoFechar={aoFechar} titulo={existente ? 'Editar cliente' : 'Novo cliente do fiado'} tamanho="sm">
      {cliente !== null && <FormCliente key={existente?.id ?? 'novo'} cliente={existente} aoFechar={aoFechar} />}
    </Dialog>
  )
}

function FormCliente({ cliente, aoFechar }: { cliente?: Cliente; aoFechar: () => void }) {
  const { salvarCliente } = useAcoesDados()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CamposCliente>({
    resolver: zodResolver(schemaCliente),
    mode: 'onChange',
    defaultValues: {
      nome: cliente?.nome ?? '',
      telefone: cliente?.telefone ?? '',
      limite: cliente ? formatDecimal(cliente.limiteCentavos) : '200,00',
    },
  })

  const onSubmit = handleSubmit(async ({ nome, telefone, limite }) => {
    const limiteCentavos = centavos(limite)
    // regra: não dá pra baixar o limite abaixo do que o cliente já deve
    if (cliente && limiteCentavos < cliente.saldoDevedorCentavos) {
      setError('limite', { message: `O cliente já deve ${formatBRL(cliente.saldoDevedorCentavos)}` })
      return
    }
    try {
      await salvarCliente({ id: cliente?.id, nome, telefone, limiteCentavos })
      toast({ tipo: 'sucesso', titulo: cliente ? 'Cliente atualizado' : 'Cliente cadastrado', descricao: nome })
      aoFechar()
    } catch (e) {
      setError('root', { message: (e as Error).message })
    }
  })

  const telefone = register('telefone')

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root && <p role="alert" className="rounded-xl bg-tomate-50 p-3 font-bold text-tomate-700">{errors.root.message}</p>}
      <Input rotulo="Nome" data-autofocus autoComplete="off" erro={errors.nome?.message} {...register('nome')} />
      <Input
        rotulo="Telefone"
        inputMode="tel"
        placeholder="(16) 99999-9999"
        erro={errors.telefone?.message}
        {...telefone}
        onChange={(e) => {
          setValue('telefone', mascaraTelefone(e.target.value), { shouldValidate: true })
        }}
      />
      <Input rotulo="Limite de crédito" prefixo="R$" inputMode="decimal" className="num" erro={errors.limite?.message} {...register('limite')} />
      <Button type="submit" tamanho="lg" larguraTotal carregando={isSubmitting} disabled={!isValid}>
        {cliente ? 'Salvar' : 'Cadastrar'}
      </Button>
    </form>
  )
}

/* ------------------------------- recebimento ------------------------------- */

export function RecebimentoDialog({ cliente, aoFechar }: { cliente: Cliente | null; aoFechar: () => void }) {
  return (
    <Dialog
      aberto={cliente !== null}
      aoFechar={aoFechar}
      titulo="Receber do fiado"
      descricao={cliente ? `${cliente.nome} deve ${formatBRL(cliente.saldoDevedorCentavos)}` : undefined}
      tamanho="sm"
    >
      {cliente && <FormRecebimento key={cliente.id} cliente={cliente} aoFechar={aoFechar} />}
    </Dialog>
  )
}

function FormRecebimento({ cliente, aoFechar }: { cliente: Cliente; aoFechar: () => void }) {
  const { receberFiado } = useAcoesDados()
  const toast = useToast()
  // schema montado com o saldo do cliente: valor não pode passar do que ele deve
  const schema = z.object({
    valor: campoMoeda('Valor').refine((v) => centavos(v) <= cliente.saldoDevedorCentavos, `Máximo: ${formatBRL(cliente.saldoDevedorCentavos)}`),
  })
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<{ valor: string }>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { valor: '' } })

  const onSubmit = handleSubmit(async ({ valor }) => {
    try {
      const atualizado = await receberFiado(cliente.id, centavos(valor))
      toast({
        tipo: 'sucesso',
        titulo: `Recebido ${formatBRL(centavos(valor))}`,
        descricao: atualizado.saldoDevedorCentavos === 0 ? `${cliente.nome.split(' ')[0]} quitou a caderneta! 🎉` : `Saldo restante: ${formatBRL(atualizado.saldoDevedorCentavos)}`,
      })
      aoFechar()
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Não foi possível registrar', descricao: (e as Error).message })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Input rotulo="Valor recebido" prefixo="R$" inputMode="decimal" className="num" data-autofocus erro={errors.valor?.message} {...register('valor')} />
      <Button
        variante="secundario"
        larguraTotal
        onClick={() => setValue('valor', formatDecimal(cliente.saldoDevedorCentavos), { shouldValidate: true })}
      >
        Quitar tudo ({formatBRL(cliente.saldoDevedorCentavos)})
      </Button>
      <Button type="submit" variante="sucesso" tamanho="lg" larguraTotal carregando={isSubmitting} disabled={!isValid}>
        Registrar recebimento
      </Button>
    </form>
  )
}
