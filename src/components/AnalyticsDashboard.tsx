import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { Flame, TrendingUp, Clock, FileText, Calendar, X, BarChart2 } from "lucide-react";
import { getStats } from "../lib/analytics";
import { cn } from "../lib/utils";

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const stats = useMemo(() => getStats(), [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/30">
              <BarChart2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Writing Analytics</h2>
              <p className="text-xs text-zinc-500">Track your progress and build habits.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {/* Stats Cards */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-950/30">
                <Flame size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Current Streak</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.streak} Days</p>
              <p className="mt-2 text-xs text-zinc-500">Longest: {stats.longestStreak} days</p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950/30">
                <TrendingUp size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Words Today</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.todayWords}</p>
              <p className="mt-2 text-xs text-zinc-500">This week: {stats.weekWords}</p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-500 dark:bg-green-950/30">
                <FileText size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">This Month</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.monthWords}</p>
              <p className="mt-2 text-xs text-zinc-500">Total words written</p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-500 dark:bg-purple-950/30">
                <Clock size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Best Time</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.hourlyStats.sort((a, b) => b.count - a.count)[0]?.hour}:00
              </p>
              <p className="mt-2 text-xs text-zinc-500">Peak productivity hour</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Heatmap */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-6 flex items-center space-x-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Calendar size={18} className="text-zinc-400" />
                <span>Last 30 Days Activity</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.heatmap}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), "MMM d")}
                      tick={{ fontSize: 10, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      labelFormatter={(val) => format(parseISO(val as string), "MMMM d, yyyy")}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.heatmap.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.count > 0 ? "#f27d26" : "#f4f4f5"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Stats */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-6 flex items-center space-x-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Clock size={18} className="text-zinc-400" />
                <span>Writing Time Distribution</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hourlyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(val) => `${val}:00`}
                      tick={{ fontSize: 10, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      labelFormatter={(val) => `${val}:00`}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
