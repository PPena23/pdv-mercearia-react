import type { CategoriaId, Produto, Unidade } from '@/types/dominio'
import { completarEAN13, gerarEANInterno } from '@/lib/ean'

/*
 * Catálogo FICTÍCIO da Mercearia Pé de Feijão.
 * Marcas inventadas; códigos EAN-13 gerados com dígito verificador válido.
 * Formato: [nome, preço em centavos, unidade, favorito?]
 */
type Linha = [string, number, Unidade, boolean?]

const CATALOGO: Record<CategoriaId, Linha[]> = {
  padaria: [
    ['Pão francês', 1690, 'kg', true],
    ['Pão de queijo', 3990, 'kg', true],
    ['Pão de forma Trigal 500 g', 899, 'un'],
    ['Bisnaguinha Fofinha 300 g', 749, 'un'],
    ['Bolo de fubá (fatia)', 450, 'un', true],
    ['Rosca de coco', 1290, 'un'],
    ['Sonho de creme', 550, 'un'],
    ['Torrada integral Crocantim', 679, 'un'],
    ['Broa de milho', 2490, 'kg'],
    ['Pão doce caseiro', 2290, 'kg'],
    ['Biscoito de polvilho 100 g', 459, 'un'],
    ['Croissant de presunto', 790, 'un'],
  ],
  hortifruti: [
    ['Banana prata', 699, 'kg', true],
    ['Tomate italiano', 899, 'kg', true],
    ['Batata inglesa', 549, 'kg'],
    ['Cebola', 599, 'kg'],
    ['Maçã gala', 1099, 'kg'],
    ['Laranja pera', 449, 'kg'],
    ['Alface crespa (pé)', 350, 'un'],
    ['Cenoura', 499, 'kg'],
    ['Limão taiti', 649, 'kg'],
    ['Alho (cabeça)', 290, 'un'],
    ['Mamão formosa', 799, 'kg'],
    ['Cheiro-verde (maço)', 300, 'un', true],
    ['Abobrinha', 699, 'kg'],
    ['Pepino japonês', 799, 'kg'],
  ],
  laticinios: [
    ['Leite integral Vale Verde 1 L', 549, 'un', true],
    ['Leite desnatado Vale Verde 1 L', 569, 'un'],
    ['Manteiga Serra Bela 200 g', 1290, 'un'],
    ['Iogurte morango Lácteo Sul 170 g', 299, 'un'],
    ['Requeijão cremoso Serra Bela 200 g', 899, 'un'],
    ['Creme de leite Vale Verde 200 g', 389, 'un'],
    ['Leite condensado Vale Verde 395 g', 699, 'un'],
    ['Queijo minas frescal', 3990, 'kg'],
    ['Bebida láctea chocolate 1 L', 799, 'un'],
    ['Margarina Cremosinha 500 g', 849, 'un'],
    ['Ovos brancos (dúzia)', 1190, 'un', true],
    ['Ovos caipiras (½ dúzia)', 990, 'un'],
  ],
  mercearia: [
    ['Arroz tipo 1 Grão Nobre 5 kg', 2790, 'un', true],
    ['Feijão carioca Pé de Feijão 1 kg', 849, 'un', true],
    ['Feijão preto Pé de Feijão 1 kg', 899, 'un'],
    ['Açúcar refinado Doce Lar 1 kg', 489, 'un'],
    ['Café torrado Serra Alta 500 g', 1890, 'un', true],
    ['Óleo de soja Soyara 900 ml', 769, 'un'],
    ['Macarrão espaguete Nonna 500 g', 459, 'un'],
    ['Farinha de trigo Moinho Real 1 kg', 549, 'un'],
    ['Sal refinado Marinho 1 kg', 249, 'un'],
    ['Molho de tomate Rubra 340 g', 299, 'un'],
    ['Extrato de tomate Rubra 190 g', 349, 'un'],
    ['Farofa pronta Tempero da Vó 250 g', 599, 'un'],
    ['Fubá mimoso Moinho Real 1 kg', 429, 'un'],
    ['Sardinha em óleo Mar Azul 125 g', 699, 'un'],
    ['Milho verde lata 170 g', 389, 'un'],
  ],
  bebidas: [
    ['Refrigerante cola Gelado 2 L', 899, 'un', true],
    ['Refrigerante guaraná Gelado 2 L', 799, 'un'],
    ['Água mineral Fonte Clara 500 ml', 250, 'un', true],
    ['Água com gás Fonte Clara 500 ml', 320, 'un'],
    ['Suco de uva integral Videira 1 L', 1490, 'un'],
    ['Suco de laranja Pomar 1 L', 999, 'un'],
    ['Chá mate Gelado 1,5 L', 649, 'un'],
    ['Cerveja Pilsen Boteco lata 350 ml', 449, 'un'],
    ['Energético Turbo 250 ml', 899, 'un'],
    ['Água de coco Coqueiral 1 L', 1190, 'un'],
    ['Refrigerante laranja Gelado lata', 449, 'un'],
    ['Isotônico Fôlego 500 ml', 599, 'un'],
  ],
  frios: [
    ['Presunto cozido fatiado', 3490, 'kg', true],
    ['Queijo muçarela fatiado', 4590, 'kg', true],
    ['Mortadela tradicional', 2290, 'kg'],
    ['Salame italiano', 7990, 'kg'],
    ['Peito de peru defumado', 5990, 'kg'],
    ['Queijo prato fatiado', 4890, 'kg'],
    ['Salsicha hot dog', 1890, 'kg'],
    ['Linguiça calabresa', 2790, 'kg'],
    ['Apresuntado fatiado', 2490, 'kg'],
    ['Queijo parmesão ralado 50 g', 699, 'un'],
    ['Patê de frango Sabor Bom 100 g', 549, 'un'],
  ],
  acougue: [
    ['Carne moída (patinho)', 4290, 'kg', true],
    ['Peito de frango', 1990, 'kg'],
    ['Coxa e sobrecoxa', 1490, 'kg'],
    ['Alcatra', 5490, 'kg'],
    ['Costela bovina', 2990, 'kg'],
    ['Linguiça toscana', 2490, 'kg'],
    ['Bisteca suína', 2290, 'kg'],
    ['Acém em cubos', 3690, 'kg'],
    ['Filé de tilápia', 4990, 'kg'],
    ['Asa de frango', 1790, 'kg'],
  ],
  doces: [
    ['Chocolate ao leite Cacau Lindo 90 g', 699, 'un', true],
    ['Bala de goma Arco-Íris 100 g', 499, 'un'],
    ['Paçoca rolha (unidade)', 100, 'un', true],
    ['Pé de moleque caseiro', 250, 'un'],
    ['Biscoito recheado chocolate 130 g', 349, 'un'],
    ['Biscoito maisena Vovó Lia 200 g', 459, 'un'],
    ['Doce de leite pastoso 400 g', 1290, 'un'],
    ['Goiabada cascão 300 g', 899, 'un'],
    ['Pirulito de morango', 50, 'un'],
    ['Wafer baunilha Crocante 115 g', 389, 'un'],
    ['Sorvete pote napolitano 1,5 L', 2190, 'un'],
    ['Amendoim japonês 150 g', 549, 'un'],
  ],
  limpeza: [
    ['Detergente neutro Brilhux 500 ml', 279, 'un', true],
    ['Sabão em pó Lavanda Azul 1 kg', 1490, 'un'],
    ['Água sanitária Clarinha 2 L', 799, 'un'],
    ['Esponja dupla face (3 un)', 499, 'un'],
    ['Desinfetante eucalipto 1 L', 849, 'un'],
    ['Amaciante Nuvem 2 L', 1690, 'un'],
    ['Sabão em barra Coco 5 un', 1190, 'un'],
    ['Papel toalha Folha Boa 2 rolos', 799, 'un'],
    ['Saco de lixo 50 L (10 un)', 690, 'un'],
    ['Limpador multiuso 500 ml', 649, 'un'],
    ['Lã de aço (8 un)', 349, 'un'],
  ],
  higiene: [
    ['Papel higiênico Macio 12 rolos', 2290, 'un', true],
    ['Creme dental Sorriso 90 g', 499, 'un'],
    ['Sabonete Erva-Doce 85 g', 249, 'un'],
    ['Shampoo Cachos 350 ml', 1690, 'un'],
    ['Condicionador Cachos 350 ml', 1790, 'un'],
    ['Desodorante aerosol Brisa 150 ml', 1490, 'un'],
    ['Escova de dentes macia', 699, 'un'],
    ['Absorvente com abas (8 un)', 649, 'un'],
    ['Fralda infantil M (20 un)', 3990, 'un'],
    ['Algodão 50 g', 499, 'un'],
    ['Fio dental 50 m', 599, 'un'],
  ],
}

export function gerarCatalogo(): Produto[] {
  const produtos: Produto[] = []
  let seqUn = 0
  let seqKg = 0
  for (const [categoria, linhas] of Object.entries(CATALOGO) as [CategoriaId, Linha[]][]) {
    for (const [nome, preco, unidade, favorito] of linhas) {
      const ean =
        unidade === 'kg'
          ? gerarEANInterno(++seqKg * 7)
          : completarEAN13(`7898${String(1000 + ++seqUn * 37).padStart(8, '0')}`)
      // estoque em unidades ou gramas; alguns itens propositalmente baixos
      const idx = produtos.length
      const baixo = idx % 11 === 3
      const zerado = idx % 37 === 20
      const estoque = zerado
        ? 0
        : unidade === 'kg'
          ? baixo ? 1800 : 8000 + (idx % 7) * 2500
          : baixo ? 3 : 12 + ((idx * 13) % 60)
      produtos.push({
        id: `p${String(idx + 1).padStart(3, '0')}`,
        ean,
        nome,
        categoria,
        precoCentavos: preco,
        unidade,
        estoque,
        estoqueMinimo: unidade === 'kg' ? 3000 : 8,
        favorito: Boolean(favorito),
      })
    }
  }
  return produtos
}
