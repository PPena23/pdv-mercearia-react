import { useEffect, useRef } from 'react'

export type MapaAtalhos = Partial<Record<string, (e: KeyboardEvent) => void>>

/**
 * Registra atalhos globais de teclado (ex.: { F2: focarBusca, F10: finalizar }).
 * O mapa fica num ref, então o listener é registrado UMA vez e sempre chama
 * a versão mais recente dos handlers — sem re-registrar a cada render.
 */
export function useAtalhos(mapa: MapaAtalhos, ativo = true): void {
  const mapaRef = useRef(mapa)

  useEffect(() => {
    mapaRef.current = mapa
  })

  useEffect(() => {
    if (!ativo) return
    const aoPressionar = (e: KeyboardEvent) => {
      // não interfere quando algum diálogo modal está aberto
      if (document.querySelector('[aria-modal="true"]')) return
      const handler = mapaRef.current[e.key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', aoPressionar)
    return () => window.removeEventListener('keydown', aoPressionar)
  }, [ativo])
}
