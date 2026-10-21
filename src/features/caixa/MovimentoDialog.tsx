import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Dialog, Input, Tabs, useToast } from '@/components/ui'
import { useCaixa } from '@/hooks/useCaixa'
import { campoMoeda, centavos } from '@/lib/schemas'
import { formatBRL } from '@/lib/money'

const schema = z.object({
  tipo: z.enum(['sangria', 'suprimento']),
  valor: campoMoeda('Valor'),
  motivo: z.string().trim().min(3, 'Descreva o motivo (mín. 3 letras)').max(60, 'Máximo de 60 caracteres'),
})
type Campos = z.infer<typeof schema>

/** Sangria (retirada de dinheiro da gaveta) e suprimento (reforço de troco). */
export function MovimentoDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { registrarMovimento, esperado } = useCaixa()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isValid },
  } = useForm<Campos>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { tipo: 'sangria', valor: '', motivo: '' },
  })
  const tipo = watch('tipo')

  function fechar() {
    reset()
    aoFechar()
  }

  const onSubmit = handleSubmit(({ tipo, valor, motivo }) => {
    try {
      registrarMovimento(tipo, centavos(valor), motivo)
      toast({ tipo: 'sucesso', titulo: tipo === 'sangria' ? 'Sangria registrada' : 'Suprimento registrado', descricao: `${formatBRL(centavos(valor))} · ${motivo}` })
      fechar()
    } catch (e) {
      // erro de regra de negócio vira erro do campo
      setError('valor', { message: (e as Error).message })
    }
  })

  return (
    <Dialog aberto={aberto} aoFechar={fechar} titulo="Movimentar gaveta" descricao={`Dinheiro esperado na gaveta agora: ${formatBRL(esperado?.dinheiro ?? 0)}`} tamanho="sm">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Tabs
          variante="segmentado"
          rotulo="Tipo de movimento"
          ativa={tipo}
          aoMudar={(t) => setValue('tipo', t, { shouldValidate: true })}
          abas={[
            { id: 'sangria', rotulo: '↑ Sangria (retirar)' },
            { id: 'suprimento', rotulo: '↓ Suprimento (colocar)' },
          ]}
        />
        <Input rotulo="Valor" prefixo="R$" inputMode="decimal" className="num" data-autofocus erro={errors.valor?.message} {...register('valor')} />
        <Input
          rotulo="Motivo"
          placeholder={tipo === 'sangria' ? 'Ex.: depósito no banco' : 'Ex.: troco em moedas'}
          erro={errors.motivo?.message}
          {...register('motivo')}
        />
        <Button type="submit" tamanho="lg" larguraTotal disabled={!isValid}>
          Registrar {tipo}
        </Button>
      </form>
    </Dialog>
  )
}
