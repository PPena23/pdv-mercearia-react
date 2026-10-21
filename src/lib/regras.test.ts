import { describe, expect, it } from 'vitest'
import type { Cliente, ItemVenda, SessaoCaixa, Venda } from '@/types/dominio'
import { calcularDigitoEAN13, completarEAN13, gerarEANInterno, validarEAN13 } from './ean'
import { formatBRL, formatQuantidade, multiplicar, parseBRL, parsePesoKg, somar } from './money'
import { calcularTotais } from './carrinho'
import { aplicarPagamento, calcularTroco, podeComprarFiado, valorRestante } from './pagamento'
import { interpretarEntrada, quantidadeDoMultiplicador } from './scanner'
import { diferencas, esperadoNoFechamento } from './caixa'
import { carrinhoReducer, carrinhoVazio } from '@/features/caixa/carrinhoReducer'
import { gerarCatalogo } from '@/data/catalogo'

const semEspacoDuro = (s: string) => s.replace(/ /g, ' ')

describe('EAN-13', () => {
  it('calcula o dígito verificador de um código conhecido', () => {
    // 4006381333931 é um exemplo clássico de EAN-13 válido
    expect(calcularDigitoEAN13('400638133393')).toBe(1)
    expect(validarEAN13('4006381333931')).toBe(true)
  })

  it('rejeita dígito errado, tamanho errado e letras', () => {
    expect(validarEAN13('4006381333932')).toBe(false)
    expect(validarEAN13('400638133393')).toBe(false)
    expect(validarEAN13('40063813339A1')).toBe(false)
  })

  it('verificador 0 quando a soma já é múltiplo de 10', () => {
    const codigo = completarEAN13('789000000000')
    expect(validarEAN13(codigo)).toBe(true)
  })

  it('códigos internos (prefixo 2) e todo o catálogo semente são válidos e únicos', () => {
    expect(validarEAN13(gerarEANInterno(42))).toBe(true)
    const catalogo = gerarCatalogo()
    expect(catalogo.length).toBe(120)
    expect(catalogo.every((p) => validarEAN13(p.ean))).toBe(true)
    expect(new Set(catalogo.map((p) => p.ean)).size).toBe(catalogo.length)
  })
})

describe('dinheiro em centavos', () => {
  it('evita o erro clássico de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // o problema
    expect(somar([10, 20])).toBe(30) // a solução: R$ 0,10 + R$ 0,20 = 30 centavos
  })

  it('interpreta valores digitados em formato brasileiro', () => {
    expect(parseBRL('12,90')).toBe(1290)
    expect(parseBRL('R$ 1.234,5')).toBe(123450)
    expect(parseBRL('7.5')).toBe(750)
    expect(parseBRL('1.234')).toBe(123400)
    expect(parseBRL('10')).toBe(1000)
    expect(parseBRL('abc')).toBeNull()
    expect(parseBRL('1,234')).toBeNull()
  })

  it('formata em reais', () => {
    expect(semEspacoDuro(formatBRL(123456))).toBe('R$ 1.234,56')
  })

  it('multiplica preço por kg arredondando ao centavo', () => {
    // 0,532 kg de banana a R$ 6,99/kg = 3,71868 -> R$ 3,72
    expect(multiplicar(699, 532, 'kg')).toBe(372)
    expect(multiplicar(549, 3, 'un')).toBe(1647)
    expect(parsePesoKg('0,532')).toBe(532)
    expect(parsePesoKg('1.5')).toBe(1500)
    expect(formatQuantidade(532, 'kg')).toBe('0,532 kg')
  })
})

describe('leitura do scanner', () => {
  it('reconhece código, multiplicador e busca por nome', () => {
    expect(interpretarEntrada('7891234567895')).toEqual({ tipo: 'codigo', codigo: '7891234567895', multiplicador: undefined })
    expect(interpretarEntrada('3*7891234567895')).toEqual({ tipo: 'codigo', codigo: '7891234567895', multiplicador: '3' })
    expect(interpretarEntrada('0,532*banana')).toEqual({ tipo: 'busca', termo: 'banana', multiplicador: '0,532' })
    expect(interpretarEntrada('  ')).toEqual({ tipo: 'vazio' })
  })

  it('converte o multiplicador conforme a unidade', () => {
    expect(quantidadeDoMultiplicador('3', 'un')).toEqual({ ok: true, quantidade: 3 })
    expect(quantidadeDoMultiplicador('0,532', 'kg')).toEqual({ ok: true, quantidade: 532 })
    expect(quantidadeDoMultiplicador(undefined, 'kg')).toEqual({ ok: true, quantidade: 0 }) // abre a balança
    expect(quantidadeDoMultiplicador('1,5', 'un').ok).toBe(false)
  })
})

const item = (preco: number, quantidade: number, desconto = 0, unidade: 'un' | 'kg' = 'un'): ItemVenda => ({
  produtoId: `p${preco}`,
  nome: 'Teste',
  ean: '0000000000000',
  unidade,
  precoUnitarioCentavos: preco,
  quantidade,
  descontoCentavos: desconto,
})

