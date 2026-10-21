import { createPortal } from 'react-dom'
import type { Cliente, Venda } from '@/types/dominio'
import { brutoItem, descontoValido } from '@/lib/carrinho'
import { formatBRL, formatQuantidade } from '@/lib/money'
import { formatDataHora } from '@/lib/datas'
import { ROTULO_FORMA } from '@/lib/pagamento'
import { cx } from '@/lib/cx'

/* Cupom NÃO fiscal no estilo de bobina térmica de 80 mm (fonte monoespaçada). */

export const LOJA = {
  nome: 'MERCEARIA PÉ DE FEIJÃO',
  endereco: 'Rua das Laranjeiras, 128 · Vila Esperança',
  cidade: 'Serra Azul · SP',
  cnpj: '00.000.000/0001-00 (fictício)',
}

const Separador = () => <div className="my-1.5 border-t border-dashed border-current opacity-60" />

function Linha({ esq, dir, forte }: { esq: string; dir: string; forte?: boolean }) {
  return (
    <div className={cx('flex justify-between gap-2', forte && 'text-[15px] font-bold')}>
      <span>{esq}</span>
      <span className="whitespace-nowrap">{dir}</span>
    </div>
  )
}

export function Cupom({ venda, clientes = [], className }: { venda: Venda; clientes?: Cliente[]; className?: string }) {
  const descontos = venda.subtotalCentavos - venda.totalCentavos
  const troco = venda.pagamentos.reduce((a, p) => a + (p.trocoCentavos ?? 0), 0)
  return (
    <div
      className={cx(
        'mx-auto w-[80mm] max-w-full bg-white px-4 py-5 font-mono text-[12.5px] leading-snug text-neutral-900',
        className,
      )}
    >
      <div className="text-center">
        <p className="text-[15px] font-bold">{LOJA.nome}</p>
        <p>{LOJA.endereco}</p>
        <p>{LOJA.cidade}</p>
        <p>CNPJ {LOJA.cnpj}</p>
      </div>
      <Separador />
      <p className="text-center font-bold">CUPOM NÃO FISCAL</p>
      <Linha esq={`Venda nº ${venda.numero}`} dir={formatDataHora(venda.criadaEm)} />
      <p>Operador(a): {venda.operador}</p>
      {venda.status === 'cancelada' && <p className="mt-1 text-center font-bold">*** VENDA CANCELADA ***</p>}
      <Separador />
      <ol>
        {venda.itens.map((item, i) => {
          const desc = descontoValido(item)
          return (
            <li key={i} className="mb-1">
              <p className="uppercase">
                {String(i + 1).padStart(3, '0')} {item.nome}
              </p>
              <div className="pl-4">
                <Linha
                  esq={`${formatQuantidade(item.quantidade, item.unidade)} x ${formatBRL(item.precoUnitarioCentavos)}`}
                  dir={formatBRL(brutoItem(item))}
                />
                {desc > 0 && <Linha esq="desconto" dir={`-${formatBRL(desc)}`} />}
              </div>
            </li>
          )
        })}
      </ol>
      <Separador />
      <Linha esq={`${venda.itens.length} itens · Subtotal`} dir={formatBRL(venda.subtotalCentavos)} />
      {descontos > 0 && <Linha esq="Descontos" dir={`-${formatBRL(descontos)}`} />}
      <Linha esq="TOTAL" dir={formatBRL(venda.totalCentavos)} forte />
      <Separador />
      {venda.pagamentos.map((p, i) => (
        <div key={i}>
          <Linha
            esq={`${ROTULO_FORMA[p.forma]}${p.forma === 'fiado' ? ' · ' + (clientes.find((c) => c.id === p.clienteId)?.nome.split(' ')[0] ?? '') : ''}`}
            dir={formatBRL(p.recebidoCentavos ?? p.valorCentavos)}
          />
          {p.autorizacao && <p className="pl-4 text-[11px]">aut. {p.autorizacao}</p>}
        </div>
      ))}
      {troco > 0 && <Linha esq="TROCO" dir={formatBRL(troco)} forte />}
      <Separador />
      <p className="text-center">Obrigado pela preferência!</p>
      <p className="text-center">Volte sempre :)</p>
      <p className="mt-2 text-center text-[10.5px] opacity-70">
        Documento sem valor fiscal · demonstração de portfólio · pagamentos simulados
      </p>
    </div>
  )
}

/** Cópia do cupom fora do #root, que é a única coisa visível na impressão. */
export function AreaImpressao({ venda, clientes }: { venda: Venda; clientes?: Cliente[] }) {
  return createPortal(
    <div className="area-impressao">
      <Cupom venda={venda} clientes={clientes} className="!px-2 !py-2" />
    </div>,
    document.body,
  )
}
