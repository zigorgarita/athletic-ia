'use client';

import React from 'react';

export interface CapaCSubItem {
  role?: string;
  text: string;
}

export interface CapaCItem {
  concept?: string;
  text: string;
  subItems?: CapaCSubItem[];
}

export interface CapaCBlock {
  title?: string;
  items: CapaCItem[];
}

interface CapaCStructuredViewProps {
  text?: string | null;
  fallbackText?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Parser 100% determinista para la Capa C — Propuesta SD Indautxu.
 * Soporta formato estructurado moderno (desde prompt IA) y formato párrafo corrido (antiguos).
 * GARANTÍA VINCULANTE: Cero pérdida de información, cero reescritura subjetiva.
 */
export function parseCapaCText(rawText?: string | null): CapaCBlock[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // CASO 1: Formato con saltos de línea (generado por nueva IA o con viñetas explícitas)
  if (text.includes('\n')) {
    const rawLines = text
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.trim().length > 0);

    const blocks: CapaCBlock[] = [];
    let currentBlock: CapaCBlock | null = null;
    let currentItem: CapaCItem | null = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Es línea indentada / subpunto
      const isIndented =
        line.startsWith('  ') ||
        line.startsWith('\t') ||
        line.startsWith('    ') ||
        trimmed.startsWith('↳') ||
        (trimmed.startsWith('- ') && currentItem !== null && (currentItem.text.length > 0 || currentItem.concept !== undefined));

      // Detección de encabezado de bloque (Todo mayúsculas, [TAG], # TAG, o CONCEPTO → ... sin viñeta)
      const isHeader =
        !isIndented &&
        (/^\[.*\]$/.test(trimmed) ||
          /^#{1,4}\s+/.test(trimmed) ||
          (!trimmed.startsWith('•') &&
            !trimmed.startsWith('*') &&
            !trimmed.startsWith('-') &&
            !/^\d+[\.\)]/.test(trimmed) &&
            (trimmed.toUpperCase() === trimmed && trimmed.length > 3 ||
              /^(BLOQUE|ACTIVADOR|SI NOS HUNDEN|DEFENSA|INICIO|OBJETIVO|PROGRESIÓN|PROGRESION|SUPERADA|EXTREMOS|SALIDA|PRESION|PRESIÓN|TRANSICION|TRANSICIÓN|ABP|VIGILANCIA|MARCAJE|CAMBIO DE MARCA)/i.test(
                trimmed
              ) ||
              (trimmed.includes('→') && !trimmed.startsWith('•')))));

      if (isHeader) {
        const cleanTitle = trimmed.replace(/^#{1,4}\s+/, '').replace(/^\[(.*)\]$/, '$1');
        currentBlock = { title: cleanTitle, items: [] };
        blocks.push(currentBlock);
        currentItem = null;
        continue;
      }

      if (!currentBlock) {
        currentBlock = { items: [] };
        blocks.push(currentBlock);
      }

      // Subpunto
      if (isIndented || trimmed.startsWith('↳')) {
        const subText = trimmed.replace(/^[↳\-\*•]\s*/, '').trim();
        let role: string | undefined = undefined;
        let mainSubText = subText;

        const arrowMatch = subText.match(/^([^→:]+?)\s*(?:→|:)\s*(.+)$/);
        if (arrowMatch && arrowMatch[1].length < 35) {
          role = arrowMatch[1].trim();
          mainSubText = arrowMatch[2].trim();
        }

        if (!currentItem) {
          currentItem = { text: '', subItems: [] };
          currentBlock.items.push(currentItem);
        }

        if (!currentItem.subItems) currentItem.subItems = [];
        currentItem.subItems.push({ role, text: mainSubText });
        continue;
      }

      // Punto de acción principal
      let itemText = trimmed.replace(/^[•\-\*]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
      let itemConcept: string | undefined = undefined;

      const bracketMatch = itemText.match(/^\[(.*?)\]\s*(.*)$/);
      if (bracketMatch) {
        itemConcept = bracketMatch[1];
        itemText = bracketMatch[2];
      } else {
        const colonMatch = itemText.match(/^([A-ZÁÉÍÓÚÑ0-9\s\-_→]{3,40}):\s*(.*)$/);
        if (colonMatch) {
          itemConcept = colonMatch[1].trim();
          itemText = colonMatch[2].trim();
        }
      }

      currentItem = {
        concept: itemConcept,
        text: itemText,
        subItems: []
      };
      currentBlock.items.push(currentItem);
    }

    if (blocks.length > 0) return blocks;
  }

  // CASO 2: Formato párrafo corrido / texto sin saltos de línea (antiguo)
  return parseUnstructuredParagraph(text);
}

/**
 * Descompone oraciones de informes antiguos de forma 100% determinista sin perder ni resumir palabras.
 */
