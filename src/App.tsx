import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { CaixaPage } from '@/features/caixa/CaixaPage'
import { FechamentoPage } from '@/features/caixa/FechamentoPage'
import { NaoEncontrada } from '@/pages/NaoEncontrada'

/*
 * Code splitting: só o caixa vai no pacote inicial (é a tela que precisa abrir rápido).
 * As demais rotas carregam sob demanda com lazy + Suspense; Relatórios traz o Recharts.
 */
const RelatoriosPage = lazy(() => import('@/features/relatorios/RelatoriosPage'))
const ProdutosPage = lazy(() => import('@/features/produtos/ProdutosPage').then((m) => ({ default: m.ProdutosPage })))
const ProdutoFormRota = lazy(() => import('@/features/produtos/ProdutoFormRota').then((m) => ({ default: m.ProdutoFormRota })))
const EstoquePage = lazy(() => import('@/features/estoque/EstoquePage').then((m) => ({ default: m.EstoquePage })))
const VendasPage = lazy(() => import('@/features/vendas/VendasPage').then((m) => ({ default: m.VendasPage })))
const VendaDetalhe = lazy(() => import('@/features/vendas/VendaDetalhe').then((m) => ({ default: m.VendaDetalhe })))
const ClientesPage = lazy(() => import('@/features/clientes/ClientesPage').then((m) => ({ default: m.ClientesPage })))

/** HashRouter: funciona no GitHub Pages sem configurar fallback de 404 no servidor. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/caixa" replace />} />
          <Route path="caixa">
            <Route index element={<CaixaPage />} />
            <Route path="fechamento" element={<FechamentoPage />} />
          </Route>
          {/* rotas aninhadas: o formulário abre como diálogo POR CIMA da lista */}
          <Route path="produtos" element={<ProdutosPage />}>
            <Route path="novo" element={<ProdutoFormRota />} />
            <Route path=":produtoId" element={<ProdutoFormRota />} />
          </Route>
          <Route path="estoque" element={<EstoquePage />} />
          <Route path="vendas" element={<VendasPage />}>
            <Route path=":vendaId" element={<VendaDetalhe />} />
          </Route>
          <Route path="clientes-fiado" element={<ClientesPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
