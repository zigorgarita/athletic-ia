/**
 * MODELO DE JUEGO OFICIAL S.D. INDAUTXU JUVENIL A (DIVISIÓN DE HONOR 2026-27)
 * Formación Base: 1-4-2-3-1
 * 
 * Este archivo actúa como la ontología estructurada del Modelo de Juego.
 * Separa de manera estricta los axiomas de doctrina fija de las variantes contextuales.
 */

export interface GameModelRoleDefinition {
  posicion: string;
  nombre_rol: string;
  fase_ofensiva: string;
  fase_defensiva: string;
  consigna_clave: string;
}

export interface GameModelPhaseDefinition {
  nombre_fase: string;
  premisas_fundamentales: string[];
  subprincipios: string[];
  desencadenantes_y_condiciones: string[];
}

export interface GameModelStructure {
  identidad: {
    equipo: string;
    categoria: string;
    sistema_base: string;
    estilo_filosofico: string;
  };
  fases: {
    ataque_posicional: GameModelPhaseDefinition;
    transicion_perdida: GameModelPhaseDefinition;
    defensa_posicional: GameModelPhaseDefinition;
    transicion_recuperacion: GameModelPhaseDefinition;
  };
  roles: Record<string, GameModelRoleDefinition>;
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
  REGLA_DISTANCIA_ENTRE_LINEAS_METROS: '12-15m',
  
  // Regla de los 6-8 segundos CONDICIONADA
  PRESION_TRAS_PERDIDA_VENTANA_SEGUNDOS: '6-8 segundos',
  PRESION_TRAS_PERDIDA_CONDICIONES_OBLIGATORIAS: [
    'Existencia de cercanía de efectivos al poseedor rival',
    'Coberturas de soporte activo constituidas',
    'Protección estricta del carril interior',
    'Espalda/profundidad propia debidamente vigilada'
  ],

  // Comportamientos fijos en campo
  DEFENSA_CAMPO_PROPIO: 'Obligar al rival a jugar por fuera (orientación hacia banda)',
  DEFENSA_CAMPO_CONTRARIO: 'Obligar al rival a jugar por dentro, lejos de nuestra portería',
  
  // Sub-principios de Ataque Posicional
  ATAQUE_SUBPRINCIPIOS: [
    'Cuadrado de Superioridad (Centrales + Pivotes)',
    'Identificación y explotación del 3º Hombre (Superioridad numérica, socioafectiva y reconocimiento de Hombre Libre)',
    'Dividir (fijar rivales para liberar al compañero libre)',
    'Ante defensa zonal: Juntar y girar / Repetir y girar'
  ]
};

/**
 * ============================================================================
 * SECCIÓN 2: COMPORTAMIENTOS CONTEXTUALES ADAPTATIVOS (VARIANTES AVALADAS)
 * Comportamientos que varían según el rival, marcador o estado del juego.
 * No son estructuras rígidas, sino adaptaciones dinámicas de la base 1-4-2-3-1.
 * ============================================================================
 */
export const COMPORTAMIENTOS_ADAPTATIVOS_INDAUTXU = {
  // El dibujo 4-4-1-1 o 4-4-2 es un comportamiento adaptativo, NO la base
  DIBUJO_REPLIEGUE_ADAPTATIVO: 'Comportamiento en bloque compacto (ej. 4-4-1-1 o 4-4-2 según altura del MCO y repliegue de extremos), manteniendo siempre la identidad 1-4-2-3-1',
  
  // Abandono de presión tras pérdida si la presión es superada
  CRITERIO_ABANDONO_PRESIÓN: 'Si la presión tras pérdida es superada o no se dan las condiciones de acoso, se abandona la persecución e inmediatamente se repliega a posiciones ordenadas en bloque compacto de máx. 40m',

  // Recurso táctico contextual
  FALTA_TACTICA_CONTEXTUAL: 'Recurso defensivo para interrumpir la progresión si el rival supera la primera oleada de acoso con facilidad y existe riesgo a la espalda',

  // Ventajas teóricas potenciales (no garantizadas)
  VENTAJAS_POTENCIALES_A_PROVOCAR: [
    'Superioridad potencial 4v3 en salida de balón',
    'Pase filtrado al 3º hombre a la espalda de la línea de medios rival',
    'Recuperación tras robo en zona de creación hacia carril contrario'
  ]
};

