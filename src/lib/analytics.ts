import { format, isSameDay, startOfWeek, startOfMonth, subDays, differenceInDays } from "date-fns";

export interface Session {
  id: string;
  startTime: string;
  endTime: string;
  wordsWritten: number;
  date?: string;
  durationMinutes?: number;
}

export interface AnalyticsData {
  streak: {
    current: number;
    longest: number;
    lastWriteDate: string | null;
  };
  dailyWords: Record<string, number>;
  weeklyWords: number;
  monthlyWords: number;
  sessions: Session[];
  hourlyDistribution: Record<number, number>;
  dailyGoal: number;
}

let analyticsData: AnalyticsData = {
  streak: {
    current: 0,
    longest: 0,
    lastWriteDate: null,
  },
  dailyWords: {},
  weeklyWords: 0,
  monthlyWords: 0,
  sessions: [],
  hourlyDistribution: Array(24).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
  dailyGoal: 500,
};

export async function loadAnalytics() {
  try {
    const response = await fetch("/api/analytics");
    if (response.ok) {
      const data = await response.json();
      // Ensure all required properties exist to avoid "undefined" errors
      analyticsData = {
        streak: {
          current: data.streak?.current ?? 0,
          longest: data.streak?.longest ?? 0,
          lastWriteDate: data.streak?.lastWriteDate ?? null,
        },
        dailyWords: data.dailyWords ?? {},
        weeklyWords: data.weeklyWords ?? 0,
        monthlyWords: data.monthlyWords ?? 0,
        sessions: data.sessions ?? [],
        hourlyDistribution: data.hourlyDistribution ?? Array(24).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
        dailyGoal: data.dailyGoal ?? 500,
      };
    }
  } catch (error) {
    console.error("Failed to load analytics:", error);
  }
  return analyticsData;
}

export async function saveAnalytics() {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyticsData),
    });
  } catch (error) {
    console.error("Failed to save analytics:", error);
  }
}

export function trackSession(session: Session) {
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  const enrichedSession: Session = {
    ...session,
    date: dateStr,
    startTime: format(startTime, "HH:mm:ss"),
    endTime: format(endTime, "HH:mm:ss"),
    durationMinutes,
  };

  analyticsData.sessions.push(enrichedSession);
  
  // Update daily words
  analyticsData.dailyWords[dateStr] = (analyticsData.dailyWords[dateStr] || 0) + session.wordsWritten;

  // Update hourly distribution
  const hour = startTime.getHours();
  analyticsData.hourlyDistribution[hour] = (analyticsData.hourlyDistribution[hour] || 0) + session.wordsWritten;

  // Update streak
  const lastWrite = analyticsData.streak.lastWriteDate ? new Date(analyticsData.streak.lastWriteDate) : null;
  
  if (!lastWrite) {
    analyticsData.streak.current = 1;
    analyticsData.streak.longest = 1;
  } else if (!isSameDay(now, lastWrite)) {
    const diff = differenceInDays(now, lastWrite);
    if (diff === 1) {
      analyticsData.streak.current += 1;
    } else if (diff > 1) {
      analyticsData.streak.current = 1;
    }
    
    if (analyticsData.streak.current > analyticsData.streak.longest) {
      analyticsData.streak.longest = analyticsData.streak.current;
    }
  }
  
  analyticsData.streak.lastWriteDate = dateStr;

  // Update weekly/monthly totals
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  analyticsData.weeklyWords = analyticsData.sessions
    .filter(s => new Date(`${s.date}T${s.startTime}`) >= weekStart)
    .reduce((sum, s) => sum + s.wordsWritten, 0);

  analyticsData.monthlyWords = analyticsData.sessions
    .filter(s => new Date(`${s.date}T${s.startTime}`) >= monthStart)
    .reduce((sum, s) => sum + s.wordsWritten, 0);

  saveAnalytics();
}

let currentSessionWords = 0;

export function updateCurrentSession(words: number) {
  currentSessionWords = words;
}

export function getStats() {
  const now = new Date();
  
  // Ensure analyticsData properties are defined
  const dailyWords = analyticsData.dailyWords || {};
  const hourlyDistribution = analyticsData.hourlyDistribution || Array(24).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {});
  
  // Heatmap data (last 30 days)
  const heatmap: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const count = (dailyWords[dateStr] || 0) + (isSameDay(d, now) ? currentSessionWords : 0);
    heatmap.push({ date: dateStr, count });
  }

  const todayStr = format(now, "yyyy-MM-dd");

  return {
    todayWords: (dailyWords[todayStr] || 0) + currentSessionWords,
    weekWords: (analyticsData.weeklyWords || 0) + currentSessionWords,
    monthWords: (analyticsData.monthlyWords || 0) + currentSessionWords,
    streak: analyticsData.streak?.current || 0,
    longestStreak: analyticsData.streak?.longest || 0,
    heatmap,
    hourlyStats: Object.entries(hourlyDistribution).map(([hour, count]) => ({ 
      hour: parseInt(hour), 
      count: (count as number) + (hour === now.getHours().toString() ? currentSessionWords : 0)
    })),
    dailyGoal: analyticsData.dailyGoal || 500,
  };
}
