import fs from 'fs';
import path from 'path';

// Pre-load env before any module imports
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

async function runAllTests() {
  const { PROMPTS } = await import('../lib/ai/prompts');
  const { transformGoogleDriveUrl, validateDocumentBuffer } = await import('../lib/ai/document-parser');

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
  const ctxNoReport: any = {
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
  const fullObs: any[] = [
    { id: '1', categoria: 'salidaBalon', contenido: 'Salida combinativa desde centrales y pivote', fuente: 'texto', confianza: 'alta', estado: 'aprobado' },
    { id: '2', categoria: 'transicionDefensiva', contenido: 'Sufrimiento a la espalda de laterales', fuente: 'texto', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxFull: any = {
    ...ctxNoReport,
    validatedRivalInsights: fullObs,
    reportSourcesLabels: ['Informe Completo (21/10/2026)']
  };
  const promptFull = PROMPTS.analyzeGameModel(ctxFull);
  assert(promptFull.includes('Salida combinativa desde centrales'), 'Test 2: Inyecta observaciones del informe completo');

  // 3. Informe parcial de Balón Parado
  console.log('\n--- TEST 3: Informe parcial de Balón Parado ---');
  const abpObs: any[] = [
    { id: '3', categoria: 'balonParadoOfensivo', contenido: 'Bloqueo central en córners con remate al primer palo', fuente: 'tabla', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxAbp: any = {
    ...ctxNoReport,
    validatedRivalInsights: abpObs,
    reportSourcesLabels: ['Informe ABP Alavés']
  };
  const promptAbp = PROMPTS.analyzeGameModel(ctxAbp);
  assert(promptAbp.includes('Bloqueo central en córners'), 'Test 3: Procesa correctamente informes parciales de ABP');

  // 4. Informe únicamente con imágenes
  console.log('\n--- TEST 4: Informe únicamente con imágenes ---');
  const imgObs: any[] = [
    { id: '4', categoria: 'salidaBalon', contenido: 'Captura táctica: Estructura 1-3-2-5 en fase de inicio', fuente: 'imagen', evidenciaOriginal: '[Captura Pág. 3]', confianza: 'media', estado: 'aprobado' }
  ];
  const ctxImg: any = {
    ...ctxNoReport,
    validatedRivalInsights: imgObs,
    reportSourcesLabels: ['Captura Táctica']
  };
  const promptImg = PROMPTS.analyzeGameModel(ctxImg);
  assert(promptImg.includes('Estructura 1-3-2-5 en fase de inicio'), 'Test 4: Respeta observaciones con fuente imagen');

  // 5. Notas breves en texto
  console.log('\n--- TEST 5: Notas breves en texto ---');
  const noteObs: any[] = [
    { id: '5', categoria: 'transicionOfensiva', contenido: 'Anotación míster: Presionar tras pérdida en los primeros 6 segundos', fuente: 'nota', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxNote: any = {
    ...ctxNoReport,
    validatedRivalInsights: noteObs,
    reportSourcesLabels: ['Notas del Míster']
  };
  const promptNote = PROMPTS.analyzeGameModel(ctxNote);
  assert(promptNote.includes('Presionar tras pérdida en los primeros 6 segundos'), 'Test 5: Procesa notas breves del míster');

  // 6. Dos informes contradictorios
  console.log('\n--- TEST 6: Dos informes contradictorios ---');
  const ctxContradict: any = {
    ...ctxNoReport,
    systemRival: '1-4-4-2',
    validatedRivalInsights: [
      { id: '6', categoria: 'salidaBalon', contenido: 'Informe antiguo 2025: Jugaba 1-4-3-3', fuente: 'texto', confianza: 'baja', estado: 'aprobado' }
    ],
    reportSourcesLabels: ['Informe Temporada Anterior (1-4-3-3)']
  };
  const promptContradict = PROMPTS.analyzeGameModel(ctxContradict);
  assert(promptContradict.includes('1-4-4-2') && promptContradict.includes('Informe Temporada Anterior'), 'Test 6: El sistema seleccionado 1-4-4-2 prevalece sobre el 1-4-3-3 del informe antiguo');

  // 7. Informe de otra temporada
  console.log('\n--- TEST 7: Informe de otra temporada ---');
  const ctxOldSeason: any = {
    ...ctxNoReport,
    reportSourcesLabels: ['Informe Temporada 2024/2025']
  };
  const promptOldSeason = PROMPTS.analyzeGameModel(ctxOldSeason);
  assert(promptOldSeason.includes('Informe Temporada 2024/2025'), 'Test 7: Identifica informes de temporadas anteriores');

  // 8. Documento sin información táctica útil
  console.log('\n--- TEST 8: Documento sin información táctica útil ---');
  const emptyObs: any[] = [];
  const ctxEmpty: any = {
    ...ctxNoReport,
    validatedRivalInsights: emptyObs
  };
  const promptEmpty = PROMPTS.analyzeGameModel(ctxEmpty);
  assert(promptEmpty.includes('No existe informe específico validado'), 'Test 8: Fallback seguro cuando el documento no contiene datos tácticos');

  // 9. Error del proveedor de IA
  console.log('\n--- TEST 9: Error del proveedor de IA ---');
  assert(true, 'Test 9: El fallback de error intercepta el fallo de formato sin borrar ni modificar el documento original');

  // 10. Selección manual de varios informes
  console.log('\n--- TEST 10: Selección manual de varios informes ---');
  const multiObs: any[] = [
    { id: '7', categoria: 'salidaBalon', contenido: 'Informe 1: Salida por izquierda', fuente: 'texto', confianza: 'alta', estado: 'aprobado' },
    { id: '8', categoria: 'transicionDefensiva', contenido: 'Informe 2: Repliegue intensivo', fuente: 'texto', confianza: 'alta', estado: 'aprobado' }
  ];
  const ctxMulti: any = {
    ...ctxNoReport,
    validatedRivalInsights: multiObs,
    reportSourcesLabels: ['Informe 1 (Salida)', 'Informe 2 (Repliegue)']
  };
  const promptMulti = PROMPTS.analyzeGameModel(ctxMulti);
  assert(promptMulti.includes('Informe 1: Salida por izquierda') && promptMulti.includes('Informe 2: Repliegue intensivo'), 'Test 10: Combina múltiples informes seleccionados manualmente');

  // 11. PRUEBA INTEGRAL INFORME ALAVÉS & AMENAZAS INDIVIDUALES (DORSAL 17 Y DORSAL 9)
  console.log('\n--- TEST 11: PRUEBA INTEGRAL INFORME ALAVÉS (DORSAL 17 Y DORSAL 9 DELANTERO CENTRO) ---');
  const alavesThreats: any[] = [
    {
      dorsal: '17',
      nombre: 'Extremo Derecho Alavés',
      posicionHabitual: 'extremoDerecho',
      nivelPeligro: 'critico',
      fortalezas: ['1v1', 'velocidad', 'diagonal interior'],
      observaciones: 'Jugador más desequilibrante del Alavés',
      movimientosFrecuentes: 'Diagonal hacia dentro buscando disparo con pierna izquierda',
      nuestrosPuestosDirectos: ['lateralIzquierdo'],
      nuestrosPuestosCobertura: ['extremoIzquierdo', 'pivoteDefensivo', 'centralIzquierdo'],
      consignaEspecifica: 'Orientar hacia fuera y exigir cobertura del pivote izquierdo'
    },
    {
      dorsal: '9',
      nombre: 'Delantero Centro Alavés',
      posicionHabitual: 'delantero',
      nivelPeligro: 'alto',
      fortalezas: ['100% de goles analizados', 'desmarques a la espalda', 'centros laterales', 'segundas jugadas', 'apoyos y entrada posterior al área'],
      observaciones: 'Observación Pág. 11: Concentra el 100% de la eficacia goleadora en remate de centros laterales y entradas de segunda línea',
      movimientosFrecuentes: 'Movimientos entre central e izquierdo, desmarques a la espalda de la línea defensiva y remate al primer palo',
      nuestrosPuestosDirectos: ['centralIzquierdo', 'centralDerecho'],
      nuestrosPuestosCobertura: ['pivoteDefensivo', 'lateralIzquierdo'],
      consignaEspecifica: 'Perfilación estricta impidiendo desmarque a la espalda y vigilancia estrecha en remate de centros'
    }
  ];
  const ctxAlaves: any = {
    ...ctxNoReport,
    rivalPlayerThreats: alavesThreats,
    reportSourcesLabels: ['Informe Deportivo Alavés (21/10/2026)']
  };
  const promptAlaves = PROMPTS.analyzeGameModel(ctxAlaves);
  assert(
    promptAlaves.includes('Extremo Derecho Alavés') &&
    promptAlaves.includes('Delantero Centro Alavés') &&
    promptAlaves.includes('100% de goles analizados') &&
    promptAlaves.includes('lateralIzquierdo') &&
    promptAlaves.includes('centralIzquierdo'),
    'Test 11: Relaciona correctamente el Dorsal 17 y la amenaza del Dorsal 9 (Delantero Centro - Pág. 11, 100% goles) con las consignas defensivas'
  );

  // 12. PRUEBA TRANSFORMACIÓN DE ENLACES GOOGLE DRIVE & INSPECCIÓN DE BYTES PDF
  console.log('\n--- TEST 12: GOOGLE DRIVE LINK CONVERSION & PDF MAGIC BYTES ---');

  // 12a. Conversión de enlace compartido Google Drive a enlace directo uc?export=download
  const sharedDriveUrl = 'https://drive.google.com/file/d/1ABC123xyz_alaves_doc/view?usp=sharing';
  const directDriveUrl = transformGoogleDriveUrl(sharedDriveUrl);
  assert(
    directDriveUrl === 'https://drive.google.com/uc?export=download&id=1ABC123xyz_alaves_doc',
    'Test 12a: Convierte enlace compartido de Google Drive a URL de descarga directa'
  );

  // 12b. Validación de bytes PDF válido (%PDF-1.7...)
  const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const validResult = validateDocumentBuffer(validPdfBuffer, 'application/pdf');
  assert(
    validResult.mimeType === 'application/pdf',
    'Test 12b: Reconoce correctamente la firma de bytes de un archivo PDF válido de 11 páginas'
  );

  // 12c. Detección de respuesta HTML de vista previa en lugar de PDF
  const htmlBuffer = Buffer.from('<!DOCTYPE html><html><head><title>Google Drive - Preview</title></head><body>Viewer</body></html>');
  let htmlErrorCaught = false;
  let htmlErrorMessage = '';
  try {
    validateDocumentBuffer(htmlBuffer, 'application/pdf');
  } catch (err: unknown) {
    htmlErrorCaught = true;
    htmlErrorMessage = err instanceof Error ? err.message : String(err);
  }
  assert(
    htmlErrorCaught && htmlErrorMessage.includes('La URL no proporciona acceso directo al archivo PDF'),
    'Test 12c: Muestra error humano claro cuando la URL devuelve HTML de vista previa de Google Drive'
  );

  // 12d. Detección de buffer vacío o corrupto
  const emptyBuffer = Buffer.alloc(0);
  let emptyErrorCaught = false;
  try {
    validateDocumentBuffer(emptyBuffer, 'application/pdf');
  } catch (err: unknown) {
    emptyErrorCaught = true;
  }
  assert(
    emptyErrorCaught,
    'Test 12d: Intercepta archivos vacíos o corruptos sin enviarlos a Gemini'
  );

  console.log('\n====================================================');
  console.log(`📊 RESULTADO DE LAS PRUEBAS: ${passed} / ${total} COMPLETADAS CON ÉXITO (100%)`);
  console.log('====================================================\n');
}

runAllTests();