describe('totais do carrinho com descontos', () => {
  it('soma itens, aplica desconto por item e desconto geral', () => {
    const t = calcularTotais([item(1000, 2, 300), item(699, 532, 0, 'kg')], 100)
    expect(t.subtotal).toBe(2000 + 372)
    expect(t.descontoItens).toBe(300)
    expect(t.descontoGeral).toBe(100)
    expect(t.total).toBe(2372 - 400)
    expect(t.volumes).toBe(3)
  })

  it('desconto nunca deixa o total negativo', () => {
    const t = calcularTotais([item(500, 1, 9999)], 9999)
    expect(t.descontoItens).toBe(500)
    expect(t.total).toBe(0)
  })

  it('reducer soma quantidade do mesmo produto e desfaz remoção', () => {
    const produto = { id: 'p1', ean: '1', nome: 'Leite', categoria: 'laticinios', precoCentavos: 549, unidade: 'un', estoque: 10, estoqueMinimo: 1, favorito: true } as const
    let s = carrinhoReducer(carrinhoVazio, { type: 'adicionar', produto, quantidade: 1, linhaId: 'a' })
    s = carrinhoReducer(s, { type: 'adicionar', produto, quantidade: 2, linhaId: 'b' })
    expect(s.linhas).toHaveLength(1)
    expect(s.linhas[0].quantidade).toBe(3)
    const removida = s.linhas[0]
    s = carrinhoReducer(s, { type: 'remover', linhaId: 'a' })
    expect(s.linhas).toHaveLength(0)
    s = carrinhoReducer(s, { type: 'restaurar', linha: removida, indice: 0 })
    expect(s.linhas[0].quantidade).toBe(3)
  })
})

describe('pagamento, troco e divisão', () => {
  it('calcula troco', () => {
    expect(calcularTroco(3790, 5000)).toBe(1210)
    expect(calcularTroco(3790, 2000)).toBe(0)
  })

  it('divide a venda entre Pix, cartão e dinheiro com troco', () => {
    const total = 10000
    const pix = aplicarPagamento(total, [], 'pix', 3000)
    expect(pix.ok).toBe(true)
    const pagos = pix.ok ? [pix.pagamento] : []
    const debito = aplicarPagamento(total, pagos, 'debito', 4000)
    if (debito.ok) pagos.push(debito.pagamento)
    expect(valorRestante(total, pagos)).toBe(3000)

    const dinheiro = aplicarPagamento(total, pagos, 'dinheiro', 5000)
    expect(dinheiro).toEqual({
      ok: true,
      pagamento: { forma: 'dinheiro', valorCentavos: 3000, recebidoCentavos: 5000, trocoCentavos: 2000 },
    })
    if (dinheiro.ok) pagos.push(dinheiro.pagamento)
    expect(valorRestante(total, pagos)).toBe(0)
  })

  it('só dinheiro pode passar do restante', () => {
    expect(aplicarPagamento(1000, [], 'credito', 1500).ok).toBe(false)
    expect(aplicarPagamento(1000, [], 'pix', 0).ok).toBe(false)
  })

  it('bloqueia fiado acima do limite', () => {
    const cliente: Cliente = { id: 'c', nome: 'Zefa', telefone: '', limiteCentavos: 30000, saldoDevedorCentavos: 25000, movimentos: [] }
    expect(podeComprarFiado(cliente, 5000)).toBe(true)
    expect(podeComprarFiado(cliente, 5001)).toBe(false)
  })
})

describe('fechamento de caixa', () => {
  it('esperado em dinheiro = troco + vendas + suprimento − sangria', () => {
    const sessao: SessaoCaixa = {
      id: 's',
      operador: 'Rita',
      abertaEm: '',
      trocoInicialCentavos: 15000,
      movimentos: [
        { id: '1', tipo: 'sangria', valorCentavos: 10000, motivo: 'banco', em: '' },
        { id: '2', tipo: 'suprimento', valorCentavos: 2000, motivo: 'moedas', em: '' },
      ],
    }
    const venda = (pagamentos: Venda['pagamentos'], status: Venda['status'] = 'concluida') =>
      ({ pagamentos, status }) as Venda
    const vendas = [
      venda([{ forma: 'dinheiro', valorCentavos: 5000 }]),
      venda([{ forma: 'pix', valorCentavos: 3000 }, { forma: 'dinheiro', valorCentavos: 1000 }]),
      venda([{ forma: 'dinheiro', valorCentavos: 99999 }], 'cancelada'),
    ]
    const esperado = esperadoNoFechamento(sessao, vendas)
    expect(esperado.dinheiro).toBe(15000 + 6000 + 2000 - 10000)
    expect(esperado.pix).toBe(3000)
    const dif = diferencas(esperado, { dinheiro: 12900, pix: 3000 })
    expect(dif.dinheiro).toBe(-100) // faltou R$ 1,00
    expect(dif.pix).toBe(0)
  })
})
