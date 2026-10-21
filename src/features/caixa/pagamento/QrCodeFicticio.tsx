import { useMemo } from 'react'

/**
 * Desenha um "QR Code" FICTÍCIO em SVG a partir de um texto (hash simples).
 * Tem cara de QR (os três "olhos" de posicionamento), mas não é escaneável —
 * é só para a demonstração do fluxo do Pix.
 */
const N = 25

function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619)
  return h >>> 0
}

function ehOlho(x: number, y: number) {
  const emCanto = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7
  return emCanto(0, 0) || emCanto(N - 7, 0) || emCanto(0, N - 7)
}

export function QrCodeFicticio({ conteudo, className }: { conteudo: string; className?: string }) {
  const modulos = useMemo(() => {
    let s = hash(conteudo)
    const lista: [number, number][] = []
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (ehOlho(x, y)) continue
        s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0
        if (s % 100 < 47) lista.push([x, y])
      }
    }
    return lista
  }, [conteudo])

  const olho = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" fill="currentColor" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="currentColor" />
    </g>
  )

  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className={className} role="img" aria-label="QR Code Pix fictício para demonstração" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#fff" />
      {modulos.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
      {olho(0, 0)}
      {olho(N - 7, 0)}
      {olho(0, N - 7)}
    </svg>
  )
}
