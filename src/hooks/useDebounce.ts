import { useEffect, useState } from 'react'

/** Devolve `valor` só depois de `atraso` ms sem mudanças (evita filtrar a cada tecla). */
export function useDebounce<T>(valor: T, atraso = 200): T {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), atraso)
    return () => clearTimeout(t) // cancela o timer anterior a cada nova tecla
  }, [valor, atraso])

  return atrasado
}
