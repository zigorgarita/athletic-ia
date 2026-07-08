'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TacticalAIContext } from '@/types';
import { AIResponseCard } from './AIResponseCard';
import { Send, X, Trash2, HelpCircle, Bot } from 'lucide-react';
import { AIMessage } from '@/types';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: TacticalAIContext;
  messages: AIMessage[];
  isThinking: boolean;
  error: string | null;
  sendMessage: (msg: string, ctx: TacticalAIContext) => Promise<void>;
  clearConversation: () => void;
}

export function AIChatDrawer({ 
  isOpen, 
  onClose, 
  context,
  messages,
  isThinking,
  error,
  sendMessage,
  clearConversation
}: AIChatDrawerProps) {
  const [inputMsg, setInputMsg] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat en cada nuevo mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Cerrar al presionar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = inputMsg.trim();
    if (!cleanMsg || isThinking) return;

    setInputMsg('');
    await sendMessage(cleanMsg, context);
  };

  const handleTriggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
      />

      {/* Drawer Panel */}
      <div 
        ref={drawerRef}
        className="relative w-full max-w-xl h-full bg-slate-950/95 border-l border-slate-800 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-x-0 animate-slide-left"
      >
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[#CC0E21]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">Asistente Táctico IA</h3>
              <p className="text-[10px] text-slate-400">Analista Táctico del Indautxu Juvenil A.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                title="Limpiar conversación"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notificaciones flotantes */}
        {notification && (
          <div className="absolute top-16 left-4 right-4 bg-emerald-500/90 text-slate-950 border border-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold text-center z-50 shadow-lg animate-fade-in flex items-center justify-center gap-1.5">
            <span>{notification}</span>
          </div>
        )}

        {/* Viewport del Chat */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-slate-950/20">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8 space-y-3">
              <Bot className="h-12 w-12 text-slate-700 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">¿En qué puedo ayudarte, Míster?</h4>
                <p className="text-[10px] max-w-xs text-slate-400 leading-relaxed">
                  Pregúntame sobre la alineación, el rendimiento físico GPS, pídeme que diseñe un ejercicio o analiza el sistema del rival.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm pt-4">
                <button 
                  onClick={() => setInputMsg('¿Cómo contrarrestar un sistema 1-4-3-3 rival jugando nosotros 1-4-2-3-1?')}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-lg text-left text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  💡 {"\"¿Cómo contrarrestar un 1-4-3-3 rival?\""}
                </button>
                <button 
                  onClick={() => setInputMsg('Propón una tarea de rondo posicional para mejorar la salida de balón por dentro.')}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800/80 rounded-lg text-left text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  💡 {"\"Propón una tarea de rondo posicional...\""}
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <AIResponseCard 
                key={msg.id} 
                message={msg} 
                onNotification={handleTriggerNotification}
              />
            ))
          )}

          {/* Pensando Loader */}
          {isThinking && (
            <div className="flex gap-3 self-start max-w-[85%] animate-pulse">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#CC0E21] h-9 w-9 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#CC0E21] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#CC0E21] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#CC0E21] rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider ml-1">IA Analizando...</span>
              </div>
            </div>
          )}

          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center flex items-center gap-2 justify-center">
              <HelpCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Form Footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/40 flex gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={isThinking}
            placeholder="Pregunta algo al asistente táctico..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 text-xs placeholder-slate-500 outline-none focus:border-[#CC0E21] transition-all"
          />
          <button
            type="submit"
            disabled={!inputMsg.trim() || isThinking}
            className="p-2.5 rounded-xl bg-[#CC0E21] hover:bg-[#a60c1b] disabled:bg-slate-850 text-slate-100 disabled:text-slate-500 transition-colors flex items-center justify-center flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
