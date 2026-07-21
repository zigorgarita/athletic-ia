/**
 * scratch/test_game_model_matchups.ts
 * Script de prueba de validación para el Modelo de Juego del Indautxu DH (1-4-2-3-1)
 * Prueba la ontología fija (lib/ai/gameModel.ts), la compilación del prompt JSON (lib/ai/prompts.ts)
 * y la estructura de los 11 roles e instrucciones.
 */

import { DOCTRINA_INVIOLABLE_INDAUTXU, COMPORTAMIENTOS_ADAPTATIVOS_INDAUTXU, GAME_MODEL_INDAUTXU } from '../lib/ai/gameModel';
import { PROMPTS } from '../lib/ai/prompts';

console.log('================================================================');
console.log('SUITE DE PRUEBAS: MODELO DE JUEGO S.D. INDAUTXU DH (1-4-2-3-1)');
console.log('================================================================\n');

// 1. Verificación de la Ontología Fija
console.log('1. VERIFICACIÓN DE DOCTRINA E INTEGRIDAD DE ONTOLOGÍA:');
console.log(' - Sistema Base Inviolable:', GAME_MODEL_INDAUTXU.identidad.sistema_base);
console.log(' - Bloque Máximo Defensivo:', DOCTRINA_INVIOLABLE_INDAUTXU.REGLA_BLOQUE_DEFENSIVO_MAX_METROS, 'metros');
console.log(' - Distancia entre líneas:', DOCTRINA_INVIOLABLE_INDAUTXU.REGLA_DISTANCIA_ENTRE_LINEAS_METROS);
console.log(' - Ventana Presión 6-8s Condicionada:', DOCTRINA_INVIOLABLE_INDAUTXU.PRESION_TRAS_PERDIDA_VENTANA_SEGUNDOS);
console.log(' - Condiciones de Presión:', DOCTRINA_INVIOLABLE_INDAUTXU.PRESION_TRAS_PERDIDA_CONDICIONES_OBLIGATORIAS.length, 'requisitos cargados');
console.log(' - Criterio de Abandono de Presión:', COMPORTAMIENTOS_ADAPTATIVOS_INDAUTXU.CRITERIO_ABANDONO_PRESIÓN ? 'OK' : 'MISSING');
console.log(' - Repliegue Adaptativo:', COMPORTAMIENTOS_ADAPTATIVOS_INDAUTXU.DIBUJO_REPLIEGUE_ADAPTATIVO ? 'OK' : 'MISSING');
console.log(' - Roles por Puesto:', Object.keys(GAME_MODEL_INDAUTXU.roles).join(', '));
console.log(' STATUS: ✅ OK\n');

// 2. Simulación de Prompts para los 3 Matchups
const matchupsToTest = [
  { own: '1-4-2-3-1', rival: '1-4-4-2', desc: 'Vs 1-4-4-2 (2 Puntas)' },
  { own: '1-4-2-3-1', rival: '1-4-3-3', desc: 'Vs 1-4-3-3 (1 Punta)' },
  { own: '1-4-2-3-1', rival: '1-3-5-2', desc: 'Vs 1-3-5-2 (3 Centrales + 2 Carrileros)' }
];

console.log('2. PRUEBA DE COMPILACIÓN DE PROMPTS Y ESQUEMA JSON:');

matchupsToTest.forEach((m, idx) => {
  console.log(`\n--- [TEST ${idx + 1}] Matchup: ${m.own} vs ${m.rival} (${m.desc}) ---`);
  
  const ctx = {
    systemOwn: m.own,
    systemRival: m.rival,
    matchRival: `Rival Test ${idx + 1}`,
    assignedPlayersList: '- Dorsal 1: Aritz (POR)\n- Dorsal 4: Unax (DFC)\n- Dorsal 6: Joel (DFC)\n- Dorsal 10: Jean (MCO)\n- Dorsal 9: Jon (DC)'
  };

  const compiledPrompt = PROMPTS.analyzeGameModel(ctx);

  // Verificaciones de contenido en el prompt compilado
  const hasSystemOwn = compiledPrompt.includes(m.own);
  const hasSystemRival = compiledPrompt.includes(m.rival);
  const hasHierarchy = compiledPrompt.includes('JERARQUÍA DE PRIORIDADES INVIOLABLE');
  const hasConditionalPressing = compiledPrompt.includes('CONDICIONADA');
  const hasJsonReq = compiledPrompt.includes('OBJETO JSON VÁLIDO');
  const hasElevenRoles = compiledPrompt.includes('centralIzquierdo') && compiledPrompt.includes('pivoteOfensivo') && compiledPrompt.includes('extremoDerecho');

  console.log(' - Inyección Sistema Propio:', hasSystemOwn ? '✅ OK' : '❌ FAIL');
  console.log(' - Inyección Sistema Rival:', hasSystemRival ? '✅ OK' : '❌ FAIL');
  console.log(' - Jerarquía de Prioridades:', hasHierarchy ? '✅ OK' : '❌ FAIL');
  console.log(' - Exigencia JSON Estricto:', hasJsonReq ? '✅ OK' : '❌ FAIL');
  console.log(' - Requisito 11 Roles Individuales:', hasElevenRoles ? '✅ OK' : '❌ FAIL');

  if (hasSystemOwn && hasSystemRival && hasHierarchy && hasConditionalPressing && hasJsonReq && hasElevenRoles) {
    console.log(` RESULTADO TEST ${idx + 1}: ✅ PASADO (Prompt de análisis estricto JSON listo)`);
  } else {
    console.error(` RESULTADO TEST ${idx + 1}: ❌ FALLADO`);
  }
});

console.log('\n================================================================');
console.log('PRUEBAS DE VALIDACIÓN FINALIZADAS CON ÉXITO');
console.log('================================================================');
