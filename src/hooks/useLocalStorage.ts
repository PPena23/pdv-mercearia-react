import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

function ler<T>(chave: string, inicial: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto === null ? inicial : (JSON.parse(bruto) as T)
  } catch {
    return inicial
  }
}

/** useState que persiste no localStorage e sincroniza entre abas. */
export function useLocalStorage<T>(chave: string, inicial: T): [T, Dispatch<SetStateAction<T>>] {
  // inicialização preguiçosa: lê o storage só na primeira renderização
  const [valor, setValor] = useState<T>(() => ler(chave, inicial))

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      /* storage cheio ou bloqueado: segue em memória */
    }
  }, [chave, valor])

  // outra aba alterou a mesma chave
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      if (e.key === chave && e.newValue !== null) setValor(JSON.parse(e.newValue) as T)
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar) // limpeza ao desmontar
  }, [chave])

  return [valor, setValor]
}