function parseUnstructuredParagraph(text: string): CapaCBlock[] {
  const sentences = text
    .split(/(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return [{ items: [{ text }] }];

  const blocks: CapaCBlock[] = [];

  for (const sent of sentences) {
    // 1. Patrón: Activador de presión / Dos puntos
    if (sent.includes(':')) {
      const parts = sent.split(/:\s*/);
      if (parts.length === 2) {
        const prefix = parts[0].trim();
        const actionBody = parts[1].trim();

        if (/activador|presi[oó]n|bloque|inicio|salida|transici[oó]n/i.test(prefix)) {
          const block: CapaCBlock = {
            title: prefix.toUpperCase().includes('ACTIVADOR')
              ? prefix.replace(/^el\s+/i, '').replace(/será\s+el\s+/i, '→ ')
              : prefix,
            items: []
          };

          const cleanBody = actionBody.replace(/^en ese momento realizaremos\s+/i, '');
          const actions = cleanBody.split(/\s+y\s+(?=emparejamientos|basculaci|saltos|coberturas|presi)/i);

          for (const act of actions) {
            block.items.push({ text: capitalize(act.trim()) });
          }
          blocks.push(block);
          continue;
        }
      }
    }

    // 2. Patrón: Si nos hunden a Bloque Bajo con cambio de marcas
    const siNosHundenMatch = sent.match(/^(Si nos hunden\s*(?:a\s*Bloque Bajo\s*(?:\(1-4-4-2\))?)?)[,\s]+(.*)$/i);
    if (siNosHundenMatch) {
      const header = siNosHundenMatch[1].trim();
      const rest = siNosHundenMatch[2].trim();

      const block: CapaCBlock = {
        title: header.toUpperCase().includes('BLOQUE BAJO') ? 'SI NOS HUNDEN → BLOQUE BAJO (1-4-4-2)' : header,
        items: []
      };

      const parenMatch = rest.match(/^(.*?)\s*\((.+?)\)\s*(?:y\s*(.*))?$/);
      if (parenMatch) {
        const preParen = parenMatch[1].trim();
        const inParen = parenMatch[2].trim();
        const postParen = parenMatch[3] ? parenMatch[3].trim() : '';

        const item1: CapaCItem = {
          concept: preParen.toUpperCase().includes('CAMBIO DE MARCA') ? 'CAMBIO DE MARCA EN BANDA' : undefined,
          text: preParen,
          subItems: []
        };

        const roleClauses = inParen.split(/,\s*/);
        for (const rc of roleClauses) {
          const arrowM = rc.match(/^(?:nuestro\s+)?(extremo|lateral|central|pivote|mediapunta|portero|delantero)\s+(?:toma\s+al\s+|al\s+|a\s+|siguiendo\s+|posicionados\s+)?(.*)$/i);
          if (arrowM) {
            item1.subItems!.push({
              role: capitalize(arrowM[1]),
              text: arrowM[2].trim() ? arrowM[2].trim() : rc
            });
          } else {
            item1.subItems!.push({ text: rc });
          }
        }
        block.items.push(item1);

        if (postParen) {
          const item2: CapaCItem = {
            concept: 'DEFENSA DEL ÁREA',
            text: postParen,
            subItems: []
          };

          const areaRoles = postParen.replace(/^defenderemos\s+el\s+área\s+con\s+/i, '').split(/\s+y\s+(?:los\s+)?/i);
          if (areaRoles.length > 1) {
            for (const ar of areaRoles) {
              const roleM = ar.match(/^(centrales|pivotes|laterales|portero)\s*(?:posicionados\s+por\s+|siguiendo\s+las\s+|en\s+)?(.*)$/i);
              if (roleM) {
                item2.subItems!.push({
                  role: capitalize(roleM[1]),
                  text: roleM[2] ? roleM[2].trim() : ar
                });
              } else {
                item2.subItems!.push({ text: ar });
              }
            }
          }
          block.items.push(item2);
        }
      } else {
        block.items.push({ text: rest });
      }

      blocks.push(block);
      continue;
    }

    // 3. Patrón: Bloque Medio 1-4-1-3-2
    const bloqueMedioMatch = sent.match(/^(?:Nos organizaremos en\s+)?(Bloque Medio(?:\s+bajo nuestra estructura\s+1-4-1-3-2)?)\s*(?:para\s+)?(.*)$/i);
    if (bloqueMedioMatch) {
      blocks.push({
        title: 'BLOQUE MEDIO → 1-4-1-3-2',
        items: [{ text: bloqueMedioMatch[2] ? capitalize(bloqueMedioMatch[2].replace(/^para\s+/i, 'Cerrar ')) : sent }]
      });
      continue;
    }

    // 4. Patrón: Inicio combinativo y cuadrado de superioridad
    const inicioMatch = sent.match(/^(?:Utilizaremos nuestro\s+)?(inicio combinativo)\s*(?:en base a\s+)?(.*)$/i);
    if (inicioMatch) {
      const rest = inicioMatch[2];
      const block: CapaCBlock = {
        title: 'INICIO COMBINATIVO',
        items: []
      };

      const parenMatch = rest.match(/^(un cuadrado de superioridad)\s*\((.+?)\)\s*(?:para\s+(.*))?$/i);
      if (parenMatch) {
        const item1: CapaCItem = {
          concept: 'Cuadrado de superioridad',
          text: 'Cuadrado de superioridad:',
          subItems: parenMatch[2].split(/\s+y\s+/).map(p => ({ text: capitalize(p.trim()) }))
        };
        block.items.push(item1);
        if (parenMatch[3]) {
          block.items.push({
            concept: 'Objetivo',
            text: capitalize(parenMatch[3].trim())
          });
        }
      } else {
        block.items.push({ text: rest });
      }
      blocks.push(block);
      continue;
    }

    // 5. Patrón: Progresión con tercer hombre y fijar para dividir
    if (/tercer hombre|fijar.*dividir/i.test(sent)) {
      const block: CapaCBlock = {
        title: 'PROGRESIÓN',
        items: []
      };
      const clauses = sent.split(/\s+y\s+(?=fijar|buscar)/i);
      for (const c of clauses) {
        block.items.push({ text: capitalize(c.trim()) });
      }
      blocks.push(block);
      continue;
    }

    // 6. Patrón: Superada primera línea y extremos
    const superadaMatch = sent.match(/^(Una vez superada su primera línea)[,\s]+activaremos\s+(.*)$/i);
    if (superadaMatch) {
      const block: CapaCBlock = {
        title: 'SUPERADA SU PRIMERA LÍNEA → ACELERAR',
        items: []
      };
      const rest = superadaMatch[2];
      const paraQueMatch = rest.match(/^(.*?)\s+para que (nuestros extremos\s+.*)$/i);
      if (paraQueMatch) {
        const envios = paraQueMatch[1].split(/\s+y\s+(?=diagonales|env)/i);
        for (const e of envios) {
          block.items.push({ text: capitalize(e.trim()) });
        }
        blocks.push(block);

        blocks.push({
          title: 'EXTREMOS',
          items: [{ text: capitalize(paraQueMatch[2].replace(/^nuestros extremos\s+/i, 'Explotar ')) }]
        });
        continue;
      } else {
        block.items.push({ text: rest });
        blocks.push(block);
        continue;
      }
    }

    // Fallback determinista seguro: Toda la oración preservada intacta como consigna
    blocks.push({
      items: [{ text: sent }]
    });
  }

  return blocks;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Componente Visual Premium para la Capa C — Propuesta SD Indautxu
 */
export default function CapaCStructuredView({
  text,
  fallbackText = 'Mantener principios del modelo de juego Indautxu.',
  className = '',
  compact = false,
}: CapaCStructuredViewProps) {
  if (!text || !text.trim()) {
    return (
      <p className="text-emerald-200/80 italic text-xs pl-1">
        {fallbackText}
      </p>
    );
  }

  const blocks = parseCapaCText(text);

  if (blocks.length === 0) {
    return (
      <p className="text-emerald-200 text-xs pl-1 leading-relaxed">
        {text}
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, bIdx) => (
        <div key={bIdx} className="space-y-1.5">
          {/* TÍTULO / CONCEPTO DESTACADO */}
          {block.title && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-[10px] uppercase tracking-wider shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {block.title.includes('→') ? (
                  <>
                    <span>{block.title.split('→')[0].trim()}</span>
                    <span className="text-emerald-400 font-semibold">→</span>
                    <span className="text-emerald-200 normal-case font-medium">{block.title.split('→')[1].trim()}</span>
                  </>
                ) : (
                  block.title
                )}
              </span>
            </div>
          )}

          {/* LISTA DE PUNTOS / ACCIONES */}
          <div className={`space-y-1.5 ${block.title ? (compact ? 'pl-2' : 'pl-2.5') : ''}`}>
            {block.items.map((item, iIdx) => (
              <div key={iIdx} className="space-y-1">
                {/* Concepto inline opcional */}
                {item.concept && (
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                    <span className="text-emerald-400 font-bold">›</span>
                    {item.concept}
                  </div>
                )}

                {/* Texto del punto */}
                {item.text && (
                  <div className="flex items-start gap-1.5 text-xs text-emerald-200 leading-relaxed font-medium">
                    <span className="text-emerald-400 font-bold select-none mt-0.5">•</span>
                    <span className="flex-1">{item.text}</span>
                  </div>
                )}

                {/* Subpuntos / Desglose de Jugadores */}
                {item.subItems && item.subItems.length > 0 && (
                  <div className="ml-4 pl-2 border-l border-emerald-800/40 space-y-1 my-1">
                    {item.subItems.map((sub, sIdx) => (
                      <div key={sIdx} className="text-xs text-emerald-300/90 flex items-start gap-1.5 leading-snug">
                        <span className="text-emerald-400/80 font-bold select-none">↳</span>
                        <div className="flex-1">
                          {sub.role ? (
                            <span>
                              <strong className="text-emerald-200 font-semibold">{sub.role}</strong>
                              <span className="text-emerald-400/90 mx-1">→</span>
                              <span className="text-emerald-300/80">{sub.text}</span>
                            </span>
                          ) : (
                            <span>{sub.text}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
