import { Component, type ErrorInfo, type ReactNode } from 'react'
import { EstadoErro } from '@/components/ui'

interface Estado {
  erro: Error | null
}

/**
 * Error Boundary — ainda precisa ser componente de classe: React só expõe
 * getDerivedStateFromError/componentDidCatch nesse formato de ciclo de vida.
 */
export class LimiteErro extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // num app real: enviar para Sentry/LogRocket
    console.error('Erro de renderização capturado:', erro, info.componentStack)
  }

  render() {
    if (this.state.erro) {
      return (
        <EstadoErro
          mensagem={`Algo deu errado nesta tela: ${this.state.erro.message}`}
          aoTentarDeNovo={() => this.setState({ erro: null })}
        />
      )
    }
    return this.props.children
  }
}
