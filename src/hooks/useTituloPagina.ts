import { useEffect } from 'react'

/** Atualiza o <title> da aba conforme a rota (ajuda leitores de tela e histórico). */
export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    const anterior = document.title
    document.title = `${titulo} · Pé de Feijão PDV`
    return () => {
      document.title = anterior
    }
  }, [titulo])
}
