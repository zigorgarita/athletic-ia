'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Printer, Activity, Users, Calendar, 
  Layout, Trophy, Zap, BarChart3, GitCompare, ShieldAlert, 
  FileText, Compass, Award
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CAPITULOS = [
  { id: 'cap1', num: '01', title: 'Qué es APP INDAUTXU y cómo trabajamos', icon: BookOpen },
  { id: 'cap2', num: '02', title: 'Acceso, navegación, Pendientes y Modo Edición', icon: Compass },
  { id: 'cap3', num: '03', title: 'Plantilla, jugadores, evaluaciones, lesiones y seguimiento individual', icon: Users },
  { id: 'cap4', num: '04', title: 'Planificación, asistencia y seguimiento de entrenamientos', icon: Calendar },
  { id: 'cap5', num: '05', title: 'Pizarra Táctica y ABP', icon: Layout },
  { id: 'cap6', num: '06', title: 'Liga, Amistosos, Centro de Partido, Rivales y Multimedia', icon: Trophy },
  { id: 'cap7', num: '07', title: 'GPS de Partido', icon: Zap },
  { id: 'cap8', num: '08', title: 'Dashboard Plantilla', icon: BarChart3 },
  { id: 'cap9', num: '09', title: 'Comparador Plantilla', icon: GitCompare },
  { id: 'cap10', num: '10', title: 'Buenas prácticas, incidencias y criterios comunes', icon: ShieldAlert },
  { id: 'flujos', num: 'A1', title: 'Resumen Rápido de Flujos', icon: Activity },
  { id: 'rfef', num: 'A2', title: 'Nota sobre RFEF y Die Ligen', icon: FileText },
  { id: 'cierre', num: 'A3', title: 'Cierre de la Guía', icon: Award }
];

