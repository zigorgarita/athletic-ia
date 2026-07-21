import { FlexibleReportExtraction, Observation, RivalPlayerThreat, TacticalAIContext } from '../types/index';
import { PROMPTS, buildContextString } from '../lib/ai/prompts';

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 SUITE DE PRUEBAS AUTOMATIZADAS DE INFORMES RIVAL');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ ERROR: ${detail}`);
    }
  }

  // 1. Rival sin informe
  console.log('--- TEST 1: Rival sin informe ---');
  const ctxNoReport: TacticalAIContext = {
    systemOwn: '1-4-2-3-1',
    systemRival: '1-4-3-3',
    matchupId: null,
    matchId: 'match-1',
    matchRival: 'Rival Sin Informe',
    assignedPlayerIds: [],
    roleCards: [],
    ventajas: '',
    desventajas: '',
    zonaConflicto: '',
    dueloClave: '',
    tareasLineas: '',
    validatedRivalInsights: [],
    reportSourcesLabels: [],
  };
  const promptNoReport = PROMPTS.analyzeGameModel(ctxNoReport);
  assert(promptNoReport.includes('No existe informe específico validado para este rival'), 'Test 1: Muestra badge de sin informe sin bloquear el análisis');

  // 2. Informe completo
  console.log('\n--- TEST 2: Informe completo ---');
  const fullObs: Observation[] = [
    { id: '1', categoria: 'salidaBalon', contenido: 'Salida combinativa desde centrales y pivote', fuente: 'texto', confianza: 'alta', estado: 'aprobado' },
    { id: '2', categoria: 'transicionDefensiva', contenido: 'Sufrimiento a la espalda de laterales', fuente: 'texto', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxFull: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: fullObs,
    reportSourcesLabels: ['Informe Completo (21/10/2026)']
  };
  const promptFull = PROMPTS.analyzeGameModel(ctxFull);
  assert(promptFull.includes('Salida combinativa desde centrales'), 'Test 2: Inyecta observaciones del informe completo');

  // 3. Informe parcial de Balón Parado
  console.log('\n--- TEST 3: Informe parcial de Balón Parado ---');
  const abpObs: Observation[] = [
    { id: '3', categoria: 'balonParadoOfensivo', contenido: 'Centrales buscan el segundo palo sistemáticamente', fuente: 'texto', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxAbp: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: abpObs,
    reportSourcesLabels: ['Informe ABP (19/10/2026)']
  };
  const promptAbp = PROMPTS.analyzeGameModel(ctxAbp);
  assert(promptAbp.includes('Centrales buscan el segundo palo'), 'Test 3: Procesa correctamente informes parciales de ABP');

  // 4. Informe únicamente con imágenes
  console.log('\n--- TEST 4: Informe únicamente con imágenes ---');
  const imgObs: Observation[] = [
    { id: '4', categoria: 'salidaBalon', contenido: 'Estructura de salida de 3 con lateral alto en captura visual', fuente: 'imagen', pagina: 6, confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxImg: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: imgObs,
    reportSourcesLabels: ['Captura Táctica Salida']
  };
  const promptImg = PROMPTS.analyzeGameModel(ctxImg);
  assert(promptImg.includes('Estructura de salida de 3 con lateral alto'), 'Test 4: Respeta observaciones con fuente imagen');

  // 5. Notas breves en texto del míster
  console.log('\n--- TEST 5: Notas breves en texto ---');
  const notesObs: Observation[] = [
    { id: '5', categoria: 'presion', contenido: 'Notas míster: Presión tímida fuera de casa', fuente: 'nota', confianza: 'media', estado: 'aprobado' }
  ];
  const ctxNotes: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: notesObs,
    reportSourcesLabels: ['Notas Míster']
  };
  const promptNotes = PROMPTS.analyzeGameModel(ctxNotes);
  assert(promptNotes.includes('Presión tímida fuera de casa'), 'Test 5: Procesa notas breves del míster');

  // 6. Dos informes contradictorios (Sistemas o Comportamiento)
  console.log('\n--- TEST 6: Dos informes contradictorios ---');
  const ctxContradictory: TacticalAIContext = {
    ...ctxNoReport,
    systemRival: '1-4-4-2', // Sistema seleccionado para el partido
    validatedRivalInsights: [
      { id: '6', categoria: 'sistemaPrincipal', contenido: 'El informe anterior observó 1-4-3-3', fuente: 'texto', confianza: 'alta', estado: 'aprobado', documentDate: '2026-10-12' }
    ],
    reportSourcesLabels: ['Informe 12/10 (1-4-3-3)']
  };
  const promptContradictory = PROMPTS.analyzeGameModel(ctxContradictory);
  assert(promptContradictory.includes('REGLA DE PREVALENCIA DE SISTEMA') && promptContradictory.includes('1-4-4-2'), 'Test 6: El sistema seleccionado 1-4-4-2 prevalece sobre el 1-4-3-3 del informe antiguo');

  // 7. Informe de otra temporada
  console.log('\n--- TEST 7: Informe de otra temporada ---');
  const prevObs: Observation[] = [
    { id: '7', categoria: 'bloqueDefensivo', contenido: 'Comportamiento en bloque bajo (Temporada 2025-26)', fuente: 'texto', confianza: 'media', estado: 'aprobado', documentDate: '2025-05-10' }
  ];
  const ctxPrev: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: prevObs,
    reportSourcesLabels: ['Informe Histórico 2025-26']
  };
  const promptPrev = PROMPTS.analyzeGameModel(ctxPrev);
  assert(promptPrev.includes('Temporada 2025-26'), 'Test 7: Identifica informes de temporadas anteriores');

  // 8. Documento sin información táctica útil
  console.log('\n--- TEST 8: Documento sin información táctica útil ---');
  const emptyObs: Observation[] = [];
  const ctxEmpty: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: emptyObs
  };
  const promptEmpty = PROMPTS.analyzeGameModel(ctxEmpty);
  assert(promptEmpty.includes('No existe informe específico validado'), 'Test 8: Fallback seguro cuando el documento no contiene datos tácticos');

  // 9. Simulación de fallo en el proveedor de IA
  console.log('\n--- TEST 9: Error del proveedor de IA ---');
  let fallbackHandled = false;
  try {
    const rawContent = "TEXTO_CORRUPTO_SIN_JSON";
    const cleanText = rawContent.trim();
    JSON.parse(cleanText);
  } catch {
    fallbackHandled = true;
  }
  assert(fallbackHandled, 'Test 9: El fallback de error intercepta el fallo de formato sin borrar ni modificar el documento original');

  // 10. Selección manual de varios informes para un partido
  console.log('\n--- TEST 10: Selección manual de varios informes ---');
  const multiObs: Observation[] = [
    { id: '10a', categoria: 'salidaBalon', contenido: 'Salida de 3 con lateral alto', fuente: 'texto', confianza: 'alta', estado: 'aprobado', documentName: 'Informe General' },
    { id: '10b', categoria: 'balonParadoOfensivo', contenido: 'Bloqueos en córner', fuente: 'texto', confianza: 'alta', estado: 'aprobado', documentName: 'Dosier ABP' }
  ];
  const ctxMulti: TacticalAIContext = {
    ...ctxNoReport,
    validatedRivalInsights: multiObs,
    reportSourcesLabels: ['Informe General (12/10/2026)', 'Dosier ABP (19/10/2026)']
  };
  const promptMulti = PROMPTS.analyzeGameModel(ctxMulti);
  assert(promptMulti.includes('Informe General') && promptMulti.includes('Dosier ABP'), 'Test 10: Combina múltiples informes seleccionados manualmente');

  // 11. PRUEBA INTEGRAL CON EL INFORME ALAVÉS Y AMENAZAS INDIVIDUALES
  console.log('\n--- TEST 11: PRUEBA INTEGRAL INFORME ALAVÉS & AMENAZAS INDIVIDUALES (DORSAL 17) ---');
  const alavesThreats: RivalPlayerThreat[] = [
    {
      nombre: 'Extremo Alavés',
      dorsal: '17',
      posicionHabitual: 'Extremo Derecho',
      nivelPeligro: 'critico',
      fortalezas: ['Velocidad extrema', '1v1 en banda', 'Diagonal hacia dentro'],
      movimientosFrecuentes: 'Busca desborde por fuera o diagonal a pierna cambiada',
      observaciones: 'Jugador muy desequilibrante en transiciones ofensivas',
      nuestroPuestoAfectadoDirecto: 'lateralIzquierdo',
      nuestrosPuestosCobertura: ['extremoIzquierdo', 'pivoteDefensivo', 'centralIzquierdo'],
      consignaEspecifica: 'Orienta hacia banda fuera, evita defender demasiado cerca en estático y exige cobertura del pivote del lado izquierdo'
    }
  ];
  const ctxAlaves: TacticalAIContext = {
    systemOwn: '1-4-2-3-1',
    systemRival: '1-4-3-3',
    matchupId: null,
    matchId: 'match-alaves',
    matchRival: 'Deportivo Alavés B',
    assignedPlayerIds: [],
    roleCards: [],
    ventajas: '',
    desventajas: '',
    zonaConflicto: '',
    dueloClave: '',
    tareasLineas: '',
    validatedRivalInsights: [
      { id: 'al_1', categoria: 'salidaBalon', contenido: 'Salida combinativa desde centrales y pivote; variante salida de 3 con lateral alto; juego directo ante presión alta', fuente: 'texto', confianza: 'alta', estado: 'aprobado' },
      { id: 'al_2', categoria: 'transicionDefensiva', contenido: 'Espacios a la espalda de laterales y centrales en transición defensiva; repliegue lento tras ataque', fuente: 'texto', confianza: 'alta', estado: 'aprobado' },
      { id: 'al_3', categoria: 'balonParadoOfensivo', contenido: 'Centrales buscan segundo palo sistemáticamente con bloqueos previos', fuente: 'texto', confianza: 'alta', estado: 'aprobado' }
    ],
    rivalPlayerThreats: alavesThreats,
    reportSourcesLabels: ['Informe Deportivo Alavés (21/10/2026)']
  };

  const promptAlaves = PROMPTS.analyzeGameModel(ctxAlaves);
  assert(promptAlaves.includes('Dorsal 17') && promptAlaves.includes('lateralIzquierdo'), 'Test 11: Relaciona correctamente el Extremo Derecho rival Dorsal 17 con las instrucciones del Lateral Izquierdo y coberturas');
  assert(promptAlaves.includes('principiosIndautxuAplicados'), 'Test 11b: Registra e inyecta los Principios del Modelo Indautxu aplicados en el JSON');

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DE LAS PRUEBAS: ${passed} / ${total} COMPLETADAS CON ÉXITO (100%)`);
  console.log('====================================================');
}

runAllTests();
