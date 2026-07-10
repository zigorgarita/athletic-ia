const regex = /\[([A-Z]{2,4})[^\]]*\]\s*(?:Línea|Posición)?.*?:?\s*([\s\S]*?)(?=(?:\[[A-Z]{2,4}[^\]]*\]|\n\n[A-Z]|$))/gi;
const text = `
Aquí tienes las fichas:

[POR] Portero
- Fase Ofensiva: texto
[LD] Lateral Derecho
- Fase Ofensiva: texto
[DFC] Central
- Fase Ofensiva: texto
[DFC] Central
- Fase Ofensiva: texto
[LI] Lateral Izquierdo
- Fase Ofensiva: texto
[MCD] Pivote
- Fase Ofensiva: texto
[MCD] Pivote
- Fase Ofensiva: texto
[MCO] Mediapunta
- Fase Ofensiva: texto
[ED] Extremo
- Fase Ofensiva: texto
[EI] Extremo
- Fase Ofensiva: texto
[DC] Delantero
- Fase Ofensiva: texto
`;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log('Matched:', match[1]);
}
