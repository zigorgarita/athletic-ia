/**
 * MODELO DE JUEGO OFICIAL S.D. INDAUTXU JUVENIL A (DIVISIÓN DE HONOR 2026-27)
 * Formación Base: 1-4-2-3-1
 * 
 * Este archivo actúa como la ÚNICA FUENTE DE VERDAD ONTOLÓGICA (SSOT) del Modelo de Juego.
 * Alimenta tanto a la IA de Pizarra Táctica como a la IA de Scouting de Rivales.
 * 
 * Versión: V1.0 Ampliada (113 Preguntas Validadas por el Cuerpo Técnico)
 */

export interface GameModelRoleDefinition {
  posicion: string;
  nombre_rol: string;
  fase_ofensiva: string;
  fase_defensiva: string;
  consigna_clave: string;
  detalles_v1?: string[];
}

export interface GameModelPhaseDefinition {
  nombre_fase: string;
  premisas_fundamentales: string[];
  subprincipios: string[];
  desencadenantes_y_condiciones: string[];
  criterios_abandono?: string[];
  automatismos?: string[];
}

export interface GameModelStructure {
  identidad: {
    equipo: string;
    categoria: string;
    sistema_base: string;
    estilo_filosofico: string;
    principios_identidad: string[];
  };
  principio_transversal_base: {
    concepto: string;
    descripcion: string;
    funciones: string[];
    regla_oro: string;
  };
  fases: {
    inicio_salida: GameModelPhaseDefinition;
    progresion: GameModelPhaseDefinition;
    finalizacion: GameModelPhaseDefinition;
    presion_alta: GameModelPhaseDefinition;
    bloque_medio: GameModelPhaseDefinition;
    bloque_bajo: GameModelPhaseDefinition;
    transicion_perdida: GameModelPhaseDefinition;
    transicion_recuperacion: GameModelPhaseDefinition;
  };
  roles: Record<string, GameModelRoleDefinition>;
  catalogo_centros: Array<{ tipo: string; descripcion: string }>;
  adaptaciones_matchup: Record<string, { regla: string; tipo: 'DOCTRINA' | 'PENDIENTE' }>;
  escenarios_partido: Array<{ escenario: string; consigna: string }>;
  precedentes_entrenador: Array<{ situacion: string; decision_precedente: string }>;
  reglas_prioridad: string[];
}

/**
 * ============================================================================
 * SECCIÓN 1: DOCTRINA INVIOLABLE (AXIOMAS FIJOS DEL MODELO INDAUTXU)
 * Principios innegociables del club. No deben ser contradichos por la IA.
 * ============================================================================
 */
export const DOCTRINA_INVIOLABLE_INDAUTXU = {
  SISTEMA_BASE: '1-4-2-3-1',
  REGLA_BLOQUE_DEFENSIVO_MAX_METROS: 40,
  REGLA_DISTANCIA_ENTRE_LINEAS_METROS: '12-15m (referencia orientativa ~75% de situaciones)',
  
  // Principio Transversal: BASE
  PRINCIPIO_TRANSVERSAL_BASE: {
    CONCEPTO: 'Siempre debe existir un jugador en BASE por delante de los centrales',
    FUNCIONES: [
      'Equilibrio estructural permanente',
      'Circulación limpia y cambio de orientación fluido',
      'Protección inmediata ante pérdida de balón',
      'Vigilancia defensiva activa',
      'Soporte cercano y descarga de centrales'
    ],
    REGLA_ORO: 'Si un pivote se descuelga o llega al área rival, el otro pivote asume y mantiene obligatoriamente la posición de BASE.'
  },

  // Regla de los 6-8 segundos CONDICIONADA (Fórmula 3+2 a 4-5m)
  PRESION_TRAS_PERDIDA_VENTANA_SEGUNDOS: '6-8 segundos',
  PRESION_TRAS_PERDIDA_FORMULA: 'Primera intención hacia delante: 3 jugadores inmediatos + 2 cercanos a 4-5 metros',
  PRESION_TRAS_PERDIDA_CONDICIONES_OBLIGATORIAS: [
    'Existencia de cercanía real de efectivos al poseedor rival (fórmula 3+2 a 4-5m)',
    'Coberturas de soporte activo constituidas',
    'Protección estricta del carril interior',
    'Espalda y profundidad propia debidamente vigilada'
  ],
  PRESION_TRAS_PERDIDA_VETOS_EXPRESOS: [
    'PROHIBIDO apretar si la línea defensiva queda en inferioridad o a pares expuestos',
    'PROHIBIDO apretar si la propia pérdida desorganizó nuestras líneas'
  ],

  // Comportamientos espaciales en pérdida (Revalidados)
  DEFENSA_CAMPO_PROPIO: 'Obligar al rival a jugar por fuera (orientación hacia banda)',
  DEFENSA_CAMPO_CONTRARIO: 'Obligar al rival a jugar por dentro, lejos de nuestra portería',
  
  // Zonas Prohibidas de Pase en Inicio
  PROHIBICIONES_INICIO: [
    'PROHIBIDOS pases horizontales comprometidos en campo propio',
    'PROHIBIDOS pases interiores a compañeros encimados o marcados'
  ],

  // Sub-principios de Ataque Posicional
  ATAQUE_SUBPRINCIPIOS: [
    'Cuadrado de Superioridad (Centrales + Pivotes)',
    'Identificación y explotación del 3º Hombre (Superioridad numérica, socioafectiva y reconocimiento de Hombre Libre)',
    'Dividir (fijar rivales mediante conducción para liberar al compañero)',
    'Ante defensa zonal: Juntar y girar / Repetir y girar (acumular pases en zona de atracción antes del cambio)',
    'Gradiente de riesgo: Bajo en inicio -> Medio en progresión -> Alto en finalización'
  ]
};

