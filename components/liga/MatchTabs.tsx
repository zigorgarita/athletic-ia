'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface MatchTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function MatchTabs({ tabs, activeTab, onChange }: MatchTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-950/40 border border-slate-900 rounded-2xl scrollbar-none select-none z-10">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              isActive
                ? 'bg-[#CC0E21] text-white shadow-md shadow-[#CC0E21]/20 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
