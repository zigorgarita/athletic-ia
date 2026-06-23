'use client';

import React, { useState } from 'react';
import { BookOpen, Printer, ArrowRight, ShieldAlert, Award, FileText, Heart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CAPITULOS = [
  { id: 'filosofia', title: 'Filosofía CT', icon: Heart },
  { id: 'flujo-semanal', title: 'Flujo Semanal', icon: Activity },
  { id: 'incidencias', title: 'Procedimiento Incidencias', icon: ShieldAlert },
  { id: 'nombres', title: 'Convención de Nombres', icon: FileText },
  { id: 'cap1', title: 'Cap 1: Introducción', icon: BookOpen },
  { id: 'cap2', title: 'Cap 2: Acceso y Navegación', icon: ArrowRight },
  { id: 'cap3', title: 'Cap 3: Plantilla de Jugadores', icon: ArrowRight },
  { id: 'cap4', title: 'Cap 4: Gestión de Lesiones', icon: ArrowRight },
  { id: 'cap5', title: 'Cap 5: Planificación de Sesiones', icon: ArrowRight },
  { id: 'cap6', title: 'Cap 6: Registro de Asistencia', icon: ArrowRight },
  { id: 'cap7', title: 'Cap 7: Valoración de Entrenamientos', icon: ArrowRight },
  { id: 'cap8', title: 'Cap 8: Estrategia ABP', icon: ArrowRight },
  { id: 'cap10', title: 'Cap 10: Buenas Prácticas', icon: Award },
  { id: 'cap11', title: 'Cap 11: Mantenimiento (Admin)', icon: Award }
];

export default function GuiaPage() {
  const [activeSection, setActiveSection] = useState('filosofia');

  return (
    <div className="space-y-6 select-none print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-4 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#CC0E21]" />
            GUÍA INDAUTXU DH
          </h1>
          <p className="text-slate-400 text-sm">
            Manual práctico de uso diario y flujo de trabajo para el cuerpo técnico (2026-27).
          </p>
        </div>

        <Button 
          onClick={() => window.print()} 
          className="flex items-center gap-1.5 self-start lg:self-auto"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {/* Split Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Nav chapters */}
        <aside className="w-full md:w-64 shrink-0 space-y-1 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl print:hidden">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2 px-2">Índice del Manual</span>
          <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
            {CAPITULOS.map(cap => {
              const Icon = cap.icon;
              const isActive = activeSection === cap.id;
              return (
                <button
                  key={cap.id}
                  onClick={() => setActiveSection(cap.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-[#CC0E21]/15 text-[#CC0E21] border border-[#CC0E21]/20'
                      : 'text-slate-450 hover:text-white hover:bg-slate-800/20'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cap.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Viewer */}
        <article className="flex-1 w-full bg-slate-900/10 border border-slate-800/50 rounded-2xl p-6 md:p-8 space-y-6 overflow-y-auto max-h-[75vh] print:max-h-none print:border-none print:p-0 print:bg-white">
          
          {/* SECTION: Filosofía */}
          {activeSection === 'filosofia' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">FILOSOFÍA DE TRABAJO DEL CUERPO TÉCNICO</h2>
              <div className="p-4 bg-[#CC0E21]/10 border border-[#CC0E21]/30 rounded-xl">
                <span className="text-xs font-bold text-slate-200 block mb-1">¡IMPORTANTE!</span>
                <p className="text-xs text-slate-350 leading-relaxed">
                  <strong>La aplicación no sustituye al entrenador.</strong> La tecnología es una herramienta de soporte; el ojo humano, el liderazgo y la intuición del cuerpo técnico siguen siendo el motor principal del equipo.
                </p>
              </div>
              <p className="text-xs text-slate-350 leading-relaxed">Su función principal es:</p>
              <ul className="list-decimal pl-5 text-xs text-slate-350 space-y-2">
                <li><strong>Centralizar información:</strong> Que ningún dato de rendimiento, físico o táctico se quede en hojas sueltas o chats de WhatsApp.</li>
                <li><strong>Evitar pérdida de datos:</strong> Preservar el histórico de toda la temporada del Juvenil A, asegurando la consistencia incluso si hay cambios en la plantilla.</li>
                <li><strong>Facilitar la comunicación interna:</strong> Que el preparador físico, el analista, el segundo y el primer entrenador visualicen la misma información en tiempo real.</li>
                <li><strong>Mantener histórico:</strong> Poder analizar la evolución física, asistencias y rendimiento a lo largo de las semanas.</li>
                <li><strong>Ayudar en la toma de decisiones:</strong> Seleccionar el plan de partido y alineaciones basándose en estadísticas objetivas (asistencias, valoraciones diarias, fatiga acumulada).</li>
                <li><strong>Ahorrar tiempo:</strong> Agilizar los procesos rutinarios de gestión para que el cuerpo técnico pueda enfocarse en el césped.</li>
              </ul>
            </div>
          )}

          {/* SECTION: Flujo Semanal */}
          {activeSection === 'flujo-semanal' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">FLUJO SEMANAL DEL CUERPO TÉCNICO</h2>
              <p className="text-xs text-slate-355">
                El uso de la aplicación sigue una rutina diaria sincronizada con el microciclo del Juvenil A:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Lunes: Post-Partido / Recuperación</span>
                  <p className="text-[11px] text-slate-400 mt-1">Registrar la carga regenerativa de sesión, subir el PDF y rellenar los minutos reales jugados en la ficha del encuentro.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Martes: Adquisición Física (Carga Alta)</span>
                  <p className="text-[11px] text-slate-400 mt-1">Programar entrenamiento condicional, pasar lista de asistencia y calificar actitud/intensidad física de los jugadores.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Miércoles: Descanso / Análisis</span>
                  <p className="text-[11px] text-slate-400 mt-1">Sin sesión de campo. El analista sube la URL del vídeo táctico y los informes correspondientes del próximo rival.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Jueves: Adquisición Táctica (Carga Media-Alta)</span>
                  <p className="text-[11px] text-slate-400 mt-1">Programar entrenamiento sobre el modelo de juego. Calificar comprensión táctica y ejecución técnica de los ejercicios.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Viernes: Activación / ABP (Carga Baja)</span>
                  <p className="text-[11px] text-slate-400 mt-1">Sesión pre-partido. Se confirma la convocatoria en la app y el segundo entrenador ajusta la asignación de roles en las jugadas de ABP.</p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-xs font-black text-slate-200 block">Sábado o Domingo: Partido Oficial</span>
                  <p className="text-[11px] text-slate-400 mt-1">El fisioterapeuta registra inmediatamente cualquier incidencia física o lesión en el vestuario.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Procedimiento Incidencias */}
          {activeSection === 'incidencias' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">PROCEDIMIENTO ANTE INCIDENCIAS</h2>
              <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-xl">
                <span className="text-xs font-bold text-amber-400 block mb-1">¡ADVERTENCIA!</span>
                <p className="text-xs text-slate-300">
                  Ante cualquier anomalía, fallo de carga, error de guardado o comportamiento inesperado, se debe seguir estrictamente este protocolo para proteger la base de datos de producción.
                </p>
              </div>
              <ul className="list-decimal pl-5 text-xs text-slate-350 space-y-3">
                <li><strong>NO BORRAR DATOS:</strong> No intentes solucionar el problema borrando registros históricos, jugadores o entrenamientos anteriores de forma improvisada, ya que esto podría causar errores en cascada.</li>
                <li><strong>HACER CAPTURA DE PANTALLA:</strong> Toma una captura de pantalla completa donde se visualice el mensaje de error, la barra de direcciones URL y si es posible, la consola del navegador (F12).</li>
                <li><strong>AVISAR AL ADMINISTRADOR:</strong> Envía la captura de pantalla con una descripción a <strong>Zigor Garitagoitia</strong>.</li>
                <li><strong>REGISTRO DE INCIDENCIAS:</strong> El administrador centralizará los reportes y se encargará de reportar el problema al equipo técnico para su resolución.</li>
              </ul>
            </div>
          )}

          {/* SECTION: Nombres */}
          {activeSection === 'nombres' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CONVENCIÓN DE NOMBRES</h2>
              <p className="text-xs text-slate-350">
                Para garantizar que el buscador, los filtros y los históricos funcionen con precisión, todos los miembros del cuerpo técnico deben aplicar las siguientes convenciones de texto:
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="font-bold text-slate-200">1. Sesiones de Entrenamiento (Planificación)</span>
                  <div className="text-[10px] text-slate-400 mt-1">Formato: [AAAA-MM-DD] [Tipo_Sesion] - [Objetivo_Principal]</div>
                  <div className="text-[10px] text-[#CC0E21] font-semibold">Ej: 2026-10-15 Adquisición - Presión Alta</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="font-bold text-slate-200">2. Jugadas ABP (Estrategia)</span>
                  <div className="text-[10px] text-slate-400 mt-1">Formato: [Tipo_ABP] - [Nombre_Clave] - [Variante/Detalle]</div>
                  <div className="text-[10px] text-[#CC0E21] font-semibold">Ej: Córner Ofensivo - 2 Manos Arriba - Bloqueo Primer Palo</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="font-bold text-slate-200">3. Planes de Partido (Pizarra Táctica)</span>
                  <div className="text-[10px] text-slate-400 mt-1">Formato: [Jornada_XX] vs [Rival] - [Esquema_Inicial]</div>
                  <div className="text-[10px] text-[#CC0E21] font-semibold">Ej: Jornada 08 vs Danok Bat - Sistema 1-4-3-3</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="font-bold text-slate-200">4. Informes (Descargas y Documentos)</span>
                  <div className="text-[10px] text-slate-400 mt-1">Formato: [Mesociclo/Mes] - [Tipo_Informe] - [Detalle]</div>
                  <div className="text-[10px] text-[#CC0E21] font-semibold">Ej: Octubre - Informe Rendimiento - Cargas GPS</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 1 */}
          {activeSection === 'cap1' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 1: INTRODUCCIÓN</h2>
              <span className="text-xs font-bold text-slate-300 block">Qué es la aplicación</span>
              <p className="text-xs text-slate-350 leading-relaxed">
                Es la plataforma web interna de gestión y análisis de rendimiento deportivo diseñada específicamente para el cuerpo técnico del Juvenil A de División de Honor de la S.D. Indautxu (Temporada 2026-27).
              </p>
              <span className="text-xs font-bold text-slate-300 block">Qué información centraliza</span>
              <ul className="list-disc pl-5 text-xs text-slate-350 space-y-1">
                <li>Listado oficial de plantilla y fichas deportivas detalladas.</li>
                <li>Historial de lesiones y altas médicas gestionadas por el área de preparación/fisioterapia.</li>
                <li>Planificación de sesiones de entrenamiento, cargas e instrucciones tácticas.</li>
                <li>Control de asistencia diaria (pase de lista y justificaciones).</li>
                <li>Calificación diaria de rendimiento de los jugadores en 6 aptitudes clave.</li>
                <li>Pizarra táctica interactiva para alineaciones y sistemas de juego.</li>
                <li>Diseño y asignación de jugadas a balón parado (ABP).</li>
              </ul>
            </div>
          )}

          {/* SECTION: Cap 2 */}
          {activeSection === 'cap2' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 2: ACCESO Y NAVEGACIÓN</h2>
              <span className="text-xs font-bold text-slate-300 block">Acceso y Estructura</span>
              <p className="text-xs text-slate-350 leading-relaxed">
                * <strong>URL de Acceso:</strong> <code>https://athletic-ia.vercel.app</code>
                <br />
                * <strong>Menú Lateral / Inferior:</strong> Organiza las secciones principales de la app de forma responsiva (móviles y escritorio).
              </p>
              <span className="text-xs font-bold text-slate-300 block">Módulos Disponibles</span>
              <ol className="list-decimal pl-5 text-xs text-slate-350 space-y-1.5">
                <li><strong>Plantilla:</strong> Visualización general, filtros y fichas del jugador.</li>
                <li><strong>Planificación:</strong> Calendarios de microciclos, cargas y descarga de PDF de entrenamientos.</li>
                <li><strong>Asistencia:</strong> Registro rápido de presencia y rendimiento.</li>
                <li><strong>Pizarra Táctica:</strong> Posicionamiento y alineaciones.</li>
                <li><strong>ABP:</strong> Editor simplificado de jugadas ensayadas.</li>
              </ol>
            </div>
          )}

          {/* SECTION: Cap 3 */}
          {activeSection === 'cap3' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 3: PLANTILLA DE JUGADORES</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Permitir la consulta rápida de datos personales y deportivos de cada jugador, facilitando el seguimiento de su rendimiento general, estado físico e historial de valoraciones de la temporada.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Cuándo utilizarlo</span>
                  <p className="mt-1">Antes de preparar una sesión para comprobar qué jugadores están disponibles o de baja, y durante reuniones de staff técnico para analizar la evolución y notas de un futbolista.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">3. Procedimiento paso a paso</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Entra en el menú <strong>Plantilla</strong>.</li>
                    <li>Escribe el dorsal o nombre del jugador en el buscador.</li>
                    <li>Utiliza los filtros rápidos por demarcación (Portero, Defensa, Centrocampista, Delantero).</li>
                    <li>Haz clic en el recuadro del jugador para acceder a su ficha detallada.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">4. Errores frecuentes</span>
                  <p className="mt-1">Confundir la última valoración con la media: La ficha muestra siempre la última valoración vigente guardada, no un promedio histórico, lo cual permite ver el estado de forma exacto actual del jugador.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 4 */}
          {activeSection === 'cap4' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 4: GESTIÓN DE LESIONES</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Llevar un control riguroso y en tiempo real del estado de salud de la plantilla, registrando las bajas médicas, el periodo de readaptación y guardando el histórico médico.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Procedimiento paso a paso</span>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Busca al jugador en <strong>Plantilla</strong> y accede a su ficha detallada.</li>
                    <li>Haz clic en la pestaña <strong>Lesiones</strong>.</li>
                    <li>Presiona el botón <strong>Registrar Lesión</strong> para abrir el formulario.</li>
                    <li>Al dar el alta médica, selecciona el estado <em>&quot;Alta médica&quot;</em> y guarda la fecha real de recuperación. El jugador volverá a estar disponible automáticamente.</li>
                  </ol>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">3. Buenas prácticas</span>
                  <p className="mt-1">Cambiar inmediatamente el estado a <em>&quot;En recuperación&quot;</em> en cuanto el jugador empiece a hacer trabajo de campo individual con el readaptador.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 5 */}
          {activeSection === 'cap5' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 5: PLANIFICACIÓN DE SESIONES</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Organizar el calendario de entrenamientos del equipo a nivel mensual, semanal y diario, estableciendo las cargas de trabajo físico, contenidos prioritarios y adjuntando la documentación táctica.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Procedimiento paso a paso</span>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Accede al menú <strong>Planificación</strong>.</li>
                    <li>Selecciona el mesociclo activo (ej. <em>Pretemporada</em>).</li>
                    <li>Haz clic en el día deseado en el calendario mensual o semanal.</li>
                    <li>Rellena los datos básicos (Horarios, Duración, Carga, Estado de la Sesión).</li>
                    <li>En <strong>Conceptos a Trabajar</strong>, selecciona los temas del día.</li>
                    <li>Importa tareas desde la biblioteca táctica o crea nuevas asignándoles un responsable de staff técnico.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 6 */}
          {activeSection === 'cap6' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 6: REGISTRO DE ASISTENCIA</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Llevar un control diario exhaustivo de la presencia y ausencia de los jugadores en cada sesión, permitiendo identificar patrones de faltas y calcular la tasa de asistencia física real.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Procedimiento paso a paso</span>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Ve al menú <strong>Asistencia</strong> y asegúrate de estar en la pestaña <strong>Pase de Lista</strong>.</li>
                    <li>Selecciona la fecha de hoy y la sesión planificada correspondiente.</li>
                    <li>Para cada jugador, selecciona su estado con los chips: <code>Asiste</code>, <code>No asiste</code>, <code>Lesionado</code>, etc.</li>
                    <li>Si seleccionas <strong>No asiste</strong>, indica obligatoriamente el motivo de ausencia.</li>
                    <li>Presiona el botón <strong>Guardar Asistencia y Valoraciones</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 7 */}
          {activeSection === 'cap7' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 7: VALORACIÓN DE ENTRENAMIENTOS</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Calificar diariamente el nivel de implicación, atención, técnica y táctica de cada jugador que asistió al entrenamiento, detectando picos de forma y bajadas de rendimiento.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Significado de la Escala (1 a 5 estrellas)</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><strong>1 - Muy bajo:</strong> Actitud pasiva, camina en tareas intensas, desconexión táctica.</li>
                    <li><strong>2 - Bajo:</strong> Comete muchos errores técnicos no forzados por falta de concentración.</li>
                    <li><strong>3 - Correcto:</strong> Cumple con el objetivo de la tarea sin destacar pero sin cometer fallos graves.</li>
                    <li><strong>4 - Bueno:</strong> Muy concentrado, gana la mayoría de sus duelos.</li>
                    <li><strong>5 - Excelente:</strong> Rendimiento sobresaliente, lidera las consignas y muestra efectividad.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 8 */}
          {activeSection === 'cap8' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 8: ESTRATEGIA ABP</h2>
              <div className="space-y-3 text-xs text-slate-355">
                <div>
                  <span className="font-bold text-slate-200 block">1. Objetivo del Módulo</span>
                  <p className="mt-1">Diseñar y almacenar de forma visual las jugadas ensayadas a balón parado (ABP), asignando roles y posiciones en el campo para córners, faltas o saques de banda.</p>
                </div>
                <div>
                  <span className="font-bold text-slate-200 block">2. Procedimiento paso a paso</span>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Entra en el menú <strong>ABP</strong>.</li>
                    <li>Haz clic en <strong>Nueva Jugada</strong> e introduce su título, tipo y zona.</li>
                    <li>Arrastra los jugadores desde la plantilla de la derecha y colócalos sobre el césped.</li>
                    <li>Asigna roles haciendo clic en la ficha (Lanzador, Primer Palo, Rematador, Cierre, etc.).</li>
                    <li>Presiona <strong>Guardar Cambios</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Cap 10 */}
          {activeSection === 'cap10' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 10: BUENAS PRÁCTICAS</h2>
              <ul className="list-disc pl-5 text-xs text-slate-350 space-y-2">
                <li><strong>Puntualidad en Asistencia:</strong> Registrar la asistencia el mismo día del entrenamiento antes de salir de las instalaciones del club.</li>
                <li><strong>Inmediatez Médica:</strong> Registrar las lesiones inmediatamente en cuanto el cuerpo médico confirme el diagnóstico.</li>
                <li><strong>Consistencia en Valoraciones:</strong> Calificar a los jugadores de forma objetiva, dedicando 5 minutos de debate en el staff técnico al final del día.</li>
                <li><strong>Orden en ABP:</strong> Mantener las jugadas ABP limpias, eliminando las variantes que ya no se utilicen.</li>
              </ul>
            </div>
          )}

          {/* SECTION: Cap 11 */}
          {activeSection === 'cap11' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-100 border-b border-slate-800 pb-2 print:text-black">CAPÍTULO 11: MANTENIMIENTO (ADMINISTRADOR)</h2>
              <p className="text-xs text-slate-350 leading-relaxed">
                Este bloque detalla las funciones exclusivas del Administrador Principal del Sistema, rol que actualmente desempeña <strong>Zigor Garitagoitia</strong>:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-350 space-y-1.5">
                <li>Alta y Baja de Jugadores a la base de datos de Supabase.</li>
                <li>Asignación y reajuste de Dorsales oficiales.</li>
                <li>Subida de Archivos Multimedia y control de la compresión de imágenes.</li>
                <li>Coordinación de Infraestructura Cloud (Supabase, Vercel, GitHub).</li>
              </ul>
            </div>
          )}

        </article>
      </div>
    </div>
  );
}