/**
 * ============================================================================
 * SECCIÓN 2: COMPORTAMIENTOS CONTEXTUALES ADAPTATIVOS (VARIANTES AVALADAS)
 * ============================================================================
 */
export const COMPORTAMIENTOS_ADAPTATIVOS_INDAUTXU = {
  // Estructuras defensivas organizadas
  BLOQUE_MEDIO_1_4_1_3_2: {
    ESTRUCTURA: '1-4-1-3-2',
    REFERENCIA_ALTURA: 'Línea defensiva ~10 metros por delante del área grande',
    PRINCIPIO: 'Cerrar dentro -> orientar fuera -> activar sobre pase al lateral rival',
    SALTO_EXTREMO: 'Salta extremo del lado del balón; extremo contrario cierra interior; lateral rival opuesto queda libre; abortar salto si se llega tarde',
    COBERTURA_SALTO: 'Mediapunta o lateral según trayectoria interior o exterior'
  },
  
  BLOQUE_BAJO_1_4_4_2: {
    ESTRUCTURA: '1-4-4-2',
    PRINCIPIO: 'Defensa zonal; cambios de marca en banda (EXT-LAT) sin deformar la estructura; saltos de atrás hacia delante; centrales por delante del portero; pivotes en frontal protegiendo segundas jugadas'
  },

  // Criterios de Abandono
  CRITERIO_ABANDONO_PRESIÓN_ALTA: 'Abandonar si: no se llega al salto, 1ª línea superada, fatiga física o saltos tardíos -> Transición inmediata a Bloque Medio 1-4-1-3-2',
  CRITERIO_ABANDONO_PRESIÓN_PERDIDA: 'Si la presión tras pérdida es superada o no se dan las condiciones de acoso -> Abandono inmediato y repliegue a Bloque Medio 1-4-1-3-2 (máx 40m)',
  CRITERIO_ABANDONO_SALIDA_CORTO: 'Si se acumulan varios fallos en salida corta -> Abandonar temporalmente e iniciar Juego Directo hacia banda con estructura de disputa + prolongación + 2ª jugada',

  // Transición D->O (Tras Recuperación)
  TRANSICION_RECUPERACION_REGLAS: {
    AXIOMA_4V4: 'Un 4v4 se juega hacia delante si hay espacio o igualdad',
    ESTRUCTURA_INMEDIATA: '1ª mirada lejos/profundo + 1 apoyo de seguridad atrás + 1 apoyo para 3º hombre + resto rompe al espacio',
    SIN_VENTAJA: 'Pase de seguridad atrás (innegociable no perderlo) + carril contrario da amplitud + mantener 1 jugador en BASE'
  },

  // Falta táctica contextual
  FALTA_TACTICA_CONTEXTUAL: 'Recurso defensivo para interrumpir la progresión si el rival supera la primera oleada de acoso con facilidad y existe riesgo a la espalda, especialmente en campo contrario o ante rival con velocidad',

  // Aliases de compatibilidad retrospectiva
  DIBUJO_REPLIEGUE_ADAPTATIVO: 'Comportamiento en bloque compacto (ej. 4-4-1-1 o 4-4-2 según altura del MCO y repliegue de extremos), manteniendo siempre la identidad 1-4-2-3-1',
  CRITERIO_ABANDONO_PRESIÓN: 'Si la presión tras pérdida es superada o no se dan las condiciones de acoso, se abandona la persecución e inmediatamente se repliega a posiciones ordenadas en bloque compacto de máx. 40m',
  VENTAJAS_POTENCIALES_A_PROVOCAR: [
    'Superioridad potencial 4v3 en salida de balón',
    'Pase filtrado al 3º hombre a la espalda de la línea de medios rival',
    'Recuperación tras robo en zona de creación hacia carril contrario'
  ]
};

