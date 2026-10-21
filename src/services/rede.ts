/*
 * Simula a latência (e, opcionalmente, instabilidade) de uma API HTTP.
 * Tudo que sai daqui é uma Promise de verdade, então as telas usam
 * async/await, estados de carregamento e tratamento de erro reais.
 */

export class ErroApi extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

const CHAVE_FALHA = 'pe-de-feijao:simular-falha'

export function simulandoFalhas(): boolean {
  try {
    return localStorage.getItem(CHAVE_FALHA) === '1'
  } catch {
    return false
  }
}

export function definirSimulacaoFalhas(ativo: boolean): void {
  try {
    if (ativo) localStorage.setItem(CHAVE_FALHA, '1')
    else localStorage.removeItem(CHAVE_FALHA)
  } catch {
    /* ignora */
  }
}

export function esperar(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelado', 'AbortError'))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Cancelado', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Executa `operacao` depois de um atraso, devolvendo uma cópia (como se viesse da rede). */
export async function simularRede<T>(operacao: () => T, atraso: [number, number] = [250, 700]): Promise<T> {
  const [min, max] = atraso
  await esperar(min + Math.random() * (max - min))
  if (simulandoFalhas() && Math.random() < 0.25) {
    throw new ErroApi('Falha de conexão com o servidor (simulada). Tente novamente.')
  }
  return structuredClone(operacao())
}
