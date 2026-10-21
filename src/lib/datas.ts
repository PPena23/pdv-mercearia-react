const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const fmtData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' })
const fmtDiaCurto = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' })

export const formatDataHora = (iso: string) => fmtDataHora.format(new Date(iso))
export const formatData = (iso: string) => fmtData.format(new Date(iso))
export const formatHora = (iso: string) => fmtHora.format(new Date(iso))
export const formatDiaCurto = (d: Date) => fmtDiaCurto.format(d).replace('.', '')

/** Chave AAAA-MM-DD no fuso local (sem surpresas de UTC). */
export function chaveDia(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function inicioDoDia(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function adicionarDias(d: Date, dias: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + dias)
  return c
}

/** Converte "AAAA-MM-DD" (input type=date) em Date local. */
export function dataDeInput(valor: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