/**
 * ============================================================================
 * SECCIÓN 3: ONTOLOGÍA COMPLETA V1 AMPLIADA DEL S.D. INDAUTXU DH (1-4-2-3-1)
 * ============================================================================
 */
export const GAME_MODEL_INDAUTXU: GameModelStructure = {
  identidad: {
    equipo: 'S.D. Indautxu Juvenil A',
    categoria: 'División de Honor Nacional',
    sistema_base: '1-4-2-3-1',
    estilo_filosofico: 'Protagonistas con balón (iniciar para progresar rápido y verticalizar) y agresivos sin balón defendiendo hacia delante con presión alta intensa.',
    principios_identidad: [
      'Querer el balón y buscar verticalidad con criterio',
      'Defender siempre hacia delante y ganar duelos individuales/aéreos',
      'Línea defensiva: no asumir riesgos innecesarios en campo propio',
      'Llegar con mucha gente al área rival en finalización',
      'El Bloque Medio 1-4-1-3-2 es la adaptación natural cuando la presión alta deja de ser sostenible'
    ]
  },
  
  principio_transversal_base: {
    concepto: DOCTRINA_INVIOLABLE_INDAUTXU.PRINCIPIO_TRANSVERSAL_BASE.CONCEPTO,
    descripcion: 'Pilar innegociable de equilibrio defensivo y fluidez ofensiva presente en todas las fases.',
    funciones: DOCTRINA_INVIOLABLE_INDAUTXU.PRINCIPIO_TRANSVERSAL_BASE.FUNCIONES,
    regla_oro: DOCTRINA_INVIOLABLE_INDAUTXU.PRINCIPIO_TRANSVERSAL_BASE.REGLA_ORO
  },

  fases: {
    inicio_salida: {
      nombre_fase: 'Inicio y Salida de Balón',
      premisas_fundamentales: [
        'Mantener para progresar -> Progresar para finalizar',
        'Salida limpia mediante Cuadrado de Superioridad (Centrales + Doble Pivote)',
        'Laterales con mucha altura cuando la presión rival lo permita',
        'Prohibidos pases horizontales comprometidos y pases interiores a jugadores encimados'
      ],
      subprincipios: [
        'Contra 1 punta: Central conduce para fijar y liberar al hombre libre',
        'Contra 2 puntas: Salida de 3 mediante pivote incrustado entre centrales o lateralizado entre central y lateral',
        'Contra 3 puntas (1-4-3-3): Conducción de central para fijar + laterales altos fijando extremos rivales',
        'Si el portero tiene dudas o no encuentra solución clara -> Envío largo lateralizado'
      ],
      desencadenantes_y_condiciones: [
        'No jugar al primer movimiento de apoyo si hay opción de fijar y dividir',
        'Identificar el carril de atracción antes de cambiar de orientación'
      ],
      criterios_abandono: [
        'Si se acumulan fallos consecutivos en corto: ABANDONAR salida corta y activar juego directo lateralizado con estructura de disputa y segunda jugada'
      ],
      automatismos: [
        'Lateral entra por dentro -> Extremo desciende a banda arrastrando marca -> Lateral rompe al espacio libre (extremo y lateral jamás ocupan el mismo carril)'
      ]
    },

    progresion: {
      nombre_fase: 'Progresión y Creación',
      premisas_fundamentales: [
        'Identificación y explotación del 3º Hombre (Hombre Libre)',
        'Dividir mediante conducción para fijar rivales y liberar compañeros',
        'El jugador sin balón debe ofrecer línea de pase abierta y reocupar espacios',
        'Tras pasar el balón, volver a ofrecer apoyo de seguridad inmediato al receptor'
      ],
      subprincipios: [
        'Juntar y girar / Repetir y girar: Acumular pases en zona de atracción antes de acelerar al lado débil',
        'Acelerar cuando exista superioridad o espacio; mantener para crearla si no hay ventaja clara',
        'No jugar necesariamente al primer movimiento: utilizar arrastres de defensores para habilitar a un tercero',
        'Gradiente de riesgo permitido: aumenta conforme nos aproximamos a portería rival'
      ],
      desencadenantes_y_condiciones: [
        'Simultanear desmarques de apoyo y de ruptura en carriles interiores'
      ]
    },

    finalizacion: {
      nombre_fase: 'Finalización de Jugada',
      premisas_fundamentales: [
        'Llegar con mucha gente al área rival',
        'El Delantero (9) fija a ambos centrales y ataca el primer palo por delante del primer defensor',
        'Mediapunta (MCO) llega con potencia desde segunda línea en la frontal',
        'Extremo contrario cierra al segundo palo para remate o segunda acción',
        'Criterio de buena finalización: Balón entre los tres palos o forzar córner/reinicio'
      ],
      subprincipios: [
        'Centrar exclusivamente cuando existan rematadores posicionados en el área',
        'Pase atrás a la frontal si el área está saturada para reiniciar o disparar de cara',
        'Cambio de orientación si genera ventaja de 1v1 en banda débil',
        'Preferencia por encontrar pase interior si el receptor está perfilado para rematar'
      ],
      desencadenantes_y_condiciones: [
        'Pase tenso por delante de la línea defensiva o centro entre portero y centrales'
      ]
    },

    presion_alta: {
      nombre_fase: 'Fase Defensiva: Presión Alta',
      premisas_fundamentales: [
        'Referencias individuales y marcaje a pares en campo contrario',
        'En esta fase no es obligatorio conservar un central libre para coberturas',
        'Activador principal: Saque o reinicio del portero rival',
        'Defender hacia delante con agresividad en duelos aéreos y terrestres'
      ],
      subprincipios: [
        'Delantero Centro: Posicionado entre centrales (2m detrás), orienta la salida y tapa pase de retorno al portero',
        'Extremos: Entre central y lateral tapando ambas líneas de pase',
        'Mediapunta: 8m detrás del DC, encimando y tapando giro del pivote rival',
        'Pivotes: Emparejados con mediocentros rivales',
        'Laterales: Parten a distancia suficiente para llegar al lateral rival antes de su control cómodo',
        'Utilizar la línea de banda como trampa para encerrar la posesión rival'
      ],
      desencadenantes_y_condiciones: [
        'Reinicio del portero rival o pase comprometido a defensor de espaldas'
      ],
      criterios_abandono: [
        'ABANDONAR presión alta si: ya no llegamos a tiempo, 1ª línea superada, fatiga física o saltos tardíos -> Transición inmediata a Bloque Medio 1-4-1-3-2'
      ]
    },

    bloque_medio: {
      nombre_fase: 'Fase Defensiva: Bloque Medio (1-4-1-3-2)',
      premisas_fundamentales: [
        'Estructura compacta 1-4-1-3-2',
        'Línea defensiva situada a ~10 metros por delante del área grande',
        'Prioridad: Cerrar el carril interior y orientar la posesión rival hacia fuera',
        'Se permite la circulación horizontal entre centrales rivales en su tercio inicial',
        'Conservar un central propio libre para coberturas'
      ],
      subprincipios: [
        'Los dos puntas orientan hacia banda, protegen el pase interior y no deben ser superados por regate fácil',
        'Línea de 3 medios protege pasillos interiores',
        'ACTIVADOR DE PRESIÓN: Pase al lateral rival',
        'Al saltar el balón al lateral rival: Salta el Extremo de ese lado, el Extremo contrario cierra interior, el equipo bascula intensamente y se deja libre deliberadamente al lateral rival del lado opuesto',
        'Cobertura del salto: Mediapunta (si va hacia dentro) o Lateral propio (si va hacia fuera)',
        'Ante cambio de orientación rival: Bascular todo el bloque, reestructurar emparejamientos y dejar libre al nuevo lateral contrario'
      ],
      desencadenantes_y_condiciones: [
        'Pase al lateral rival activa el salto del extremo',
        'Pase a mediapuntas interiores rivales activa salto de central de atrás hacia delante'
      ],
      criterios_abandono: [
        'Si se llega tarde al lateral rival: ABORTAR EL SALTO para no desorganizar la línea'
      ]
    },

    bloque_bajo: {
      nombre_fase: 'Fase Defensiva: Bloque Bajo (1-4-4-2)',
      premisas_fundamentales: [
        'Estructura compacta 1-4-4-2 si el rival logra hundirnos',
        'Prioridad: Proteger zona central, área y portería',
        'Defensa predominantemente zonal: prohibido perseguir marcas hasta deformar la estructura',
        'Evitar hundimiento excesivo pegado al portero'
      ],
      subprincipios: [
        'Cambios de marca en banda: Extremo toma al rival que interioriza; Lateral toma al que ocupa banda exterior',
        'Saltos defensivos: Siempre de atrás hacia delante (salta el central de cara, los otros tres cierran)',
        'Defensa de centros: Centrales posicionados por delante del portero con contacto visual/corporal; Pivotes bajan protegiendo frontal y segundas jugadas',
        'Extremo opuesto ayuda en repliegue al lateral de su lado; Delantero bloquea pase de retorno',
        'Tras despeje o recuperación baja: Asegurar obligatoriamente el primer pase'
      ],
      desencadenantes_y_condiciones: [
        'Rival supera el bloque medio y progresa a tres cuartos de campo'
      ]
    },

    transicion_perdida: {
      nombre_fase: 'Transición Ataque-Defensa (Tras Pérdida)',
      premisas_fundamentales: [
        'Primera intención hacia delante: Presión intensa de 6-8 segundos condicionada (Fórmula 3+2 a 4-5m)',
        'En campo propio: Obligar al rival a jugar hacia fuera (orientación a banda)',
        'En campo contrario: Obligar al rival a jugar hacia dentro, lejos de nuestra portería'
      ],
      subprincipios: [
        'VETO: No apretar si la línea defensiva queda en inferioridad/pares o si la pérdida desorganizó nuestras líneas',
        'Presión superada (nos eliminan o cambian de lado): ABANDONAR persecución y replegar de inmediato a Bloque Medio 1-4-1-3-2 (máx 40m)',
        'Falta táctica: Recurso contextual si salen con facilidad o intuyen contragolpe peligroso'
      ],
      desencadenantes_y_condiciones: [
        'Pérdida inmediata de balón con 3 efectivos directos + 2 cercanos en radio de 4-5m'
      ],
      criterios_abandono: [
        'Presión eliminada o superación de la primera línea de acoso -> Repliegue a 1-4-1-3-2'
      ]
    },

    transicion_recuperacion: {
      nombre_fase: 'Transición Defensa-Ataque (Tras Recuperación)',
      premisas_fundamentales: [
        'Un 4v4 se juega: Si hay espacio a la espalda o igualdad hacia delante -> CONTRAATAQUE VERTICAL',
        'Primera mirada del recuperador: Hacia delante / lejos / profundo',
        'Distribución inmediata tras robo: 1 apoyo de seguridad atrás + 1 apoyo cercano para 3º hombre + resto rompe en profundidad'
      ],
      subprincipios: [
        'Robo en Finalización: Mirar directamente a portería y disparo rápido',
        'Robo en Creación: Buscar cambio rápido al carril contrario tras atraer en zona de robo',
        'Robo en Iniciación: Mirar lejos manteniendo el pase de seguridad',
        'Sin ventaja clara hacia delante: Pase de seguridad hacia atrás (INNEGOCIABLE no perderlo), carril contrario da amplitud y mantener obligatoriamente 1 jugador en BASE'
      ],
      desencadenantes_y_condiciones: [
        'Evaluación instantánea de superioridad/igualdad numérica en vertical tras el robo'
      ]
    }
  },

  roles: {
    POR: {
      posicion: 'POR',
      nombre_rol: 'Portero',
      fase_ofensiva: 'Valiente con los pies y fuera de portería. Jugar por dentro solo con máxima seguridad; ante duda envío largo lateralizado.',
      fase_defensiva: 'Liderar la línea defensiva, anticipar balones a la espalda, tapar su primer palo en tiros escorados y dominar el área.',
      consigna_clave: '¡Manda en el área, tapa tu palo y si dudas, juega largo a banda!',
      detalles_v1: [
        'Jugar dentro solo con máxima seguridad',
        'Ante duda balón largo preferentemente a una banda',
        'Comunicación constante con centrales',
        'Tapar su primer palo'
      ]
    },
    DFC: {
      posicion: 'DFC',
      nombre_rol: 'Centrales (DCI / DCD)',
      fase_ofensiva: 'Amplios en salida. Conducir para fijar y liberar. Mirar lejos en diagonal. Tras pasar, volver a ofrecer línea de apoyo.',
      fase_defensiva: 'Máxima seguridad interior. No jugar a marcados. Defender hacia delante, ganar duelos y mantener siempre un central libre para coberturas.',
      consigna_clave: '¡Conduce para fijar, no juegues a marcados y defiende hacia delante!',
      detalles_v1: [
        'Seguridad interior máxima',
        'No jugar a compañero marcado',
        'Mirar lejos en diagonal',
        'Volver a ofrecer línea de pase tras soltar',
        'Defender hacia delante y ganar duelos'
      ]
    },
    LAT: {
      posicion: 'LAT',
      nombre_rol: 'Laterales (LD / LI)',
      fase_ofensiva: 'Mucha altura para dar salida. Desdoblamientos y posibilidad de lateral interior. Coordinar carril con su extremo.',
      fase_defensiva: 'Duelo 1v1 firme. Salto agresivo al lateral rival si el balón viaja a su banda. Cubrir la espalda del central cuando este disputa.',
      consigna_clave: '¡Altos para dar salida, coordinad el carril y cubrid al central!',
      detalles_v1: [
        'Mucha altura ofensiva',
        'Coordinación de carril con extremo (no ocupar mismo pasillo)',
        'Posibilidad de lateral interior',
        'Defender hacia delante',
        'Cubrir a la espalda cuando el central disputa'
      ]
    },
    MCD: {
      posicion: 'MCD',
      nombre_rol: 'Pivotes (Contención y Creador)',
      fase_ofensiva: 'Juego a pocos toques. Orientación corporal hacia delante. Salida de 3 incrustado o lateralizado. Cambios de orientación.',
      fase_defensiva: 'Garantizar el principio de BASE permanente. Emparejar con mediocentros rivales. Ganar segundas jugadas y cerrar pasillo interior.',
      consigna_clave: '¡Pocos toques, mantened la BASE y orientaos hacia delante!',
      detalles_v1: [
        'Pocos toques',
        'Orientación corporal hacia delante',
        'Garantizar principio de BASE (si uno sube, el otro queda)',
        'Ganar segundas jugadas en frontal',
        'Salida de 3 y cambios de juego'
      ]
    },
    MCO: {
      posicion: 'MCO',
      nombre_rol: 'Mediapunta',
      fase_ofensiva: 'Jugar en los "cuadrados" (a la espalda de medios rivales, delante de centrales). Orientación para girar y llegada potente de segunda línea.',
      fase_defensiva: 'Posicionado 8m detrás del delantero. Tapar giro del pivote rival y dar soporte de cobertura interior al salto del extremo en bloque medio.',
      consigna_clave: '¡Recibe en los cuadrados, gira y llega al remate desde segunda línea!',
      detalles_v1: [
        'Jugar en los cuadrados entre líneas',
        'Orientación para girar y encarar',
        'Llegada potente de segunda línea al remate',
        'Tapar pivote rival en presión'
      ]
    },
    EXT: {
      posicion: 'EXT',
      nombre_rol: 'Extremos (ED / EI)',
      fase_ofensiva: 'Amplitud para fijar o interiorizar. Duelos 1v1 y centros tensos. Extremo contrario cierra al segundo palo en finalización.',
      fase_defensiva: 'Ubicarse entre central exterior y lateral rival. Salto al lateral en bloque medio. Ayuda defensiva obligatoria al lateral propio.',
      consigna_clave: '¡1v1 con valentía, ataca el segundo palo y ayuda a tu lateral!',
      detalles_v1: [
        'Duelos 1v1 y centros de calidad',
        'Ayudar defensivamente al lateral propio',
        'Valentía y agresividad cuando vamos a pares',
        'Cierre al segundo palo en centros'
      ]
    },
    DC: {
      posicion: 'DC',
      nombre_rol: 'Delantero Centro',
      fase_ofensiva: 'Fijar a ambos centrales jugando entre ellos. Descargas de cara como tercer hombre. Atacar el área por delante del primer defensor.',
      fase_defensiva: 'Posicionado entre los dos centrales (2m detrás), orientar la salida hacia una banda y tapar el pase de retorno al portero.',
      consigna_clave: '¡Fija a sus centrales, descarga de cara y remata por delante del primer defensa!',
      detalles_v1: [
        'Fijar a los dos centrales rivales',
        'Jugar de cara como 3º hombre',
        'Atacar el área por delante del primer defensor',
        'Orientar salida y tapar retorno en presión'
      ]
    }
  },

  catalogo_centros: [
    { tipo: 'Tenso entre portero y centrales', descripcion: 'Envío raso o a media altura en el pasillo de incertidumbre con atacantes entrando en carrera.' },
    { tipo: 'Tenso por delante del primer defensor', descripcion: 'Envío al primer palo atacado agresivamente por el delantero centro.' },
    { tipo: 'Pasado al segundo palo', descripcion: 'Envío alto buscando al extremo contrario para remate directo o pase atrás de segunda acción.' }
  ],

  adaptaciones_matchup: {
    'vs 1-4-4-2': { regla: 'Salida de 3 con pivote + provocar 2v1 exterior lateral/extremo.', tipo: 'DOCTRINA' },
    'vs 1-4-3-3': { regla: 'Mantener principios del modelo (cuadrado DFCs+MCDs vs su medio; sin cambios estructurales).', tipo: 'DOCTRINA' },
    'vs 1-3-4-3 / Línea de 3': { regla: 'Referencia defensiva en Bloque Medio 1-4-1-3-2 para emparejar y bascular.', tipo: 'DOCTRINA' },
    'vs Doble Pivote': { regla: 'Saltos defensivos prioritariamente de atrás hacia delante.', tipo: 'DOCTRINA' },
    'vs Juego Directo': { regla: 'Acumulación de efectivos en zona de caída + posibilidad de pivote más retrasado entre centrales.', tipo: 'DOCTRINA' },
    'vs Laterales Muy Altos': { regla: 'Sin doctrina cerrada oficial. Gemini debe aportar exclusivamente SUGERENCIA IA.', tipo: 'PENDIENTE' }
  },

  escenarios_partido: [
    { escenario: 'Ganando +1 en los últimos 15 min', consigna: 'No hundirse automáticamente; sostener Bloque Medio 1-4-1-3-2 activo.' },
    { escenario: 'Perdiendo +1 en los últimos 15 min', consigna: 'Posibilidad de dibujo 1-3-5-2 con acumulación de rematadores y centros continuos.' },
    { escenario: 'Expulsión propia (10 jugadores)', consigna: 'Reorganización inmediata en bloque compacto 1-4-4-1.' },
    { escenario: 'Expulsión rival (11 vs 10)', consigna: 'Condicionado al sistema rival; posibilidad de quedar con 3 defensores para sumar atacante.' },
    { escenario: 'Rival pasa a juego directo', consigna: 'Posicionamiento "a dos aguas" de pivotes y defensas para ganar caídas y segundas jugadas.' },
    { escenario: 'Dominio territorial rival / Asedio', consigna: 'Reorganización compacta en Bloque Bajo 1-4-4-2.' },
    { escenario: 'Fatiga física o presión inviable', consigna: 'Transición ordenada a Bloque Medio 1-4-1-3-2.' },
    { escenario: 'En desventaja en el marcador', consigna: 'Objetivo táctico: Llegar vivos al minuto 80 (máximo a 1 gol de distancia) antes del asalto final.' }
  ],

  precedentes_entrenador: [
    { situacion: 'Min 80, 1-0 arriba, rival acumula muchos atacantes', decision_precedente: 'Transición a Bloque Bajo 1-5-4-1 con línea de 5 para cerrar centros.' },
    { situacion: 'Min 65, 2-0 arriba, pérdidas interiores repetidas en salida', decision_precedente: 'Abandonar salida corta y pasar a juego directo hacia banda.' },
    { situacion: 'Min 30, empate, rival supera continuamente la presión alta', decision_precedente: 'Reorganizar en Bloque Medio 1-4-1-3-2 cerrando pasillos interiores.' },
    { situacion: 'Min 85, 0-1 abajo, rival con 5 defensas atrás', decision_precedente: 'Doble delantero centro + centros laterales continuos (un central puede subir de 2º punta).' }
  ],

  reglas_prioridad: [
    '1. Instrucciones introducidas directamente por el Entrenador (Prioridad 1 Absoluta)',
    '2. Modelo de Juego Oficial S.D. Indautxu DH (1-4-2-3-1 V1 Ampliado)',
    '3. Contexto Real del Partido (Pizarra, Sistema Rival, Once, Matchup)',
    '4. Scouting y Observaciones Validadas (Solo informes aprobados)',
    '5. Razonamiento y Conocimiento General de la IA (Solo complemento)'
  ]
};