export default function GuiaPage() {
  const [activeSection, setActiveSection] = useState('cap1');

  return (
    <div className="space-y-6 select-none print:bg-white print:text-slate-900 print:select-text">
      
      {/* ========================================== */}
      {/* HEADER DE LA PANTALLA (oculto al imprimir) */}
      {/* ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800/80 pb-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#CC0E21]/20 text-[#CC0E21] border border-[#CC0E21]/30 rounded-full">
              DOCUMENTO OFICIAL
            </span>
            <span className="text-xs font-semibold text-slate-400">Juvenil A - S.D. Indautxu (División de Honor)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#CC0E21]" />
            GUÍA APP INDAUTXU 26-27
          </h1>
          <p className="text-slate-400 text-sm">
            Manual de Referencia Práctica para el Cuerpo Técnico (Temporada 2026-27).
          </p>
        </div>

        <Button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 self-start lg:self-auto bg-[#CC0E21] hover:bg-[#b00c1c] text-white font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF Completo
        </Button>
      </div>

      {/* ========================================== */}
      {/* NAVEGACIÓN Y VISTA DE PANTALLA (WEB ONLY)  */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row gap-6 items-start print:hidden">
        
        {/* Sidebar de Índice lateral */}
        <aside className="w-full md:w-80 shrink-0 space-y-2 bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Índice del Manual</span>
            <span className="text-[10px] font-semibold text-slate-500">10 Cap. + Anexos</span>
          </div>

          {/* Selector desplegable en móvil */}
          <div className="md:hidden">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl p-3 focus:outline-none focus:border-[#CC0E21]"
            >
              {CAPITULOS.map(cap => (
                <option key={cap.id} value={cap.id}>
                  [{cap.num}] {cap.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lista interactiva en escritorio */}
          <nav className="hidden md:block space-y-1 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            {CAPITULOS.map(cap => {
              const Icon = cap.icon;
              const isActive = activeSection === cap.id;
              return (
                <button
                  key={cap.id}
                  onClick={() => setActiveSection(cap.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-[#CC0E21]/20 text-white border border-[#CC0E21]/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <span className={`text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#CC0E21] text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {cap.num}
                  </span>
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#CC0E21]' : 'text-slate-400'}`} />
                  <span className="truncate">{cap.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Artículo / Visor del Capítulo Activo en Pantalla */}
        <article className="flex-1 w-full bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 md:p-8 space-y-6 overflow-y-auto max-h-[78vh]">
          {activeSection === 'cap1' && <Capitulo1Content />}
          {activeSection === 'cap2' && <Capitulo2Content />}
          {activeSection === 'cap3' && <Capitulo3Content />}
          {activeSection === 'cap4' && <Capitulo4Content />}
          {activeSection === 'cap5' && <Capitulo5Content />}
          {activeSection === 'cap6' && <Capitulo6Content />}
          {activeSection === 'cap7' && <Capitulo7Content />}
          {activeSection === 'cap8' && <Capitulo8Content />}
          {activeSection === 'cap9' && <Capitulo9Content />}
          {activeSection === 'cap10' && <Capitulo10Content />}
          {activeSection === 'flujos' && <FlujosContent />}
          {activeSection === 'rfef' && <RfefContent />}
          {activeSection === 'cierre' && <CierreContent />}
        </article>
      </div>

      {/* ============================================================== */}
      {/* IMPRESIÓN COMPLETA (PRINT ONLY) - RENDERIZA LA GUÍA COMPLETA  */}
      {/* ============================================================== */}
      <div className="hidden print:block space-y-10 text-slate-900">
        
        {/* PORTADA IMPRESA */}
        <div className="border-b-4 border-[#CC0E21] pb-8 text-center space-y-4 pt-6">
          <div className="inline-block bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black tracking-widest text-[#CC0E21] uppercase border border-slate-300">
            S.D. INDAUTXU — JUVENIL A DIVISIÓN DE HONOR
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
            GUÍA APP INDAUTXU 26-27
          </h1>
          <p className="text-base font-semibold text-slate-700 max-w-2xl mx-auto">
            Manual de Referencia Práctica para el Cuerpo Técnico (Temporada 2026-27)
          </p>
          <div className="flex justify-center items-center gap-6 pt-4 text-xs font-mono text-slate-600">
            <span><strong>Nombre Oficial:</strong> APP INDAUTXU</span>
            <span>•</span>
            <span><strong>URL de Acceso:</strong> https://athletic-ia.vercel.app</span>
          </div>
        </div>

        {/* ÍNDICE EN LA IMPRESIÓN */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 page-break-after">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-300 pb-2 uppercase">Índice General</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {CAPITULOS.map(cap => (
              <div key={cap.id} className="flex items-center justify-between border-b border-slate-200/60 py-1 font-semibold">
                <span className="text-slate-800">[{cap.num}] {cap.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CAPÍTULOS IMPRESOS UNO A UNO CON SALTOS DE PÁGINA */}
        <div className="space-y-12">
          <section className="page-break-before pt-6"><Capitulo1Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo2Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo3Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo4Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo5Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo6Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo7Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo8Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo9Content isPrint /></section>
          <section className="page-break-before pt-6"><Capitulo10Content isPrint /></section>
          <section className="page-break-before pt-6"><FlujosContent isPrint /></section>
          <section className="page-break-before pt-6"><RfefContent isPrint /></section>
          <section className="page-break-before pt-6"><CierreContent isPrint /></section>
        </div>

        {/* PIE DE PÁGINA IMPRESO */}
        <div className="border-t border-slate-300 pt-4 text-center text-[10px] font-mono text-slate-500">
          Juvenil A - S.D. Indautxu (División de Honor) — APP INDAUTXU 26-27 — Manual del Cuerpo Técnico
        </div>
      </div>

    </div>
  );
}

/* ========================================================================= */
/* COMPONENTES DE CONTENIDO FIEL AL DOCUMENTO FUENTE                       */
/* ========================================================================= */

function Capitulo1Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 01</span>
        <h2 className="text-2xl font-black tracking-tight">Qué es APP INDAUTXU y cómo trabajamos</h2>
      </div>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-red-50 border-red-200 text-slate-900' : 'bg-[#CC0E21]/10 border-[#CC0E21]/30 text-slate-200'}`}>
        <span className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider block mb-1">¡IMPORTANTE!</span>
        <p className="text-xs leading-relaxed font-medium">
          <strong>La aplicación no sustituye al entrenador.</strong> La tecnología es una herramienta de soporte; el ojo humano, el liderazgo y la intuición del cuerpo técnico siguen siendo el motor principal del equipo.
        </p>
      </div>

      <div className="space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">Su función principal es:</h3>
        <ul className="space-y-2 pl-2 text-slate-400 print:text-slate-700">
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">1.</span>
            <span><strong>Centralizar información:</strong> Que ningún dato de rendimiento, físico o táctico se quede en hojas sueltas o chats de WhatsApp.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">2.</span>
            <span><strong>Evitar pérdida de datos:</strong> Preservar el histórico de toda la temporada del Juvenil A, asegurando la consistencia incluso si hay cambios en la plantilla.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">3.</span>
            <span><strong>Facilitar la comunicación interna:</strong> Que el preparador físico, el analista, el segundo y el primer entrenador visualicen la misma información en tiempo real.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">4.</span>
            <span><strong>Mantener histórico:</strong> Poder analizar la evolución física, asistencias y rendimiento a lo largo de las semanas.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">5.</span>
            <span><strong>Ayudar en la toma de decisiones:</strong> Seleccionar el plan de partido y alineaciones basándose en estadísticas objetivas (asistencias, valoraciones diarias, fatiga acumulada).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#CC0E21]">6.</span>
            <span><strong>Ahorrar tiempo:</strong> Agilizar los procesos rutinarios de gestión para que el cuerpo técnico pueda enfocarse en el césped.</span>
          </li>
        </ul>
        <p className="italic text-slate-400 print:text-slate-600 text-[11px] pt-2">
          La aplicación es un entorno colaborativo común; la rigurosidad en su actualización determina la calidad del análisis final.
        </p>
      </div>
    </div>
  );
}

function Capitulo2Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 02</span>
        <h2 className="text-2xl font-black tracking-tight">Acceso, navegación, Pendientes y Modo Edición</h2>
      </div>

      <div className="space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">Acceso y Estructura</h3>
        <ul className="space-y-2 text-slate-400 print:text-slate-700">
          <li>• <strong>URL de Acceso:</strong> <code className="text-[#CC0E21] bg-slate-950 px-2 py-0.5 rounded font-mono">https://athletic-ia.vercel.app</code></li>
          <li>• <strong>Menú Lateral / Inferior:</strong> Organiza las secciones principales de la app de forma responsiva (móviles y escritorio).</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-2 text-[#CC0E21]">Módulo de Pendientes</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Centraliza las alertas y tareas pendientes del staff técnico: revisiones médicas, asistencias sin cerrar o elementos por completar.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-2 text-[#CC0E21]">Modo Lectura vs. Modo Edición</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Permite alternar entre la consulta segura de la información y la edición o guardado activo de datos en la aplicación.
          </p>
        </div>
      </div>
    </div>
  );
}

function Capitulo3Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 03</span>
        <h2 className="text-2xl font-black tracking-tight">Plantilla, jugadores, evaluaciones, lesiones y seguimiento individual</h2>
      </div>

      <div className="space-y-3 text-xs text-slate-400 print:text-slate-700">
        <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">Objetivo del Módulo</h3>
        <p className="leading-relaxed">
          Permitir la consulta rápida de datos personales y deportivos de cada jugador, facilitando el seguimiento de su rendimiento general, estado físico e historial de valoraciones de la temporada.
        </p>
      </div>

      <div className="space-y-3 text-xs text-slate-400 print:text-slate-700">
        <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">Procedimiento paso a paso</h3>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Entra en el menú <strong>Plantilla</strong>.</li>
          <li>Escribe el dorsal o nombre del jugador en el buscador de la barra superior.</li>
          <li>Utiliza los filtros rápidos por demarcación (Portero, Defensa, Centrocampista, Delantero) o estado.</li>
          <li>Haz clic en el recuadro del jugador para acceder a su ficha detallada.</li>
          <li>Navega entre las pestañas <em>Datos Generales</em>, <em>Perfil Deportivo</em>, <em>Valoraciones</em>, <em>Lesiones</em> y <em>Estadísticas</em>.</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-1">Última valoración vigente</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            La ficha muestra siempre la última valoración vigente guardada (trazabilidad temporal real), no un promedio histórico, lo cual permite ver el estado de forma exacto actual del jugador.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-1">Gestión de Lesiones</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Control en tiempo real del estado de salud de la plantilla, registrando las bajas médicas, el periodo de readaptación y los estados: <em>Activa</em>, <em>En recuperación</em> y <em>Alta médica</em>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Capitulo4Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 04</span>
        <h2 className="text-2xl font-black tracking-tight">Planificación, asistencia y seguimiento de entrenamientos</h2>
      </div>

      <div className="space-y-3 text-xs text-slate-400 print:text-slate-700">
        <h3 className="text-sm font-bold text-slate-100 print:text-slate-900">Planificación de Sesiones</h3>
        <p className="leading-relaxed">
          Organizar el calendario de entrenamientos del equipo a nivel mensual, semanal y diario, estableciendo las cargas de trabajo físico, contenidos prioritarios y adjuntando la documentación táctica (PDF).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-2">Registro de Asistencia</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed mb-2">
            Pase de lista diario en vestuario. Estados: <code>Asiste</code>, <code>No asiste</code>, <code>Lesionado</code>, <code>Duda</code>, <code>Sancionado</code>, <code>Baja temporal</code>.
          </p>
          <p className="text-slate-500 text-[11px]">
            Motivos de ausencia: Lesión, Enfermedad, Estudios, Trabajo, Viaje, Motivo personal, Decisión técnica, Sin justificar, Otro.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-100 print:text-slate-900 mb-2">Valoración de Entrenamientos</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Calificar diariamente el nivel de los jugadores que asistieron al entrenamiento (escala de 1 a 5 estrellas) y registrar observaciones de la sesión.
          </p>
        </div>
      </div>
    </div>
  );
}

function Capitulo5Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 05</span>
        <h2 className="text-2xl font-black tracking-tight">Pizarra Táctica y ABP</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-slate-100 print:text-slate-900 mb-2 flex items-center gap-2">
            <Layout className="h-4 w-4 text-[#CC0E21]" />
            Pizarra Táctica
          </h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Posicionamiento sobre el campo y diseño de alineaciones y sistemas de juego para los planes de partido del Juvenil A.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-slate-100 print:text-slate-900 mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#CC0E21]" />
            Estrategia ABP
          </h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Diseñar y almacenar de forma visual las jugadas ensayadas a balón parado (córners, faltas, saques de banda), asignando roles y puestos en el campo (Lanzador, Primer Palo, Rematador, Vigilancia, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}

function Capitulo6Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 06</span>
        <h2 className="text-2xl font-black tracking-tight">Liga, Amistosos, Centro de Partido, Rivales y Multimedia</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-100 print:text-slate-900 font-bold block mb-1">Liga y Amistosos</strong>
          Gestión de partidos de la competición oficial y encuentros amistosos. Registro de alineaciones, actas, goles, cambios y tarjetas.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-100 print:text-slate-900 font-bold block mb-1">Centro de Partido y Rivales</strong>
          Preparación previa del partido, análisis de informes del rival y síntesis de pautas tácticas por líneas (Portería, Defensa, Mediocampo, Delantera).
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-100 print:text-slate-900 font-bold block mb-1">Multimedia y Vídeos</strong>
          Enlace y visualización de vídeos de partidos completos, cortes tácticos y referencias en vídeo de jugadas ensayadas.
        </div>
      </div>
    </div>
  );
}

function Capitulo7Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 07</span>
        <h2 className="text-2xl font-black tracking-tight">GPS de Partido</h2>
      </div>

      <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
        Registro y seguimiento de métricas físicas condicionales de los futbolistas obtenidas durante los partidos.
      </p>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} text-xs space-y-2`}>
        <h3 className="font-bold text-slate-100 print:text-slate-900">Métricas GPS:</h3>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-400 print:text-slate-700">
          <li>• Distancia Total (m)</li>
          <li>• HSR (&gt; 21 km/h)</li>
          <li>• Sprints (&gt; 24 km/h)</li>
          <li>• Aceleraciones</li>
          <li>• Desaceleraciones</li>
          <li>• Velocidad Máxima (km/h)</li>
        </ul>
      </div>
    </div>
  );
}

function Capitulo8Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 08</span>
        <h2 className="text-2xl font-black tracking-tight">Dashboard Plantilla</h2>
      </div>

      <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
        Panel de control y vista analítica general de la plantilla.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-[#CC0E21] block mb-1">Métricas Consolidadas</strong>
          Visión global del estado del grupo, porcentaje de asistencia y carga acumulada.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-[#CC0E21] block mb-1">Minutos y Disponibilidad</strong>
          Seguimiento de minutos acumulados por los futbolistas y tasa de disponibilidad.
        </div>
      </div>
    </div>
  );
}

function Capitulo9Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 09</span>
        <h2 className="text-2xl font-black tracking-tight">Comparador Plantilla</h2>
      </div>

      <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
        Herramienta de comparación directa entre dos jugadores de la plantilla.
      </p>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} text-xs space-y-2`}>
        <h3 className="font-bold text-slate-100 print:text-slate-900">Comparativa de Jugadores:</h3>
        <p className="text-slate-400 print:text-slate-700 leading-relaxed">
          Permite contrastar valoraciones de entrenamiento, estadísticas, minutos disputados y métricas físicas entre futbolistas para apoyar la toma de decisiones del cuerpo técnico.
        </p>
      </div>
    </div>
  );
}

function Capitulo10Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 10</span>
        <h2 className="text-2xl font-black tracking-tight">Buenas prácticas, incidencias y criterios comunes</h2>
      </div>

      <div className="space-y-3 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-slate-100 print:text-slate-900 mb-2">Convención de Nombres</h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            • Sesiones: <code>[AAAA-MM-DD] [Tipo_Sesion] - [Objetivo_Principal]</code><br/>
            • ABP: <code>[Tipo_ABP] - [Nombre_Clave] - [Variante/Detalle]</code><br/>
            • Partidos: <code>[Jornada_XX] vs [Rival] - [Esquema_Inicial]</code><br/>
            • Informes: <code>[Mesociclo/Mes] - [Tipo_Informe] - [Detalle]</code>
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-red-50 border-red-200' : 'bg-[#CC0E21]/10 border-[#CC0E21]/30'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2">Procedimiento Ante Incidencias</h3>
          <ol className="list-decimal pl-4 text-slate-400 print:text-slate-700 space-y-1">
            <li><strong>NO BORRAR DATOS:</strong> No intentes solucionar el problema borrando registros históricos.</li>
            <li><strong>HACER CAPTURA DE PANTALLA:</strong> Toma una captura completa con el mensaje de error, la URL y la consola (F12).</li>
            <li><strong>AVISAR AL ADMINISTRADOR:</strong> Envía la captura con una descripción simple a Zigor Garitagoitia.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function FlujosContent({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Anexo 01</span>
        <h2 className="text-2xl font-black tracking-tight">Resumen Rápido de Flujos</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Flujo 1: Entrenamiento */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            1. Flujo de Entrenamiento
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Programar sesión y cargas en <strong>Planificación</strong>.</p>
            <p>2. Pasar lista de presencia en <strong>Asistencia</strong> pre-sesión.</p>
            <p>3. Introducir valoraciones de entrenamiento post-sesión.</p>
            <p>4. Consultar métricas en <strong>Dashboard Plantilla</strong>.</p>
          </div>
        </div>

        {/* Flujo 2: Partido */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            2. Flujo de Partido
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Analizar rival en <strong>Rivales</strong> y <strong>Centro de Partido</strong>.</p>
            <p>2. Definir sistema en <strong>Pizarra Táctica</strong> y jugadas en <strong>ABP</strong>.</p>
            <p>3. Registrar alineaciones, acta y minutos en <strong>Liga / Amistosos</strong>.</p>
            <p>4. Enlazar cortes tácticos en <strong>Multimedia / Vídeos</strong>.</p>
          </div>
        </div>

        {/* Flujo 3: Jugador */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            3. Flujo de Jugador
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Consulta de ficha deportiva en <strong>Plantilla</strong>.</p>
            <p>2. Seguimiento de valoraciones e historial.</p>
            <p>3. Registro médico en <strong>Lesiones</strong> (Activa / En recuperación / Alta médica).</p>
            <p>4. Comparativa individual en <strong>Comparador Plantilla</strong>.</p>
          </div>
        </div>

        {/* Flujo 4: GPS */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            4. Flujo de GPS
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Recopilar datos físicos condicionales del partido.</p>
            <p>2. Cargar métricas en el módulo <strong>GPS de Partido</strong>.</p>
            <p>3. Analizar distancias, HSR y aceleraciones por jugador.</p>
            <p>4. Ajustar planificación de cargas condicionales semanales.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RfefContent({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Anexo 02</span>
        <h2 className="text-2xl font-black tracking-tight">Nota sobre RFEF y Die Ligen</h2>
      </div>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} text-xs space-y-3`}>
        <p className="text-slate-400 print:text-slate-700 leading-relaxed">
          Punto de continuidad y coordinación respecto a las fuentes oficiales RFEF y los sistemas de análisis Die Ligen. La aplicación mantiene la independencia y el control de los datos internos del staff del Juvenil A.
        </p>
      </div>
    </div>
  );
}

function CierreContent({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Anexo 03</span>
        <h2 className="text-2xl font-black tracking-tight">Cierre de la Guía</h2>
      </div>

      <div className={`p-6 rounded-2xl border text-center space-y-3 ${isPrint ? 'bg-slate-50 border-slate-300' : 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800'}`}>
        <Award className="h-10 w-10 text-[#CC0E21] mx-auto" />
        <h3 className="text-lg font-black text-slate-100 print:text-slate-900">
          GUÍA APP INDAUTXU 26-27
        </h3>
        <p className="text-xs text-slate-400 print:text-slate-700 max-w-xl mx-auto leading-relaxed">
          Manual de Referencia Práctica para el Cuerpo Técnico — Juvenil A (División de Honor), S.D. Indautxu (Temporada 2026-27).
        </p>
      </div>
    </div>
  );
}
