import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cx } from '@/lib/cx'
import { useCaixa } from '@/hooks/useCaixa'
import { Logo } from './Logo'
import { MenuDemonstracao } from './MenuDemonstracao'
import { LimiteErro } from './LimiteErro'
import { Skeleton } from '@/components/ui'

function CarregandoPagina() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando página">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}

const LINKS = [
  { para: '/caixa', rotulo: 'Caixa', icone: '🛒' },
  { para: '/produtos', rotulo: 'Produtos', icone: '🏷️' },
  { para: '/estoque', rotulo: 'Estoque', icone: '📦' },
  { para: '/vendas', rotulo: 'Vendas', icone: '🧾' },
  { para: '/clientes-fiado', rotulo: 'Fiado', icone: '📒' },
  { para: '/relatorios', rotulo: 'Relatórios', icone: '📊' },
]

/** Layout raiz: cabeçalho + navegação; as rotas filhas aparecem no <Outlet />. */
export function AppLayout() {
  const { sessao } = useCaixa()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-xl bg-lima-400 px-4 py-2 font-bold text-lima-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 bg-uva-700 text-white shadow-[0_2px_0_var(--color-uva-900)] print:hidden">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <NavLink to="/caixa" className="flex shrink-0 items-center gap-2.5 rounded-xl pr-2" aria-label="Pé de Feijão — ir para o caixa">
            <Logo className="size-10" />
            <span className="hidden leading-none sm:block">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-lima-300">Mercearia</span>
              <span className="block text-lg font-black">Pé de Feijão</span>
            </span>
          </NavLink>

          <nav aria-label="Principal" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex gap-1">
              {LINKS.map((l) => (
                <li key={l.para}>
                  <NavLink
                    to={l.para}
                    className={({ isActive }) =>
                      cx(
                        'flex h-11 items-center gap-2 rounded-xl px-3.5 font-bold transition-colors',
                        isActive ? 'bg-white text-uva-700' : 'text-uva-100 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <span aria-hidden>{l.icone}</span>
                    {l.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cx(
                'hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold md:inline-flex',
                sessao ? 'bg-lima-400 text-lima-900' : 'bg-white/10 text-uva-100',
              )}
            >
              <span aria-hidden className={cx('size-2 rounded-full', sessao ? 'bg-lima-900' : 'bg-uva-200')} />
              {sessao ? `Caixa aberto · ${sessao.operador}` : 'Caixa fechado'}
            </span>
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="grid size-11 place-items-center rounded-xl text-uva-100 hover:bg-white/10 hover:text-white"
              aria-label="Opções da demonstração"
            >
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                <circle cx="12" cy="5" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="19" r="2" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* navegação compacta para celular/tablet retrato */}
        <nav aria-label="Principal (compacta)" className="border-t border-white/10 lg:hidden">
          <ul className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
            {LINKS.map((l) => (
              <li key={l.para} className="shrink-0">
                <NavLink
                  to={l.para}
                  className={({ isActive }) =>
                    cx(
                      'flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold',
                      isActive ? 'bg-white text-uva-700' : 'text-uva-100',
                    )
                  }
                >
                  <span aria-hidden>{l.icone}</span>
                  {l.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 outline-none sm:px-5 sm:py-6">
        {/* key no pathname: um erro numa página não "prende" as outras */}
        <LimiteErro key={pathname.split('/')[1]}>
          {/* rotas lazy mostram o esqueleto enquanto o código da página baixa */}
          <Suspense fallback={<CarregandoPagina />}>
            <Outlet />
          </Suspense>
        </LimiteErro>
      </main>

      <footer className="border-t border-borda py-4 text-center text-xs text-tinta-suave print:hidden">
        Projeto de portfólio · dados fictícios e pagamentos simulados · feito por Pedro Pena
      </footer>

      <MenuDemonstracao aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
    </div>
  )
}
