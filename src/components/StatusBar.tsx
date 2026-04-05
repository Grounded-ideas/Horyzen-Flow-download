import React from "react";
import { Target, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  lineCount: number;
  target?: number;
}

export function StatusBar({ wordCount, charCount, lineCount, target = 500 }: StatusBarProps) {
  const progress = Math.min((wordCount / target) * 100, 100);
  const isTargetMet = wordCount >= target;

  return (
    <div className="flex h-8 items-center justify-between border-t border-zinc-200 bg-white px-4 text-[10px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="opacity-50">WORDS</span>
          <span className="text-zinc-900 dark:text-zinc-100">{wordCount}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="opacity-50">CHARS</span>
          <span className="text-zinc-900 dark:text-zinc-100">{charCount}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="opacity-50">LINES</span>
          <span className="text-zinc-900 dark:text-zinc-100">{lineCount}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Target size={12} className={cn("opacity-50", isTargetMet && "text-green-500 opacity-100")} />
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div 
              className={cn("h-full bg-zinc-400 transition-all duration-500", isTargetMet && "bg-green-500")} 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={cn("opacity-50", isTargetMet && "text-green-500 opacity-100")}>
            {wordCount}/{target}
          </span>
          {isTargetMet && <CheckCircle2 size={12} className="text-green-500" />}
        </div>
        <div className="text-[9px] opacity-30">
          v{__APP_VERSION__}
        </div>
      </div>
    </div>
  );
}