/**
 * ============================================================================
 * SECCIÓN 4: COMPILADOR CENTRALIZADO DE LA DOCTRINA INDAUTXU
 * Genera la cadena canónica de texto que inyecta la doctrina completa en ambas IA.
 * ============================================================================
 */
export function compileGameModelDoctrina(): string {
  const m = GAME_MODEL_INDAUTXU;

  return `
=== MODELO DE JUEGO OFICIAL S.D. INDAUTXU JUVENIL A (DIVISIÓN DE HONOR) ===
SISTEMA BASE: ${m.identidad.sistema_base}
FILOSOFÍA: ${m.identidad.estilo_filosofico}

PRINCIPIOS DE IDENTIDAD:
${m.identidad.principios_identidad.map(p => `- ${p}`).join('\n')}

PRINCIPIO TRANSVERSAL INVIOLABLE: BASE
- Concepto: ${m.principio_transversal_base.concepto}
- Funciones: ${m.principio_transversal_base.funciones.join(', ')}
- Regla de Oro: ${m.principio_transversal_base.regla_oro}

1. FASE OFENSIVA: INICIO Y SALIDA DE BALÓN
- Premisas: ${m.fases.inicio_salida.premisas_fundamentales.join(' | ')}
- Subprincipios: ${m.fases.inicio_salida.subprincipios.join(' | ')}
- Automatismos: ${m.fases.inicio_salida.automatismos?.join(' | ') || 'N/A'}
- Criterio de Abandono: ${m.fases.inicio_salida.criterios_abandono?.join(' | ') || 'N/A'}

2. FASE OFENSIVA: PROGRESIÓN Y CREACIÓN
- Premisas: ${m.fases.progresion.premisas_fundamentales.join(' | ')}
- Subprincipios: ${m.fases.progresion.subprincipios.join(' | ')}

3. FASE OFENSIVA: FINALIZACIÓN DE JUGADA
- Premisas: ${m.fases.finalizacion.premisas_fundamentales.join(' | ')}
- Subprincipios: ${m.fases.finalizacion.subprincipios.join(' | ')}
- Tipos de Centros: ${m.catalogo_centros.map(c => `${c.tipo} (${c.descripcion})`).join('; ')}

4. FASE DEFENSIVA: PRESIÓN ALTA (CAMPO RIVAL)
- Premisas: ${m.fases.presion_alta.premisas_fundamentales.join(' | ')}
- Subprincipios: ${m.fases.presion_alta.subprincipios.join(' | ')}
- Criterio de Abandono: ${m.fases.presion_alta.criterios_abandono?.join(' | ') || 'N/A'}

5. FASE DEFENSIVA: BLOQUE MEDIO (1-4-1-3-2)
- Premisas: ${m.fases.bloque_medio.premisas_fundamentales.join(' | ')}
- Mecánica de Salto y Coberturas: ${m.fases.bloque_medio.subprincipios.join(' | ')}
- Criterio de Aborto: ${m.fases.bloque_medio.criterios_abandono?.join(' | ') || 'N/A'}

6. FASE DEFENSIVA: BLOQUE BAJO (1-4-4-2)
- Premisas: ${m.fases.bloque_bajo.premisas_fundamentales.join(' | ')}
- Subprincipios: ${m.fases.bloque_bajo.subprincipios.join(' | ')}

7. TRANSICIÓN ATAQUE-DEFENSA (TRAS PÉRDIDA)
- Premisas: ${m.fases.transicion_perdida.premisas_fundamentales.join(' | ')}
- Subprincipios y Vetos: ${m.fases.transicion_perdida.subprincipios.join(' | ')}
- Criterio de Abandono: ${m.fases.transicion_perdida.criterios_abandono?.join(' | ') || 'N/A'}

8. TRANSICIÓN DEFENSA-ATAQUE (TRAS RECUPERACIÓN)
- Premisas: ${m.fases.transicion_recuperacion.premisas_fundamentales.join(' | ')}
- Subprincipios por Zonas: ${m.fases.transicion_recuperacion.subprincipios.join(' | ')}

9. ROLES Y CONSIGNAS POR PUESTO:
${Object.values(m.roles).map(r => `[${r.posicion}] ${r.nombre_rol}: Ofensivo -> ${r.fase_ofensiva} | Defensivo -> ${r.fase_defensiva} | Consigna Clave -> "${r.consigna_clave}"`).join('\n')}

10. ADAPTACIONES FRENTE A SISTEMAS (MATCHUPS):
${Object.entries(m.adaptaciones_matchup).map(([k, v]) => `- ${k}: ${v.regla} [${v.tipo}]`).join('\n')}

11. ESCENARIOS COMPETITIVOS Y GESTIÓN DE PARTIDO:
${m.escenarios_partido.map(e => `- ${e.escenario} -> ${e.consigna}`).join('\n')}

12. PRECEDENTES TÁCTICOS DEL ENTRENADOR (REFERENCIAS CONTEXTUALES, NO LEYES RÍGIDAS):
${m.precedentes_entrenador.map(p => `- Situación: "${p.situacion}" -> Decisión de Aitor: "${p.decision_precedente}"`).join('\n')}
=================================================================
`.trim();
}
