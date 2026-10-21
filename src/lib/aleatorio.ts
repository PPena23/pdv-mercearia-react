/** PRNG determinístico (mulberry32): mesma semente, mesmos dados de demonstração. */
export function criarAleatorio(semente: number) {
  let a = semente >>> 0
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    proximo,
    inteiro: (min: number, max: number) => Math.floor(proximo() * (max - min + 1)) + min,
    escolher: <T>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)],
    chance: (p: number) => proximo() < p,
  }
}

export type Aleatorio = ReturnType<typeof criarAleatorio>

export function gerarId(prefixo: string): string {
  const sufixo =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefixo}_${Date.now().toString(36)}${sufixo}`
}
