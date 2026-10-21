import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Card, Input, useToast } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { useCaixa } from '@/hooks/useCaixa'
import { campoMoeda, centavos } from '@/lib/schemas'
import { formatBRL } from '@/lib/money'
import { formatDataHora } from '@/lib/datas'
import { FORMAS, diferencas, zeradoPorForma } from '@/lib/caixa'
import { cx } from '@/lib/cx'

const schema = z.object({
  operador: z.string().trim().min(2, 'Informe o nome de quem vai operar o caixa').max(30, 'Nome muito longo'),
  troco: campoMoeda('Troco inicial', { permitirZero: true }),
})
type Campos = z.infer<typeof schema>

export function AberturaCaixa() {
  const { abrir, historico } = useCaixa()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<Campos>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { operador: 'Rita', troco: '150,00' },
  })

  const onSubmit = handleSubmit(({ operador, troco }) => {
    abrir(operador, centavos(troco))
    toast({ tipo: 'sucesso', titulo: 'Caixa aberto', descricao: `Boas vendas, ${operador}!` })
  })

  return (
    <div className="mx-auto grid max-w-4xl items-start gap-5 py-4 md:grid-cols-[1.2fr_1fr]">
      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Logo className="size-12" />
          <div>
            <h1 className="text-2xl font-black">Abertura de caixa</h1>
            <p className="text-tinta-suave">Conte o troco da gaveta antes da primeira venda.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input rotulo="Operador(a)" autoComplete="off" erro={errors.operador?.message} {...register('operador')} />
          <Input
            rotulo="Troco inicial (fundo de caixa)"
            prefixo="R$"
            inputMode="decimal"
            className="num"
            erro={errors.troco?.message}
            dica="Dinheiro que já está na gaveta."
            {...register('troco')}
          />
          <Button type="submit" tamanho="xl" variante="sucesso" larguraTotal disabled={!isValid}>
            Abrir caixa
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-extrabold">Últimos fechamentos</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-tinta-suave">Nenhum fechamento registrado neste navegador ainda.</p>
        ) : (
          <ul className="space-y-3">
            {historico.slice(0, 4).map((s) => {
              const contadoTotal = FORMAS.reduce((a, f) => a + (s.contado?.[f] ?? 0), 0)
              const dif = s.esperado ? diferencas(s.esperado, s.contado ?? {}) : zeradoPorForma()
              const difTotal = FORMAS.reduce((a, f) => a + dif[f], 0)
              return (
                <li key={s.id} className="rounded-xl bg-creme p-3 text-sm">
                  <p className="font-bold">
                    {s.operador} · {s.fechadaEm && formatDataHora(s.fechadaEm)}
                  </p>
                  <p className="num text-tinta-suave">Total conferido: {formatBRL(contadoTotal)}</p>
                  <p
                    className={cx(
                      'num font-bold',
                      difTotal === 0 ? 'text-lima-700' : difTotal > 0 ? 'text-mel-800' : 'text-tomate-600',
                    )}
                  >
                    {difTotal === 0 ? 'Caixa batido ✓' : `${difTotal > 0 ? 'Sobra' : 'Falta'} de ${formatBRL(Math.abs(difTotal))}`}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