/**
 * ESTRUCTURA COMPLETA DEL MODELO DE JUEGO INDAUTXU DH (1-4-2-3-1)
 */
export const GAME_MODEL_INDAUTXU: GameModelStructure = {
  identidad: {
    equipo: 'S.D. Indautxu Juvenil A',
    categoria: 'División de Honor Nacional',
    sistema_base: '1-4-2-3-1',
    estilo_filosofico: 'Protagonistas con balón (iniciar para progresar rápido) y agresivos sin balón con presión alta e intensa.'
  },
  fases: {
    ataque_posicional: {
      nombre_fase: 'Ataque Posicional',
      premisas_fundamentales: [
        'Mantener para progresar → Progresar para finalizar',
        'Cambios de orientación y ritmo',
        'Equilibrio defensivo y plan de acción mediante soporte cercano',
        'Vigilancias defensivas permanentes durante la posesión'
      ],
      subprincipios: [
        'Cuadrado de Superioridad (Centrales y Pivotes)',
        'Superioridad numérica a la espalda de la línea de mediocampo rival',
        '3º Hombre: Reconocer Hombre Libre (HL), presión de impares, dividir',
        'Dividir: Fijar rivales para liberar compañero; acumulación con relevo y descarga',
        'Ante defensa zonal: Juntar y girar, repetir y girar',
        'Simultanear desmarques de apoyo y ruptura'
      ],
      desencadenantes_y_condiciones: [
        'No jugar al primer movimiento',
        'Identificar cuál es el carril de atracción antes de buscar el cambio de ritmo'
      ]
    },
    transicion_perdida: {
      nombre_fase: 'Transición Ataque-Defensa (Tras Pérdida)',
      premisas_fundamentales: [
        'Acoso inmediato e intenso durante 6-8 segundos solo si se dan las condiciones',
        'En campo propio: Obligar al rival a jugar por fuera',
        'En campo contrario: Obligar al rival a jugar por dentro, lejos de nuestra portería'
      ],
      subprincipios: [
        'Si la presión es superada o no hay cercanía/coberturas: ABANDONAR persecución e iniciar repliegue inmediato',
        'Falta táctica como recurso contextual si salen de la presión con suma facilidad'
      ],
      desencadenantes_y_condiciones: [
        'Requisitos para presionar: cercanía de efectivos, coberturas activas, carril interior cerrado y profundidad protegida'
      ]
    },
    defensa_posicional: {
      nombre_fase: 'Defensa Posicional & Presión Alta',
      premisas_fundamentales: [
        'Agresivos en todo el juego aéreo y terrestre',
        'Equipo junto en un espacio máximo de 40 metros',
        '4 líneas claras con los pivotes colocados en diagonal',
        'Siempre un jugador libre para realizar coberturas'
      ],
      subprincipios: [
        'Pressing Alto en campo rival: Delantero entre los 2 DFCs (2m detrás); Extremos entre DFC y lateral tapando ambas líneas de pase; MCO 8m detrás del DC; Pivotes emparejados con sus mediocentros; DFCs fijando al punta y librando uno; Laterales listos para saltar a sus laterales',
        'Marcaje mixto y defensa mixta'
      ],
      desencadenantes_y_condiciones: [
        'Ajustes según rival: contra 1 punta (no suelto a su pivote, prioridad que no gire); contra 2 puntas (fijación de centrales); contra 3-5-2 (extremos ajustan a media altura)'
      ]
    },
    transicion_recuperacion: {
      nombre_fase: 'Transición Defensa-Ataque (Tras Recuperación)',
      premisas_fundamentales: [
        'Si hay superioridad o igualdad hacia adelante → CONTRAATAQUE',
        'Si hay inferioridad → MANTENER PARA PROGRESAR'
      ],
      subprincipios: [
        'Robo en Zona de Iniciación: Temporizar ataque según espacio o presión rival',
        'Robo en Zona de Creación: Buscar carril contrario tras acumulación previa en banda de robo. Apoyo para generar espacio a la espalda + desmarque de ruptura en carril interior',
        'Robo en Zona de Finalización: Ataque directo y finalización rápida'
      ],
      desencadenantes_y_condiciones: [
        'Evaluar inmediatamente la relación numérico-espacial hacia adelante tras el robo'
      ]
    }
  },
  roles: {
    POR: {
      posicion: 'POR',
      nombre_rol: 'Portero',
      fase_ofensiva: 'Valiente con los pies y fuera de portería. Primer generador de juego y mando directo.',
      fase_defensiva: 'Liderar la línea defensiva, anticipar balones a la espalda y dominar el área chica/grande.',
      consigna_clave: '¡Manda en el área y lee la espalda!'
    },
    DFC: {
      posicion: 'DFC',
      nombre_rol: 'Centrales',
      fase_ofensiva: 'Amplios en líneas dentro del área. Fijar y dividir para jugar lejos.',
      fase_defensiva: 'Fijar al delantero rival y garantizar que un central quede libre para coberturas.',
      consigna_clave: '¡Fija antes de pasar! ¡Un central libre para cobertura!'
    },
    LAT: {
      posicion: 'LAT',
      nombre_rol: 'Laterales (LD/LI)',
      fase_ofensiva: 'Altos y orientados para dar salida al portero/central. Ofensivos, con desdoblamientos.',
      fase_defensiva: 'Duelo 1v1 con sus extremos. Preparados para saltar a los laterales rivales.',
      consigna_clave: '¡Altos para dar salida y firmes en el 1v1!'
    },
    MCD: {
      posicion: 'MCD',
      nombre_rol: 'Pivotes / Medio Centro',
      fase_ofensiva: 'Diferentes alturas. Apoyo diagonal en salida entre centrales. Alternancia defensivo/ofensivo.',
      fase_defensiva: 'Emparejar con los mediocentros rivales. Cerrar pasillos interiores manteniendo la diagonal.',
      consigna_clave: '¡Diferentes alturas, cerrad el centro!'
    },
    MCO: {
      posicion: 'MCO',
      nombre_rol: 'Mediapunta',
      fase_ofensiva: 'Triángulo con pivotes. Juego a la espalda de la línea de medios rival. Venir para atraer.',
      fase_defensiva: 'Posicionado 8 metros detrás del delantero. Ajustar posición con él y tapar giro de su pivote.',
      consigna_clave: '¡Entre líneas, gira y conecta!'
    },
    EXT: {
      posicion: 'EXT',
      nombre_rol: 'Extremos (ED/EI)',
      fase_ofensiva: 'Amplios viniendo para atraer. Diferenciar cuándo jugar por dentro y cuándo por fuera.',
      fase_defensiva: 'Ubicarse entre el central exterior y el lateral rival tapando ambas líneas de pase.',
      consigna_clave: '¡Amplitud y ruptura al espacio!'
    },
    DC: {
      posicion: 'DC',
      nombre_rol: 'Delantero Centro',
      fase_ofensiva: 'Fijar a los centrales rivales. Venir para descargar por dentro o fuera e irse.',
      fase_defensiva: 'Entre los dos centrales rivales (2 metros detrás), orientando la salida hacia una banda.',
      consigna_clave: '¡Fija centrales y orienta la presión!'
    }
  },
  reglas_prioridad: [
    '1. Instrucciones introducidas por el Entrenador en la app',
    '2. Doctrina del Modelo de Juego Indautxu DH (1-4-2-3-1)',
    '3. Adaptación táctica al Matchup (Sistema propio vs Sistema rival)',
    '4. Conocimiento táctico genérico de la IA'
  ]
};
