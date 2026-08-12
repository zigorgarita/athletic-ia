'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Printer, CheckCircle2, Activity, Users, Calendar, 
  Layout, Trophy, Zap, BarChart3, GitCompare, ShieldAlert, 
  FileText, ExternalLink, BookmarkCheck, Layers,
  Compass, Award, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CAPITULOS = [
  { id: 'cap1', num: '01', title: 'Qué es APP INDAUTXU y cómo trabajamos', icon: BookOpen },
  { id: 'cap2', num: '02', title: 'Acceso, navegación, Pendientes y Modo Edición', icon: Compass },
  { id: 'cap3', num: '03', title: 'Plantilla, jugadores, evaluaciones y lesiones', icon: Users },
  { id: 'cap4', num: '04', title: 'Planificación, asistencia y entrenamientos', icon: Calendar },
  { id: 'cap5', num: '05', title: 'Pizarra Táctica y ABP', icon: Layout },
  { id: 'cap6', num: '06', title: 'Liga, Amistosos, Rivales y Multimedia', icon: Trophy },
  { id: 'cap7', num: '07', title: 'GPS de Partido', icon: Zap },
  { id: 'cap8', num: '08', title: 'Dashboard Plantilla', icon: BarChart3 },
  { id: 'cap9', num: '09', title: 'Comparador Plantilla', icon: GitCompare },
  { id: 'cap10', num: '10', title: 'Buenas prácticas e incidencias', icon: ShieldAlert },
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
            <span className="text-xs font-semibold text-slate-400">Temporada 2026-27</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-[#CC0E21]" />
            GUÍA APP INDAUTXU 26-27
          </h1>
          <p className="text-slate-400 text-sm">
            Manual práctico de uso diario y flujo de trabajo para el Cuerpo Técnico del Juvenil A (División de Honor).
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
        <aside className="w-full md:w-72 shrink-0 space-y-2 bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Índice de Capítulos</span>
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

        {/* Articulo / Visor del Capítulo Activo en Pantalla */}
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
            Manual Práctico de Referencia y Flujo Metodológico para el Cuerpo Técnico (Temporada 2026-27)
          </p>
          <div className="flex justify-center items-center gap-6 pt-4 text-xs font-mono text-slate-600">
            <span><strong>Nombre Oficial:</strong> APP INDAUTXU</span>
            <span>•</span>
            <span><strong>URL de Acceso:</strong> https://athletic-ia.vercel.app</span>
          </div>
        </div>

        {/* ÍNDICE EN LA IMPRESIÓN */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 page-break-after">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-300 pb-2 uppercase">Índice del Manual Completo</h2>
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
          S.D. Indautxu Juvenil A DH (2026-27) — APP INDAUTXU — Documento de Referencia Interna del Cuerpo Técnico
        </div>
      </div>

    </div>
  );
}

/* ========================================================================= */
/* COMPONENTES DE CONTENIDO DE CADA CAPÍTULO                                 */
/* ========================================================================= */

function Capitulo1Content({ isPrint = false }: { isPrint?: boolean }) {
  return (
    <div className={`space-y-5 ${isPrint ? 'text-slate-900' : 'text-slate-200'}`}>
      <div className="border-b border-slate-800 pb-3 flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-black bg-[#CC0E21] text-white rounded-lg">Capítulo 01</span>
        <h2 className="text-2xl font-black tracking-tight">Qué es APP INDAUTXU y cómo trabajamos</h2>
      </div>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-red-50 border-red-200 text-slate-900' : 'bg-[#CC0E21]/10 border-[#CC0E21]/30 text-slate-200'}`}>
        <span className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider block mb-1">Principio Metodológico Fundamental</span>
        <p className="text-xs leading-relaxed font-medium">
          <strong>La aplicación no sustituye al entrenador.</strong> La tecnología es una herramienta de soporte analítico y organizativo; el liderazgo, la lectura táctica del juego y la intuición del cuerpo técnico siguen siendo el motor indispensable del equipo.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#CC0E21]" />
          Objetivo de APP INDAUTXU
        </h3>
        <p className="text-xs leading-relaxed text-slate-400 print:text-slate-700">
          Es la plataforma web interna de gestión deportiva y análisis de rendimiento diseñada específicamente para el Cuerpo Técnico del <strong>Juvenil A de División de Honor de la S.D. Indautxu (Temporada 2026-27)</strong>.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#CC0E21]" />
          Pilares de Trabajo del Cuerpo Técnico
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <li className={`p-3 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
            <strong className="text-[#CC0E21] block mb-1">1. Centralizar información</strong>
            Evitar que los datos de rendimiento, estados físicos o anotaciones tácticas queden dispersos en notas en papel o grupos de mensajería.
          </li>
          <li className={`p-3 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
            <strong className="text-[#CC0E21] block mb-1">2. Preservar el histórico</strong>
            Mantener la trazabilidad completa del trabajo de toda la temporada para evaluar la evolución individual y colectiva del grupo.
          </li>
          <li className={`p-3 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
            <strong className="text-[#CC0E21] block mb-1">3. Comunicación unificada</strong>
            Garantizar que primer entrenador, segundo entrenador, preparador físico, analista y fisioterapeuta compartan la misma información en tiempo real.
          </li>
          <li className={`p-3 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
            <strong className="text-[#CC0E21] block mb-1">4. Toma de decisiones objetiva</strong>
            Respaldar alineaciones y convocatorias en métricas de asistencia, valoraciones diarias, informes condicionales y estado de salud real.
          </li>
        </ul>
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

      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-[#CC0E21]" />
          Acceso Oficial a la Aplicación
        </h3>
        <p className="text-xs leading-relaxed text-slate-400 print:text-slate-700">
          La dirección web oficial de la aplicación para el cuerpo técnico es:
        </p>
        <div className={`p-3 rounded-xl font-mono text-xs font-bold text-center border ${isPrint ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-[#CC0E21]'}`}>
          https://athletic-ia.vercel.app
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-[#CC0E21]">
            <BookmarkCheck className="h-4 w-4" />
            Módulo de Pendientes
          </h4>
          <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
            Muestra las tareas operativas urgentes del cuerpo técnico: sesiones sin lista pasada, jugadores en seguimiento médico, partidos sin acta cargada o convocatorias pendientes de cierre.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-[#CC0E21]">
            <Lock className="h-4 w-4" />
            Modo Lectura vs. Modo Edición
          </h4>
          <ul className="text-xs text-slate-400 print:text-slate-700 space-y-1.5">
            <li><strong>• Modo Lectura:</strong> Consulta rápida y segura sin riesgo de alteración accidental de datos durante partidos o en movilidad.</li>
            <li><strong>• Modo Edición:</strong> Habilita formularios, registros de asistencia, edición de alineaciones e introducción de valoraciones.</li>
          </ul>
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
        <h2 className="text-2xl font-black tracking-tight">Plantilla, jugadores, evaluaciones y lesiones</h2>
      </div>

      <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
        Centraliza toda la información deportiva, médica e individual de cada integrante del Juvenil A.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Fichas Individuales</strong>
          Datos personales, dorsal, posición principal y secundaria, foto oficial, minutos totales disputados e historial deportivo.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Evaluación Específica</strong>
          Seguimiento del rendimiento del futbolista acorde a las demandas específicas de su posición, sin promedios planos.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Gestión de Lesiones</strong>
          Registro médico del fisioterapeuta: diagnóstico, fecha de baja, fase de readaptación (`Activa`, `En recuperación`) y `Alta médica`.
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
        <h2 className="text-2xl font-black tracking-tight">Planificación, asistencia y entrenamientos</h2>
      </div>

      <div className="space-y-3 text-xs text-slate-400 print:text-slate-700">
        <h3 className="text-sm font-bold text-slate-200 print:text-slate-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#CC0E21]" />
          Flujo de Planificación Semanal
        </h3>
        <p className="leading-relaxed">
          Permite estructurar las sesiones de entrenamiento del microciclo, asignando la carga condicional (Baja, Media, Alta, Activación, Recuperación), la duración total en minutos, los objetivos tácticos del día y el adjunto en PDF con la gráfica de tareas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-200 print:text-slate-900 mb-2">Control de Asistencia Diario</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed mb-2">
            Pase de lista obligatorio en vestuario pre-sesión con estados: `Asiste`, `No asiste`, `Lesionado`, `Duda`, `Sancionado` o `Baja temporal`.
          </p>
          <p className="text-slate-500 text-[11px]">
            Las ausencias requieren justificación: Lesión, Estudios, Enfermedad, Decisión Técnica, etc.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h4 className="font-bold text-slate-200 print:text-slate-900 mb-2">Valoración del Entrenamiento</h4>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Registro post-entrenamiento de las notas de actitud, intensidad condicional, nivel técnico y asimilación táctica de los jugadores asistentes.
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
          <h3 className="font-bold text-slate-200 print:text-slate-900 mb-2 flex items-center gap-2">
            <Layout className="h-4 w-4 text-[#CC0E21]" />
            Pizarra Táctica
          </h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Campograma interactivo para dibujar sistemas de juego (1-4-3-3, 1-4-2-3-1, etc.), movimientos en fase ofensiva/defensiva y establecer alineaciones titulares y alternativas para el día de partido.
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-slate-200 print:text-slate-900 mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#CC0E21]" />
            Estrategia ABP (Acciones a Balón Parado)
          </h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            Catálogo y creador de jugadas ensayadas (Córners, Faltas laterales, Saques de banda). Permite la asignación explícita de funciones a cada jugador: Sacador, Primer Palo, Rematador, Bloqueo, Vigilancia Defensiva.
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
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Liga y Amistosos</strong>
          Calendario de las 30 jornadas oficiales de División de Honor y partidos de preparación. Gestión de actas, convocatorias, cambios y tarjetas.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Centro de Partido y Rivales</strong>
          Preparación del encuentro, informe de scouting del rival, síntesis de pautas por líneas (defensa, medio, delantera) y plan de partido.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-slate-200 print:text-slate-900 font-bold block mb-1">Videoteca y Multimedia</strong>
          Gestión de enlaces de vídeo (partidos completos, cortes tácticos, jugadas ABP) con soporte para YouTube y almacenamiento en la nube.
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
        Módulo de análisis de rendimiento condicional y físico de los partidos oficial y entrenamientos de alta exigencia.
      </p>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} text-xs space-y-2`}>
        <h3 className="font-bold text-slate-200 print:text-slate-900">Métricas GPS Registradas:</h3>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-400 print:text-slate-700">
          <li>• Distancia Total (m)</li>
          <li>• HSR (&gt; 21 km/h)</li>
          <li>• Sprints (&gt; 24 km/h)</li>
          <li>• Aceleraciones / Desaceleraciones</li>
          <li>• Velocidad Máxima (km/h)</li>
          <li>• Player Load Acumulado</li>
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
        Panel de control analítico global de la plantilla para el seguimiento consolidado del grupo durante el mesociclo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-[#CC0E21] block mb-1">Disponibilidad del Grupo</strong>
          Porcentaje de futbolistas disponibles vs. lesionados o ausentes para la jornada.
        </div>
        <div className={`p-3.5 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <strong className="text-[#CC0E21] block mb-1">Reparto de Minutos</strong>
          Acumulado de competición de la plantilla para equilibrar la carga de partidos.
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
        Herramienta de análisis frente a frente (<em>Face-to-Face</em>) entre dos jugadores de la misma posición o demarcación.
      </p>

      <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} text-xs space-y-2`}>
        <h3 className="font-bold text-slate-200 print:text-slate-900">Variables de Comparación:</h3>
        <p className="text-slate-400 print:text-slate-700 leading-relaxed">
          Permite contrastar las valoraciones medias de entrenamiento, perfil deportivo en aptitudes clave, minutos jugados en competición, disciplina (tarjetas) y datos GPS para respaldar decisiones de alineación o convocatorias.
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
          <h3 className="font-bold text-slate-200 print:text-slate-900 mb-2">Convención de Nombres Estándar</h3>
          <p className="text-slate-400 print:text-slate-700 leading-relaxed">
            • Sesiones: <code>[AAAA-MM-DD] [Carga] - [Objetivo Táctico]</code> (ej. <em>2026-10-14 Media - Salida de Balón</em>).<br/>
            • ABP: <code>[Tipo] - [Nombre Clave] - [Detalle]</code> (ej. <em>Córner Ofensivo - 2 Manos - Primer Palo</em>).<br/>
            • Partidos: <code>[Jornada_XX] vs [Rival] - [Esquema]</code> (ej. <em>Jornada 05 vs Eibar - 1-4-3-3</em>).
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-red-50 border-red-200' : 'bg-[#CC0E21]/10 border-[#CC0E21]/30'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2">Protocolo Ante Incidencias Técnicas</h3>
          <ol className="list-decimal pl-4 text-slate-400 print:text-slate-700 space-y-1">
            <li><strong>NO borrar datos:</strong> Evitar eliminar registros históricos para solucionar un error visual.</li>
            <li><strong>Captura de pantalla:</strong> Capturar la pantalla completa incluyendo la URL de la barra de navegador.</li>
            <li><strong>Aviso a Coordinación:</strong> Notificar la incidencia detallando la acción realizada antes del error.</li>
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

      <p className="text-xs text-slate-400 print:text-slate-700 leading-relaxed">
        Resumen gráfico y secuencial de los 4 flujos de trabajo principales de APP INDAUTXU:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Flujo 1: Entrenamiento */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            1. Flujo de Entrenamiento
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Programar sesión y carga en <strong>Planificación</strong>.</p>
            <p>2. Pasar lista de presencia en <strong>Asistencia</strong> pre-sesión.</p>
            <p>3. Introducir valoraciones individuales post-sesión.</p>
            <p>4. Consultar métricas agregadas en <strong>Dashboard</strong>.</p>
          </div>
        </div>

        {/* Flujo 2: Partido */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            2. Flujo de Partido
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Analizar scouting en <strong>Rivales</strong>.</p>
            <p>2. Definir sistema en <strong>Pizarra Táctica</strong> y jugadas <strong>ABP</strong>.</p>
            <p>3. Cerrar la convocatoria y XI titular en <strong>Centro de Partido</strong>.</p>
            <p>4. Cargar acta, minutos y goles en <strong>Liga / Amistosos</strong>.</p>
          </div>
        </div>

        {/* Flujo 3: Jugador */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            3. Flujo de Jugador
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Consulta de ficha en <strong>Plantilla</strong>.</p>
            <p>2. Evaluaciones específicas periódicas por demarcación.</p>
            <p>3. Registro médico en <strong>Lesiones</strong> (Baja / Readaptación / Alta).</p>
            <p>4. Análisis comparativo en <strong>Comparador Plantilla</strong>.</p>
          </div>
        </div>

        {/* Flujo 4: GPS */}
        <div className={`p-4 rounded-xl border ${isPrint ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
          <h3 className="font-bold text-[#CC0E21] mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            4. Flujo de GPS
          </h3>
          <div className="space-y-1.5 text-slate-400 print:text-slate-700 font-mono text-[11px]">
            <p>1. Descarga de datos condicionales tras partido / entrenamiento.</p>
            <p>2. Carga de métricas físicas en el módulo <strong>GPS de Partido</strong>.</p>
            <p>3. Evaluación de fatiga neuromuscular y HSR acumulado.</p>
            <p>4. Ajuste de cargas físicas en <strong>Planificación</strong> semanal.</p>
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
          APP INDAUTXU mantiene una compatibilidad estandarizada de nombres de equipos, dorsales, actas y nomenclaturas oficiales con las plataformas de la <strong>Real Federación Española de Fútbol (RFEF)</strong> y los proveedores de análisis de vídeo estadístico <strong>Die Ligen</strong>.
        </p>
        <p className="text-slate-400 print:text-slate-700 leading-relaxed">
          Esta homologación permite un trasvase ágil de la información de las actas oficiales de División de Honor sin discrepancias ortográficas ni desajustes en el cómputo de minutos y tarjetas.
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
          COMPROMISO CON LA EXCELENCIA EN DIVISIÓN DE HONOR
        </h3>
        <p className="text-xs text-slate-400 print:text-slate-700 max-w-xl mx-auto leading-relaxed">
          Esta guía constituye el marco de referencia común para todo el Cuerpo Técnico de la S.D. Indautxu (Juvenil A) durante la Temporada 2026-27. La constancia y el rigor en su uso diario potencian la calidad del análisis deportivo y optimizan el rendimiento del equipo.
        </p>
        <div className="pt-2 text-[11px] font-mono font-bold text-[#CC0E21]">
          S.D. INDAUTXU — JUVENIL A (2026-27)
        </div>
      </div>
    </div>
  );
}
