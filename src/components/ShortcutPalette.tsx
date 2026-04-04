import React, { useEffect, useState } from "react";
import { Command, Search, Plus, Trash2, Pin, Moon, Sun, Monitor, Keyboard } from "lucide-react";
import { cn } from "../lib/utils";

interface ShortcutPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "Ctrl + N", description: "New Page", icon: <Plus size={14} /> },
  { key: "Ctrl + F", description: "Toggle Focus Mode", icon: <Monitor size={14} /> },
  { key: "Ctrl + K", description: "Keyboard Shortcuts", icon: <Keyboard size={14} /> },
  { key: "Ctrl + P", description: "Pin/Unpin Page", icon: <Pin size={14} /> },
  { key: "Ctrl + Shift + Backspace", description: "Delete Page", icon: <Trash2 size={14} /> },
  { key: "Ctrl + D", description: "Toggle Dark Mode", icon: <Moon size={14} /> },
];

export function ShortcutPalette({ isOpen, onClose }: ShortcutPaletteProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
      <div 
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Command size={18} className="mr-2 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Keyboard Shortcuts</h2>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {shortcuts.map((shortcut, i) => (
            <div 
              key={i}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-center">
                <div className="mr-3 text-zinc-400">{shortcut.icon}</div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{shortcut.description}</span>
              </div>
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[10px] text-zinc-400">Press Esc to close</p>
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
