-- ========================================================
-- SUBBLOQUE 4D — PRECARGA DE CONOCIMIENTO TÁCTICO (~45 entradas)
-- Script Idempotente: ON CONFLICT con titulo para evitar duplicados
-- ========================================================

-- Añadir constraint UNIQUE temporal para idempotencia del seed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_ke_titulo_temporada'
    ) THEN
        ALTER TABLE knowledge_entries ADD CONSTRAINT unique_ke_titulo_temporada UNIQUE (titulo, temporada);
    END IF;
END $$;

-- =============================================
-- BLOQUE A — SISTEMAS DE JUEGO (6 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Sistema 1-4-2-3-1: Doble pivote y mediapunta', 'Sistema de juego', 'Global', '1-4-2-3-1',
 'Equilibrio defensivo con doble pivote y desequilibrio ofensivo a través del mediapunta.',
 'El 1-4-2-3-1 organiza al equipo con cuatro defensas, dos mediocentros defensivos que protegen la línea de atrás, un mediapunta con libertad entre líneas, dos extremos que dan amplitud y un delantero centro como referencia. Es un sistema que permite controlar el centro del campo con superioridad numérica gracias al doble pivote, mientras que el mediapunta flotante genera incertidumbre en la defensa rival al moverse entre las líneas de volantes y defensas. Los extremos estiran la defensa rival por las bandas, creando espacios interiores para el mediapunta y permitiendo a los laterales incorporarse al ataque con apoyo escalonado. En fase defensiva, el equipo se repliega en un bloque compacto de 4-4-1-1, con el mediapunta cerrando líneas de pase centrales y los extremos replegando junto a los pivotes.',
 '{"porteria": "Participar en la salida de balón corta, ofrecer siempre una línea de pase de seguridad detrás de los centrales.", "defensa": "Los centrales construyen desde atrás, los laterales progresan por fuera. Línea coordinada en vigilancias defensivas.", "mediocampo": "El doble pivote protege, distribuye y sostiene. El mediapunta recibe entre líneas, gira y asiste.", "delantera": "El delantero fija a los centrales rivales. Los extremos buscan el 1 contra 1 y el desborde."}',
 ARRAY['Doble pivote: sostener y distribuir', 'Mediapunta: recibir, girar, asistir', 'Extremos: amplitud y desborde', 'Repliegue en 4-4-1-1'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Sistema 1-4-3-3: Posesión con pivote y dos interiores', 'Sistema de juego', 'Global', '1-4-3-3',
 'Dominio del balón a través de la posesión, con un pivote organizador y dos interiores que conectan el juego.',
 'El 1-4-3-3 es un sistema clásico de posesión que sitúa a un pivote defensivo como referencia en la construcción y dos interiores que se incorporan al ataque. Los tres delanteros (dos extremos y un delantero centro) estiran la defensa rival horizontal y verticalmente. La clave es la superioridad posicional en mediocampo: el triángulo de tres centrocampistas genera siempre líneas de pase disponibles. Los laterales suben alto para dar amplitud, mientras los interiores rotan con los extremos para generar superioridades en los carriles interiores. En defensa, se presiona alto con el tridente y se repliega en 4-5-1 cuando el rival supera la primera línea de presión.',
 '{"porteria": "Salida en corto por el pivote o en largo si hay presión alta. Participar como jugador de campo.", "defensa": "Centrales con balón, laterales altos. Reducir espacios con línea adelantada.", "mediocampo": "Pivote como ancla. Interiores se incorporan al ataque con timing. Rotaciones constantes.", "delantera": "Extremos fijan laterales rivales. Delantero centro ofrece desmarques de apoyo y ruptura."}',
 ARRAY['Pivote: ancla y distribución', 'Interiores: incorporaciones con timing', 'Tridente: fijar y estirar', 'Presión alta con tridente'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Sistema 1-4-4-2: Bloque compacto con dos líneas de cuatro', 'Sistema de juego', 'Global', '1-4-4-2',
 'Solidez defensiva con dos líneas de cuatro bien organizadas y ataque directo con pareja de delanteros.',
 'El 1-4-4-2 es el sistema defensivo por excelencia. Organiza al equipo en dos líneas compactas de cuatro que reducen los espacios entre líneas y dificultan la progresión rival. La distancia entre la línea defensiva y la de medios no debe superar los 12-15 metros. Los dos delanteros trabajan en pareja: uno fija y el otro se descuelga, generando juego directo y segundas jugadas. Los extremos en la línea de cuatro medios bajan a defender pero se proyectan rápido en transiciones. Es un sistema muy sólido en defensa organizada pero puede sufrir en posesión si el rival domina el centro del campo con superioridad numérica.',
 '{"porteria": "Comunicación constante con la línea. Salida en largo si hay presión.", "defensa": "Línea de cuatro compacta. Basculaciones rápidas. Distancia con medios: máximo 15m.", "mediocampo": "Cuatro en línea. Extremos bajan a defender. Centrocampistas cierran el centro.", "delantera": "Pareja: uno fija, otro se descuelga. Juego directo a espaldas de la defensa."}',
 ARRAY['Bloque compacto: 12-15m entre líneas', 'Pareja de delanteros: fijar y descolgar', 'Basculaciones rápidas', 'Solidez sobre posesión'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Sistema 1-3-5-2: Tres centrales y carrileros largos', 'Sistema de juego', 'Global', '1-3-5-2',
 'Ocupación densa del carril central con tres centrales que construyen y carrileros que dan amplitud.',
 'El 1-3-5-2 utiliza tres centrales para generar superioridad en la salida de balón frente a la presión rival. Los carrileros (laterales ofensivos) cubren toda la banda y son fundamentales tanto en ataque como en defensa. El doble pivote controla el centro del campo mientras el mediapunta conecta con la pareja de delanteros. Este sistema es muy efectivo contra rivales que defienden con un solo delantero centro, ya que genera superioridad 3 contra 1 en la salida. En fase defensiva, los carrileros bajan a formar una línea de cinco, creando un 5-3-2 muy sólido.',
 '{"porteria": "Salida en corto por los centrales. Orientar el juego hacia la banda con más espacio.", "defensa": "Tres centrales construyen. El central del centro lidera. Coberturas escalonadas.", "mediocampo": "Doble pivote protege. Carrileros toda la banda. Mediapunta entre líneas.", "delantera": "Pareja complementaria: uno al espacio, otro al apoyo. Ocupar zona de remate."}',
 ARRAY['3 centrales: superioridad en salida', 'Carrileros: toda la banda', 'Repliegue en 5-3-2', 'Mediapunta como enlace'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Sistema 1-5-3-2: Defensa de cinco y contragolpe', 'Sistema de juego', 'Global', '1-5-3-2',
 'Máxima seguridad defensiva con cinco atrás y salida rápida en transición con dos delanteros.',
 'El 1-5-3-2 prioriza la solidez defensiva con cinco defensores (tres centrales y dos laterales/carrileros). El mediocampo de tres controla los carriles centrales mientras los dos delanteros esperan para la transición. Es el sistema ideal cuando se juega contra un rival superior o se necesita proteger un resultado. La clave es la disciplina defensiva y la velocidad en las transiciones ofensivas: tras recuperar, el balón debe llegar rápido a los dos puntas. Los laterales solo se proyectan cuando el equipo tiene posesión establecida.',
 '{"porteria": "Dominio del área. Salidas rápidas en largo a los delanteros.", "defensa": "Cinco en línea: tres centrales + dos laterales. No conceder espacios.", "mediocampo": "Tres medios juntos. Cerrar carriles interiores. Recuperar y lanzar.", "delantera": "Dos puntas esperan la transición. Carreras al espacio. Segundas jugadas."}',
 ARRAY['Bloque bajo disciplinado', 'Transiciones rápidas', 'Laterales solo con posesión establecida', 'Proteger resultado'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Variantes y cambios de sistema durante el partido', 'Sistema de juego', 'Global', NULL,
 'Capacidad del equipo para cambiar de dibujo táctico sin detener el juego, adaptándose al contexto.',
 'Los equipos modernos necesitan manejar más de un sistema de juego y ser capaces de transitar entre ellos durante el partido según el contexto: marcador, superioridad/inferioridad numérica, minuto del partido, nivel de fatiga o estilo del rival. Por ejemplo, pasar de un 1-4-2-3-1 a un 1-3-5-2 con solo subir un lateral y adelantar un pivote. O cerrar un resultado pasando de 1-4-3-3 a 1-5-3-2 bajando un interior a la línea defensiva. El entrenador debe entrenar estos cambios como automatismos y establecer señales claras (verbales o gestuales) para activarlos durante el partido.',
 NULL,
 ARRAY['Flexibilidad táctica: no depender de un solo dibujo', 'Automatismos de cambio entrenados', 'Señales claras del staff', 'Adaptar al contexto del partido'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE B — MODELOS DE JUEGO (4 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Juego posicional: ocupación racional de espacios', 'Modelo de juego', 'Ataque organizado',
 'Ocupar el campo de forma racional para generar superioridades posicionales y líneas de pase.',
 'El juego posicional se basa en que cada jugador ocupe una posición específica en el campo para crear una estructura que facilite la circulación del balón. Los principios fundamentales son: amplitud (ocupar las bandas), profundidad (estirar verticalmente), escalonamiento (diferentes alturas) y ocupación de carriles interiores. No se trata de tocar por tocar, sino de mover al rival con el balón para encontrar la ventaja posicional. Cuando un jugador abandona su zona, otro debe cubrirla. El objetivo final es generar superioridad posicional: que nuestro receptor reciba libre de marca.',
 ARRAY['Amplitud + profundidad + escalonamiento', 'Mover al rival con el balón', 'Si sales de tu zona, alguien la cubre', 'Superioridad posicional: receptor libre'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Juego directo: verticalidad y profundidad', 'Modelo de juego', 'Ataque rápido / Contraataque',
 'Buscar la portería rival con el menor número de pases posible aprovechando espacios a la espalda.',
 'El juego directo prioriza la velocidad de llegada a zona de finalización. Tras recuperar el balón o en situaciones de salida, se buscan pases largos verticales a los delanteros o a los espacios a la espalda de la defensa rival. Es efectivo cuando se dispone de jugadores rápidos y cuando el rival presiona alto dejando espacios. No significa "pelotazo": el juego directo también puede ser un pase largo medido al espacio, una conducción vertical de un centrocampista o un cambio de orientación rápido para atacar la banda débil. La clave es la velocidad de decisión.',
 ARRAY['Verticalidad: pocos pases, mucha velocidad', 'Atacar espacios a la espalda', 'Velocidad de decisión', 'Segundas jugadas tras el pase largo'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Juego combinativo: asociaciones y tercer hombre', 'Modelo de juego', 'Ataque organizado',
 'Progresar mediante combinaciones cortas entre 2-3 jugadores, buscando siempre al tercer hombre libre.',
 'El juego combinativo se basa en asociaciones de pocos toques entre jugadores cercanos para superar líneas rivales. La clave es el concepto de tercer hombre: el jugador que recibe no es el destinatario final del balón, sino el enlace para que un tercer jugador reciba libre. Ejemplo: central pasa al pivote, el pivote conecta al interior que se desmarcó durante el pase. Este estilo requiere movilidad constante, ofrecimientos de apoyo y mucha comunicación. Es especialmente efectivo en espacios reducidos (entre líneas, zona de mediapunta) donde las paredes y los desdoblamientos crean superioridades.',
 ARRAY['Tercer hombre: yo paso, tú conectas, él recibe', 'Pocos toques en espacios reducidos', 'Movilidad constante y ofrecimientos', 'Paredes y desdoblamientos'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Modelo de juego Indautxu DH 2026-27: identidad del equipo', 'Modelo de juego', 'Global',
 'Equipo protagonista con balón, agresivo sin él, que compite con identidad y personalidad.',
 'El Indautxu DH 2026-27 aspira a ser un equipo protagonista que domine los partidos a través de la posesión con sentido. En fase ofensiva, buscamos salida de balón desde el portero, progresión por el carril central con el doble pivote y desequilibrio por bandas con extremos rápidos. El mediapunta es el jugador clave que conecta mediocampo con ataque. En fase defensiva, presionamos alto tras pérdida (5 segundos) y nos organizamos en bloque medio-alto cuando no podemos recuperar inmediatamente. En transiciones, priorizamos la velocidad: rápidos en recuperar posiciones defensivas y rápidos en llegar a portería rival cuando recuperamos. Los valores del equipo son intensidad, compromiso colectivo, competitividad y mentalidad ganadora.',
 ARRAY['Con balón: posesión con sentido', 'Sin balón: presión alta 5 segundos', 'Transiciones: velocidad siempre', 'Valores: intensidad, compromiso, competitividad'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE C — PRINCIPIOS OFENSIVOS (5 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Amplitud y profundidad en ataque organizado', 'Principio ofensivo', 'Ataque organizado',
 'Estirar al rival horizontal y verticalmente para crear espacios entre líneas.',
 'En ataque organizado, el equipo debe ocupar la mayor superficie de campo posible. La amplitud (ocupar las bandas con extremos y laterales proyectados) estira la defensa rival horizontalmente, creando espacios en los carriles interiores. La profundidad (delantero y mediapunta atacando la espalda de la defensa) estira verticalmente. La combinación de ambas genera los huecos que el equipo necesita para progresar. Es fundamental que los jugadores que dan amplitud no se queden estáticos: deben moverse para atraer rivales y liberar compañeros.',
 ARRAY['Extremos: pegar a la banda', 'Delantero: fijar la línea', 'Laterales: subir con escalonamiento', 'No ser estáticos: moverse para liberar'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Superioridades: numérica, posicional y cualitativa', 'Principio ofensivo', 'Ataque organizado',
 'Generar ventaja en cada zona del campo a través de diferentes tipos de superioridad.',
 'El fútbol moderno se basa en crear superioridades locales para progresar. Superioridad numérica: tener más jugadores que el rival en una zona (2v1 en banda con lateral + extremo). Superioridad posicional: estar mejor colocado que el rival (mediapunta libre entre líneas porque el pivote rival no sale a cubrirlo). Superioridad cualitativa: enfrentar a nuestro mejor jugador contra el más débil del rival (extremo rápido contra lateral lento). El equipo debe identificar qué tipo de superioridad puede crear en cada momento y explotarla.',
 ARRAY['Numérica: 2v1 en banda', 'Posicional: receptor libre entre líneas', 'Cualitativa: nuestro mejor contra su peor', 'Identificar y explotar la ventaja'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Tercer hombre y juego entre líneas', 'Principio ofensivo', 'Ataque organizado',
 'Progresar superando líneas rivales a través del concepto de tercer hombre.',
 'El tercer hombre es el jugador que se beneficia de una combinación entre otros dos. El pase no va al jugador más cercano como destino final, sino como enlace para que un tercero reciba libre. Esto permite superar líneas de presión rival que están pendientes del receptor directo. El juego entre líneas consiste en que los jugadores ofensivos se sitúen en los espacios entre la línea defensiva y la de medios del rival. Estos espacios son difíciles de defender porque obligan a los rivales a decidir si salen a cubrir (dejando espacio a la espalda) o se quedan (dejando al receptor libre).',
 ARRAY['Tercer hombre: pasa, conecta, recibe', 'Entre líneas: zonas de indecisión rival', 'Orientar el cuerpo para recibir de cara', 'Timing: llegar cuando llega el balón'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Finalización y remate: ocupación del área', 'Principio ofensivo', 'Ataque organizado',
 'Ocupar el área de penalti con 3-4 rematadores en zonas definidas para maximizar las opciones de gol.',
 'Todo el juego ofensivo debe culminar en la finalización. El área rival debe estar ocupada por al menos 3-4 jugadores cuando llega el centro o la asistencia: primer palo (carrera anticipada), zona central (remate frontal), segundo palo (llegada desde atrás) y rechace (jugador fuera del área para la segunda jugada). El delantero centro es el referente del remate, pero extremos e interiores deben incorporarse con timing. Es fundamental rematar a portería siempre que se tenga opción: el mejor regate en el área es el disparo.',
 ARRAY['3-4 rematadores en el área', 'Primer palo, centro, segundo palo, rechace', 'Rematar siempre que se pueda', 'El mejor regate en el área es el disparo'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Movilidad de la delantera: desmarques de apoyo y ruptura', 'Principio ofensivo', 'Ataque organizado',
 'Alternar desmarques de apoyo (venir al balón) y ruptura (ir al espacio) para desordenar la defensa rival.',
 'Un delantero estático es fácil de marcar. La clave es alternar constantemente entre desmarques de apoyo (venir a recibir de espaldas, descargar y pivotar) y desmarques de ruptura (carrera diagonal o vertical al espacio a la espalda del defensa). El apoyo fija al central rival y crea espacio para la ruptura. La ruptura obliga al central a retroceder y crea espacio para el apoyo. Los extremos también deben alternar: a veces buscar la banda (amplitud) y otras veces cortar hacia dentro (ataque al área). La movilidad genera incertidumbre defensiva.',
 ARRAY['Alternar apoyo y ruptura', 'Apoyo: venir al balón, descargar, pivotar', 'Ruptura: diagonal al espacio', 'Extremos: banda o corte interior'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE D — PRINCIPIOS DEFENSIVOS (5 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Repliegue intensivo: organización del bloque bajo', 'Principio defensivo', 'Defensa organizada',
 'Organizar al equipo por detrás del balón en un bloque compacto cuando no se puede presionar alto.',
 'Cuando el rival supera nuestra presión alta, el equipo debe replegar rápidamente para organizarse en un bloque bajo o medio. La distancia entre la primera y la última línea no debe superar los 25-30 metros. Los jugadores deben orientarse hacia el balón, mantener la comunicación constante y cerrar los carriles interiores como prioridad. Las bandas se defienden con basculación colectiva, no con jugadores aislados. El repliegue intensivo significa que TODOS corren: el delantero también repliega para cerrar la línea de medios.',
 ARRAY['Bloque compacto: 25-30m entre líneas', 'Todos repliegan, incluido el delantero', 'Cerrar carriles interiores primero', 'Basculación colectiva hacia el balón'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Basculación y cobertura defensiva', 'Principio defensivo', 'Defensa organizada',
 'Mover el bloque defensivo de forma coordinada hacia el lado del balón, manteniendo coberturas escalonadas.',
 'La basculación es el movimiento colectivo del equipo hacia el lado donde está el balón. Cuando el balón está en la banda derecha, todo el equipo se desplaza hacia ese lado, cerrando los espacios cercanos al balón y dejando la banda contraria (lado débil) como zona aceptable de riesgo. La cobertura significa que siempre hay un jugador detrás del compañero que presiona. Si el lateral sale a presionar al extremo rival, el central más cercano cubre su espalda. Si el pivote presiona, el otro pivote cierra el espacio. Nadie presiona solo.',
 ARRAY['Bascular hacia el balón como equipo', 'Lado débil: riesgo aceptable', 'Siempre cobertura detrás del que presiona', 'Nadie presiona solo'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Vigilancias defensivas: anticipar el contraataque rival', 'Principio defensivo', 'Defensa organizada',
 'Jugadores designados que mantienen posición defensiva mientras el equipo ataca para prevenir contraataques.',
 'Las vigilancias son las responsabilidades defensivas que ciertos jugadores mantienen incluso cuando el equipo ataca. Los dos centrales nunca suben más allá del medio campo. El pivote defensivo mantiene posición de equilibrio. Si un lateral sube, el central de ese lado cierra la zona. Las vigilancias se asignan antes del partido según las características del rival: si el rival tiene un extremo rápido por la derecha, nuestro lateral izquierdo debe ser especialmente vigilante. El concepto clave es que atacamos con jugadores, pero siempre dejamos jugadores de seguridad.',
 ARRAY['Centrales: nunca más allá del medio campo', 'Pivote: posición de equilibrio', 'Lateral sube → central cierra', 'Vigilancias según rival'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Línea defensiva: escalonamiento y distancias', 'Principio defensivo', 'Defensa organizada',
 'La línea defensiva debe mantener distancias óptimas, escalonamiento lateral y coordinación para defender los espacios.',
 'La línea de cuatro defensas debe funcionar como una unidad coordinada. La distancia entre centrales no debe superar los 10-12 metros. Los laterales se sitúan ligeramente por delante de los centrales (escalonamiento) para poder presionar lateralmente sin dejar espacio a la espalda. La línea sube y baja de forma coordinada: cuando el balón está lejos, la línea sube para reducir espacio entre líneas. Cuando el rival amenaza la espalda, la línea baja. El fuera de juego se usa de forma activa solo cuando hay comunicación clara entre centrales. El central del lado del balón manda la línea.',
 ARRAY['Centrales: máximo 10-12m de distancia', 'Laterales: escalonados por delante', 'Línea sube y baja coordinada', 'Central del lado del balón manda'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Duelo defensivo individual: 1 contra 1 y entrada', 'Principio defensivo', 'Defensa organizada',
 'Ganar el duelo individual sin cometer falta: temporizar, orientar y elegir el momento de la entrada.',
 'El duelo defensivo individual es la última línea antes del gol. El defensor debe temporizar (no tirarse al suelo a la primera), orientar al atacante hacia la banda o hacia su pierna débil, y esperar el momento justo para la entrada. La regla de oro es: si puedes ganar el balón limpio, entra; si no estás seguro, temporiza y espera ayuda. En el área propia, nunca entrar si no es 100% seguro: mejor cubrir el ángulo de tiro. Fuera del área, las faltas tácticas bien ejecutadas son una herramienta legítima cuando el rival lanza un contraataque peligroso.',
 ARRAY['Temporizar: no tirarse a la primera', 'Orientar hacia banda o pierna débil', 'En el área: cubrir ángulo, no entrar si no es seguro', 'Falta táctica legítima fuera del área'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE E — SALIDAS DE BALÓN (4 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Salida corta con portero incluido vs presión alta', 'Salida de balón', 'Ataque organizado',
 'Utilizar al portero como jugador de campo para generar superioridad numérica en la salida contra la presión rival.',
 'Cuando el rival presiona alto con 2-3 jugadores sobre nuestra línea defensiva, incluir al portero en la circulación genera una superioridad numérica que permite superar la primera línea de presión. El portero se coloca detrás de los centrales como vértice inferior del triángulo de salida. Los centrales se abren para ofrecer amplitud. El pivote baja entre los centrales o se ofrece como tercer hombre. La clave es la velocidad de circulación: si el balón se mueve rápido entre portero-central-pivote, la presión rival no llega a tiempo.',
 '{"porteria": "Colocarse detrás de los centrales. Pie firme, primer toque orientado. Si la presión cierra, lanzar en largo.", "defensa": "Centrales abiertos en las esquinas del área. Ofrecer líneas de pase limpias.", "mediocampo": "Pivote baja a recibir entre centrales o se ofrece como tercer hombre por encima.", "delantera": "Fijar la línea rival. No bajar a recibir: mantener profundidad."}',
 ARRAY['Portero como vértice de salida', 'Centrales abiertos en esquinas del área', 'Pivote: bajar o tercer hombre', 'Velocidad de circulación'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Salida en largo: pase al espacio y segunda jugada', 'Salida de balón', 'Ataque organizado',
 'Cuando la presión rival impide la salida corta, lanzar en largo buscando la segunda jugada.',
 'La salida en largo no es un recurso de emergencia sino una herramienta táctica planificada. El portero o el central identifican al delantero o extremo que está en mejor posición para ganar el duelo aéreo o controlar el balón largo. Simultáneamente, 2-3 jugadores se acercan a la zona de caída del balón para disputar la segunda jugada (rebote, desvío, balón dividido). El pivote sube su posición para cubrir la zona de rechace. Es fundamental que el pase largo sea dirigido (no aleatorio) y que los compañeros lean la trayectoria para llegar a la segunda jugada.',
 ARRAY['Pase largo dirigido, no aleatorio', 'Leer la trayectoria del balón', '2-3 jugadores a la segunda jugada', 'Pivote cubre zona de rechace'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, sistema_asociado, principio_clave, descripcion, consignas, creado_por)
VALUES
('Salida con doble pivote: triángulo de seguridad', 'Salida de balón', 'Ataque organizado', '1-4-2-3-1',
 'El doble pivote ofrece dos opciones de pase por el centro, creando un triángulo de construcción con los centrales.',
 'En sistemas con doble pivote (1-4-2-3-1), la salida de balón cuenta con una ventaja estructural: los dos pivotes se escalonan para ofrecer siempre una opción de pase limpia. El pivote más cercano al balón baja a recibir (primer hombre), mientras el otro se mantiene en posición más adelantada como segundo escalón. Junto con los centrales, forman un rombo de construcción que siempre genera al menos dos líneas de pase por el interior. Si el rival cierra el centro, los laterales se incorporan como válvula de escape por fuera.',
 ARRAY['Doble pivote escalonado', 'Uno baja, otro se queda', 'Rombo de construcción con centrales', 'Laterales: válvula de escape'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Salida por banda: lateral + interior como vía alternativa', 'Salida de balón', 'Ataque organizado',
 'Progresar por la banda combinando lateral e interior/extremo cuando el centro está cerrado.',
 'Cuando el rival cierra el centro con mucha densidad de jugadores, la salida por banda se convierte en la vía principal de progresión. El central pasa al lateral, que tiene al extremo por delante y al interior como opción interior. La combinación lateral-extremo crea un 2v1 contra el lateral rival. Si el rival bascula para cerrar la banda, se abre el cambio de orientación al lado débil. La clave es que la salida por banda no sea predecible: alternar con salida por el centro para mantener la incertidumbre.',
 ARRAY['Banda como alternativa al centro cerrado', '2v1 lateral-extremo', 'Si bascular, cambio de orientación', 'Alternar para no ser predecible'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE F — PRESIONES (4 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Presión alta tras pérdida: regla de los 5 segundos', 'Presión', 'Presión tras pérdida',
 'Tras perder el balón, los jugadores más cercanos presionan inmediatamente durante 5 segundos para recuperar.',
 'La presión tras pérdida (gegenpressing) es el mecanismo defensivo más efectivo porque se aplica cuando el rival está desorganizado. En los 5 segundos posteriores a la pérdida, los 3-4 jugadores más cercanos al balón presionan de forma intensa al poseedor y cierran las líneas de pase cercanas. El objetivo es recuperar el balón antes de que el rival pueda organizar su ataque. Si tras 5 segundos no se recupera, el equipo se repliega de forma ordenada. La clave es la intensidad: la presión a media velocidad no funciona. Debe ser agresiva y coordinada.',
 ARRAY['5 segundos de presión máxima', '3-4 jugadores más cercanos', 'Cerrar líneas de pase', 'Si no se recupera: replegar ordenadamente'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Pressing trap en banda: conducir y atrapar', 'Presión', 'Presión tras pérdida',
 'Dirigir al rival hacia la banda para atraparlo contra la línea lateral con presión coordinada.',
 'El pressing trap consiste en orientar la presión para conducir al rival hacia la banda, donde la línea de banda actúa como un defensor extra. El jugador que presiona no intenta robar directamente: su función es cortar la opción de pase al centro y obligar al rival a ir hacia la línea. Una vez que el rival está en la banda, 2-3 jugadores cierran el espacio simultáneamente. El lateral cierra por fuera, el extremo por detrás y el pivote cierra el pase interior. Es fundamental que los tres lleguen al mismo tiempo: si uno llega tarde, el rival encuentra la salida.',
 ARRAY['Dirigir al rival hacia la banda', 'Línea lateral = defensor extra', '3 jugadores cierran simultáneamente', 'Cortar el pase al centro siempre'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Presión media: bloque organizado de 4+4+2', 'Presión', 'Defensa organizada',
 'Organizar al equipo en bloque medio con dos líneas de cuatro más dos delanteros que cierran el centro.',
 'La presión en bloque medio se activa cuando el rival supera nuestra primera presión o cuando decidimos no presionar alto. El equipo se organiza con la línea defensiva en torno al centro del campo y la línea de medios 10-15 metros por delante. Los dos jugadores más adelantados (delantero + mediapunta o dos delanteros) cierran las opciones de pase centrales del rival y le obligan a jugar por las bandas. El objetivo no es robar inmediatamente sino contener, desgastar y esperar el error del rival para contraatacar.',
 ARRAY['Bloque medio: defensas en el centro del campo', 'Delanteros cierran el centro', 'Obligar al rival a jugar por bandas', 'Contener, desgastar, contraatacar'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Presión al portero rival: activadores y detonantes', 'Presión', 'Presión tras pérdida',
 'Cuándo y cómo presionar al portero rival cuando tiene el balón en los pies.',
 'La presión al portero rival se activa con detonantes específicos: pase atrás al portero, portero recibe con pie débil, portero mira al suelo, portero sin opciones de pase limpias. Cuando se activa el detonante, el delantero presiona en arco (cortando una opción de pase central) y el resto del equipo sube la línea 5-10 metros coordinadamente. Los extremos cierran las opciones de pase a los laterales rivales. Si el portero despeja en largo, el equipo está preparado para ganar la segunda jugada gracias a la posición adelantada. El riesgo es que el portero supere la presión con un pase largo preciso al espacio.',
 ARRAY['Detonantes: pase atrás, pie débil, sin opciones', 'Delantero presiona en arco', 'Equipo sube 5-10m coordinado', 'Extremos cierran a laterales rivales'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE G — TRANSICIONES (4 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Transición ofensiva: contraataque rápido en 3 pases', 'Transición ofensiva', 'Transición D→O',
 'Llegar a portería rival en máximo 3 pases tras recuperar, explotando los espacios antes de que el rival se reorganice.',
 'El contraataque se activa cuando el rival pierde el balón con jugadores adelantados. El jugador que recupera tiene 2-3 segundos para decidir: si hay espacio y compañeros en carrera, lanzar inmediatamente. El primer pase suele ser vertical al mediapunta o al extremo libre. El segundo pase es la asistencia. El tercer contacto es el remate. La clave es la velocidad de ejecución: cada segundo de demora permite al rival reorganizarse. Los jugadores que no participan directamente en el contraataque deben correr igualmente para ofrecer opciones y ocupar el área.',
 ARRAY['Decidir en 2-3 segundos', 'Máximo 3 pases hasta portería', 'Velocidad de ejecución', 'Todos corren: opciones y ocupación del área'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Transición ofensiva: posesión inmediata tras recuperación', 'Transición ofensiva', 'Transición D→O',
 'Tras recuperar, asegurar la posesión con un pase seguro antes de buscar progresión.',
 'No toda recuperación debe derivar en contraataque. Si el rival está bien posicionado defensivamente, es mejor asegurar la posesión con un pase corto seguro (generalmente al pivote o al central más cercano) y reorganizar el ataque. El jugador que recupera evalúa: ¿hay espacio para progresar rápido? Si sí, contraataque. ¿El rival está ordenado? Si sí, posesión. Esta decisión se toma en los primeros 2 segundos tras la recuperación. El equipo debe entrenar ambas opciones para que la transición sea siempre productiva.',
 ARRAY['Evaluar en 2 segundos: contraataque o posesión', 'Pase seguro al pivote o central', 'Reorganizar el ataque con paciencia', 'Entrenar ambas opciones'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Transición defensiva: repliegue rápido y reorganización', 'Transición defensiva', 'Transición O→D',
 'Tras perder el balón sin poder recuperar, replegar inmediatamente para organizarse detrás del balón.',
 'Si la presión tras pérdida no funciona en los primeros 5 segundos, el equipo debe replegar rápidamente. Los jugadores más adelantados corren hacia su propia portería, no hacia el balón. El objetivo es llegar antes que el rival a las zonas peligrosas. Durante el repliegue, los centrales lideran la organización gritando las posiciones. Los laterales cierran los carriles exteriores. Los pivotes se colocan por delante de la línea defensiva. En 10 segundos, el equipo debe estar organizado en bloque bajo o medio.',
 ARRAY['Si no recuperas en 5s: replegar inmediatamente', 'Correr hacia nuestra portería, no hacia el balón', '10 segundos para estar organizados', 'Centrales lideran la comunicación'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Transición defensiva: falta táctica y gestión del ritmo', 'Transición defensiva', 'Transición O→D',
 'Utilizar la falta táctica como herramienta legítima para frenar un contraataque peligroso del rival.',
 'Cuando el rival lanza un contraataque rápido y nuestro equipo no ha tenido tiempo de replegar, la falta táctica es un recurso legítimo y necesario. El jugador más cercano al poseedor rival comete una falta controlada (sin violencia, sin poner en riesgo al rival) para detener el contraataque. La falta debe ser clara para que el árbitro no saque ventaja. El mejor momento es cuando el rival todavía está en su propio campo o en el centro. Tras la falta, el equipo gana 15-20 segundos para organizarse. Es mejor una tarjeta amarilla que un gol en contra.',
 ARRAY['Falta controlada, sin violencia', 'En campo rival o centro del campo', 'Que sea clara: evitar ventaja', 'Mejor amarilla que gol en contra'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE H — ABP / ESTRATEGIA (4 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Córner ofensivo: variante bloqueador-arrastrador', 'ABP / Estrategia', 'ABP ofensiva',
 'Jugada ensayada con un bloqueador que fija al marcador y un arrastrador que crea el espacio para el rematador.',
 'En el córner ofensivo, se designan roles específicos: el bloqueador se coloca en la trayectoria del defensor que marca al rematador principal, impidiendo que llegue al balón sin contacto. El arrastrador realiza una carrera cruzada que arrastra a su marcador lejos de la zona de remate, creando el espacio. El rematador principal espera en zona de segundo palo y ataca el balón con carrera desde atrás (más difícil de marcar). El jugador de primer palo realiza un movimiento de despiste. El rechacista se queda fuera del área para la segunda jugada y para cubrir el posible contraataque rival.',
 ARRAY['Bloqueador: fijar al marcador del rematador', 'Arrastrador: carrera cruzada para crear espacio', 'Rematador: segundo palo, carrera desde atrás', 'Rechacista fuera del área'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Falta frontal: lanzamiento sobre barrera y segundo palo', 'ABP / Estrategia', 'ABP ofensiva',
 'Organización del lanzamiento de falta frontal con opciones de disparo directo y pase al área.',
 'En las faltas frontales (distancia 20-30m), se preparan dos opciones: disparo directo sobre/alrededor de la barrera, o pase al espacio para un compañero que llega desde segunda línea. Se colocan dos lanzadores junto al balón para crear incertidumbre. El primero puede disparar o tocar corto al segundo. El segundo puede disparar o centrar al área. En el área, 3 jugadores atacan: primer palo, centro y segundo palo. Un jugador se coloca al borde del área para el rechace. La elección depende de la distancia y de si la barrera salta o no.',
 ARRAY['Dos lanzadores: crear incertidumbre', '3 atacantes en el área: primer palo, centro, segundo palo', 'Rechacista al borde del área', 'Decisión según distancia y barrera'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Córner defensivo: defensa zonal con mixto en primer palo', 'ABP / Estrategia', 'ABP defensiva',
 'Defender córneres con zona pura en la mayoría del área y marca individual en primer palo.',
 'El sistema mixto combina las ventajas de la defensa zonal (cada jugador defiende un espacio, no un rival) con marca individual en la zona más peligrosa (primer palo). Se colocan 4-5 jugadores en zona cubriendo las áreas clave: primer palo, zona central cercana, zona central lejana, segundo palo y frontal del área. Uno o dos jugadores marcan individualmente a los rematadores más peligrosos del rival (normalmente centrales altos). El portero domina la zona de los 6 metros y sale a todo balón que pueda atrapar. Es fundamental no perder la posición para ir a buscar el balón: dejar que el balón venga a tu zona.',
 ARRAY['4-5 en zona + 1-2 marcas individuales', 'Portero manda en los 6 metros', 'No ir a buscar: dejar que venga a tu zona', 'Ganar la posición antes del centro'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Saque de banda largo: presión territorial en campo rival', 'ABP / Estrategia', 'ABP ofensiva',
 'Utilizar el saque de banda largo como herramienta de presión territorial cuando se tiene un lanzador potente.',
 'Si el equipo dispone de un jugador capaz de lanzar saques de banda largos (zona de córner o más allá), se puede utilizar como un arma ofensiva similar a un centro desde la banda. Se organizan los mismos movimientos que en un córner: bloqueador, arrastrador, rematador y rechacista. El lanzador apunta al segundo palo donde el rematador ataca desde atrás. La ventaja sobre el córner es que en un saque de banda no hay fuera de juego. Si no se dispone de lanzador largo, el saque de banda corto debe mantener la posesión y reorganizar el ataque.',
 ARRAY['Saque largo = centro desde la banda', 'Mismos roles que el córner', 'No hay fuera de juego', 'Si no hay lanzador largo: mantener posesión'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE I — ROLES POR POSICIÓN (6 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, instrucciones_linea, consignas, creado_por)
VALUES
('Rol del portero: juego con los pies y organización defensiva', 'Rol por posición', 'Global', 'POR',
 'El portero moderno participa en la construcción, organiza la defensa y domina el juego aéreo.',
 'El portero es el primer jugador de campo. En fase ofensiva, participa activamente en la salida de balón: recibe pases de los centrales, distribuye con ambos pies y lanza en largo cuando la presión lo exige. En fase defensiva, es la voz del equipo: organiza la línea, grita las coberturas, dirige los movimientos en los córneres y comunica constantemente con los centrales. Domina el juego aéreo dentro del área de 6 metros y sale a cortar centros cuando puede. En situaciones de 1 contra 1, reduce el ángulo de tiro acercándose al atacante sin tirarse prematuramente.',
 '{"porteria": "Juego con pies: primer toque orientado, distribución precisa. Salida en largo como alternativa. Dominar el área."}',
 ARRAY['Primer jugador de campo', 'Organizar con la voz', 'Pie firme, primer toque orientado', 'Reducir ángulo en 1v1'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, consignas, creado_por)
VALUES
('Rol del lateral: proyección ofensiva y repliegue', 'Rol por posición', 'Global', 'LD',
 'El lateral es el jugador que más metros recorre: sube para atacar y baja para defender en cada jugada.',
 'El lateral moderno tiene una doble responsabilidad. En fase ofensiva, se proyecta por la banda para dar amplitud, doblar al extremo y centrar al área. Puede incorporarse por dentro (inversión de laterales) cuando el extremo ocupa la banda. En fase defensiva, vuelve rápidamente a su posición en la línea de cuatro, cierra la banda y vigila al extremo rival. La comunicación con el central de su lado es fundamental: cuando el lateral sube, el central cierra su zona. La resistencia física y la velocidad son atributos imprescindibles. El lateral no puede permitirse llegar tarde al repliegue.',
 ARRAY['Subir para atacar, bajar para defender', 'Doblar al extremo: 2v1 en banda', 'Comunicación constante con el central', 'Nunca llegar tarde al repliegue'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, consignas, creado_por)
VALUES
('Rol del central: salida de balón y liderazgo defensivo', 'Rol por posición', 'Global', 'DFC',
 'El central defiende, construye y lidera. Es el jugador que más decisiones toma en cada jugada.',
 'El central es el líder de la línea defensiva. En fase defensiva, gana duelos aéreos, anticipa, temporiza y organiza la línea con la voz. En fase ofensiva, es el primer constructor: su primer pase (al pivote, al lateral o en largo al extremo) define la dirección del ataque. Un buen central lee el juego antes de recibir y sabe cuándo conducir para atraer rivales y liberar compañeros. Los dos centrales deben complementarse: uno más agresivo (sale a anticipar) y otro más posicional (cubre los espacios). La comunicación entre ellos es constante.',
 ARRAY['Líder defensivo con la voz', 'Primer pase: define la dirección del ataque', 'Complementarse: uno agresivo, otro posicional', 'Conducir para atraer y liberar'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, consignas, creado_por)
VALUES
('Rol del pivote/MCD: control del tempo y distribución', 'Rol por posición', 'Global', 'MCD',
 'El pivote es el director de orquesta: controla el ritmo, distribuye y protege la línea defensiva.',
 'El pivote defensivo (MCD) es el jugador más completo tácticamente. En posesión, recibe entre los centrales o por delante de ellos, gira, escanea las opciones y distribuye. Es el metrónomo: cuando el equipo necesita calma, retiene el balón; cuando necesita velocidad, acelera con pases verticales. Sin balón, es el primer protector de la línea defensiva: cierra los huecos que dejan los centrales, intercepta pases rivales entre líneas y cubre las subidas de los laterales. Su posicionamiento inteligente es más importante que su velocidad.',
 ARRAY['Metrónomo: calmar o acelerar según necesidad', 'Recibir, girar, escanear, distribuir', 'Proteger la línea defensiva', 'Posicionamiento inteligente sobre velocidad'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, consignas, creado_por)
VALUES
('Rol del mediapunta/MCO: asociación y asistencia', 'Rol por posición', 'Global', 'MCO',
 'El mediapunta es el jugador creativo que conecta mediocampo con ataque, recibiendo entre líneas y generando ocasiones.',
 'El mediapunta (MCO) es el jugador más libre del equipo: se mueve entre las líneas del rival buscando recibir en los espacios más peligrosos. Su función principal es recibir de espaldas, girar rápido y asistir a los compañeros de ataque. También puede finalizar cuando se incorpora al área. En fase defensiva, su trabajo es presionar al pivote rival y cerrar las líneas de pase centrales, sin bajar hasta la línea de medios salvo en repliegues extremos. El mediapunta debe moverse de forma asimétrica: no estar siempre en el centro, sino buscar los espacios donde el rival no le espera.',
 ARRAY['Recibir entre líneas, girar y asistir', 'Moverse de forma asimétrica', 'Presionar al pivote rival', 'Incorporarse al área para finalizar'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, posicion_asociada, principio_clave, descripcion, consignas, creado_por)
VALUES
('Rol del delantero centro: finalización y trabajo colectivo', 'Rol por posición', 'Global', 'DC',
 'El delantero centro es el referente del gol: finaliza, fija defensas, y genera espacios para los compañeros.',
 'El delantero centro tiene una doble función: ser el referente de gol y ser el primer defensor. En ataque, fija a los centrales rivales con su posición, ofrece desmarques de apoyo (bajar a recibir) y ruptura (ir al espacio a la espalda) y remata todo lo que llega al área. En defensa, es el primer presionador: su presión inteligente al central con balón orienta la salida rival hacia zonas menos peligrosas. El delantero moderno no solo vale por sus goles: su trabajo sin balón (presión, carreras para liberar) es igualmente importante.',
 ARRAY['Fijar centrales rivales', 'Alternar apoyo y ruptura', 'Rematar todo lo que llega', 'Presionar inteligentemente: orientar la salida rival'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- BLOQUE J — CONCEPTOS TÁCTICOS FUNDAMENTALES (6 entradas)
-- =============================================

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Fases del juego: ataque, defensa, transiciones y ABP', 'Principios generales', 'Global',
 'Todo lo que sucede en un partido se clasifica en 4 fases: ataque organizado, defensa organizada, transiciones y ABP.',
 'El fútbol se divide en cuatro grandes fases que se alternan constantemente durante el partido. Ataque organizado: cuando tenemos el balón y el rival está organizado defensivamente. Defensa organizada: cuando el rival tiene el balón y nosotros estamos organizados. Transición ofensiva (D→O): el momento de recuperar el balón. Transición defensiva (O→D): el momento de perderlo. Acciones a balón parado (ABP): córneres, faltas, penaltis, saques de banda. El entrenador debe trabajar las cuatro fases de forma equilibrada durante la semana.',
 ARRAY['4 fases: ataque, defensa, transiciones, ABP', 'Las transiciones son los momentos clave', 'Entrenar las 4 fases durante la semana', 'El que domina las transiciones domina el partido'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Estructura y ocupación racional del campo', 'Principios generales', 'Global',
 'El campo se divide en carriles y líneas que el equipo debe ocupar de forma racional para generar ventajas.',
 'El campo se divide en 5 carriles verticales (banda izquierda, interior izquierdo, central, interior derecho, banda derecha) y 3 zonas horizontales (zona defensiva, zona media, zona ofensiva). El equipo debe ocupar el máximo número de carriles posible para estirar la defensa rival. En el carril central siempre debe haber al menos un jugador como referencia. Los carriles interiores son los más peligrosos porque desde ahí se puede jugar hacia dentro o hacia fuera. El equipo debe evitar acumularse en una zona: la ocupación racional significa distribuirse equilibradamente.',
 ARRAY['5 carriles verticales + 3 zonas horizontales', 'Siempre referencia en el centro', 'Carriles interiores: los más peligrosos', 'Distribuirse: no acumularse'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Ritmo de juego: cuándo acelerar y cuándo pausar', 'Principios generales', 'Global',
 'El equipo inteligente sabe cuándo cambiar el ritmo: pausa para organizar, aceleración para desbordar.',
 'El ritmo de juego es una de las herramientas tácticas más sutiles pero más efectivas. Un equipo que siempre juega a la misma velocidad es predecible. La clave es alternar: momentos de pausa (circulación lateral, posesión segura, esperar a que los compañeros se posicionen) con momentos de aceleración (pase vertical, conducción rápida, cambio de orientación). El detonante de la aceleración suele ser un jugador que detecta un espacio o un rival mal colocado. El pivote es generalmente quien marca el ritmo: cuando retiene, el equipo pausa; cuando pasa vertical, el equipo acelera.',
 ARRAY['Alternar pausa y aceleración', 'Pausa: organizar, posicionar', 'Aceleración: detectar espacio, explotar', 'El pivote marca el ritmo'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Comunicación en el campo: lenguaje táctico del equipo', 'Principios generales', 'Global',
 'La comunicación constante entre jugadores es la base de la organización colectiva.',
 'Un equipo que no habla en el campo no puede estar organizado. La comunicación tiene varios niveles: verbal (gritar: ¡línea!, ¡fuera!, ¡mía!, ¡solo!, ¡hombre!), gestual (señalar con la mano la dirección del pase o el movimiento) y visual (contacto visual antes del pase). El portero y los centrales son los principales comunicadores porque ven todo el campo. El pivote comunica con el mediocampo. Los delanteros comunican la presión. El equipo debe desarrollar un lenguaje táctico propio con palabras clave que todos entiendan: por ejemplo, ¡trampa! para activar el pressing trap en banda.',
 ARRAY['Comunicación constante: verbal, gestual, visual', 'Portero y centrales: principales comunicadores', 'Lenguaje propio del equipo', 'Palabras clave: ¡trampa!, ¡línea!, ¡solo!'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Lectura del partido: adaptación según marcador y contexto', 'Principios generales', 'Global',
 'Los jugadores inteligentes adaptan su comportamiento al contexto: marcador, minuto, rival y estado físico.',
 'La lectura del partido es la capacidad de adaptar el comportamiento táctico al contexto cambiante. Ganando 1-0 en el minuto 80: priorizar posesión, no arriesgar, gestionar el ritmo. Perdiendo 0-1 en el minuto 70: subir la presión, incorporar laterales al ataque, asumir riesgos controlados. Empatados: evaluar si el empate es útil o no y actuar en consecuencia. Con un jugador más: dominar la posesión y cansar al rival. Con un jugador menos: compactar el bloque, jugar transiciones. El entrenador guía desde fuera, pero los jugadores deben desarrollar esta lectura individualmente.',
 ARRAY['Adaptar al marcador y minuto', 'Ganando: gestionar, no regalar', 'Perdiendo: asumir riesgos controlados', 'Jugadores deben leer por sí mismos'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

INSERT INTO knowledge_entries (titulo, categoria, fase_juego, principio_clave, descripcion, consignas, creado_por)
VALUES
('Mentalidad competitiva: intensidad, compromiso y concentración', 'Principios generales', 'Global',
 'La mentalidad competitiva es el factor diferencial: el equipo que compite más gana más partidos.',
 'La calidad técnica y táctica no sirven sin mentalidad competitiva. Los tres pilares son: Intensidad (cada acción al máximo nivel, cada sprint como si fuera el último, cada duelo como una final), Compromiso (con el equipo por encima del individuo, con el esfuerzo colectivo, con la disciplina táctica) y Concentración (durante los 90 minutos, en cada balón dividido, en cada acción defensiva). Los últimos 15 minutos de cada parte son los momentos clave: ahí se ganan y se pierden los partidos. El equipo que mantiene la concentración y la intensidad hasta el final tiene una ventaja competitiva enorme.',
 ARRAY['Intensidad: cada acción al máximo', 'Compromiso: equipo sobre individuo', 'Concentración: 90 minutos completos', 'Últimos 15 minutos: momento clave'],
 'Staff')
ON CONFLICT ON CONSTRAINT unique_ke_titulo_temporada DO NOTHING;

-- =============================================
-- INSERTAR TAGS para todas las entradas
-- =============================================

-- Tags para Bloque A (Sistemas)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('sistema'), ('formación'), ('base-táctica')) AS t(tag)
WHERE ke.categoria = 'Sistema de juego' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque B (Modelos)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('modelo-juego'), ('identidad'), ('filosofía')) AS t(tag)
WHERE ke.categoria = 'Modelo de juego' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque C (Principios ofensivos)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('ataque'), ('ofensivo'), ('posesión')) AS t(tag)
WHERE ke.categoria = 'Principio ofensivo' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque D (Principios defensivos)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('defensa'), ('defensivo'), ('organización')) AS t(tag)
WHERE ke.categoria = 'Principio defensivo' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque E (Salidas de balón)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('salida-balón'), ('construcción'), ('portero')) AS t(tag)
WHERE ke.categoria = 'Salida de balón' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque F (Presiones)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('presión'), ('pressing'), ('recuperación')) AS t(tag)
WHERE ke.categoria = 'Presión' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque G (Transiciones)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('transición'), ('velocidad'), ('cambio-fase')) AS t(tag)
WHERE ke.categoria IN ('Transición ofensiva', 'Transición defensiva') AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque H (ABP)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('abp'), ('estrategia'), ('jugada-ensayada')) AS t(tag)
WHERE ke.categoria = 'ABP / Estrategia' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque I (Roles)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('rol'), ('posición'), ('funciones')) AS t(tag)
WHERE ke.categoria = 'Rol por posición' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;

-- Tags para Bloque J (Conceptos generales)
INSERT INTO knowledge_tags (knowledge_entry_id, tag)
SELECT ke.id, t.tag
FROM knowledge_entries ke
CROSS JOIN (VALUES ('concepto'), ('fundamento'), ('base')) AS t(tag)
WHERE ke.categoria = 'Principios generales' AND ke.temporada = '2026-27'
ON CONFLICT ON CONSTRAINT unique_entry_tag DO NOTHING;
