import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  GitCompare,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Info,
  Sparkles,
  Send,
  Bot,
  User,
  AlertCircle,
  RotateCcw,
  Flame,
  Trash2,
} from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';
import {
  getMonthlyReport,
  getComparisonReport,
  getMonthDisplayName,
  calculateFourTiles,
} from '../domain/historicalReport';
import { Priority, PRIORITY_OPTIONS, ChatMessage } from '../types';
import { FormattedMarkdown } from '../components/FormattedMarkdown';

export const ReportsView: React.FC = () => {
  const {
    tasks,
    history,
    categories,
    dataVersion,
    todayStr,
    geminiMessages,
    setGeminiMessages,
    clearGeminiChat,
  } = useMomentum();

  // Active report sub-tab: 'dashboard' | 'comparison' | 'detailed'
  const [reportTab, setReportTab] = useState<'dashboard' | 'comparison' | 'detailed'>('dashboard');

  // Month selection (defaults to current month YYYY-MM)
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const prevMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [compMonthA, setCompMonthA] = useState<string>(currentMonthStr);
  const [compMonthB, setCompMonthB] = useState<string>(prevMonthStr);

  // Gemini Chat UI State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Available months list for picker
  const availableMonths = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${yr}-${mo}`);
    }
    return list;
  }, []);

  // 1. Calculate the 4 Prominent Tiles
  const fourTiles = useMemo(() => {
    return calculateFourTiles(tasks, history, todayStr, selectedMonth);
  }, [tasks, history, todayStr, selectedMonth, dataVersion]);

  // 2. Compute Reconstructed Monthly Stats
  const singleMonthResult = useMemo(() => {
    return getMonthlyReport(selectedMonth, reportTab === 'detailed' ? 'detailed' : 'quick');
  }, [selectedMonth, reportTab, dataVersion]);

  const comparisonResult = useMemo(() => {
    if (reportTab !== 'comparison') return null;
    return getComparisonReport(compMonthA, compMonthB);
  }, [compMonthA, compMonthB, reportTab, dataVersion]);

  const stats = singleMonthResult?.stats;

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [geminiMessages, isAiLoading]);

  // Handle Gemini Chat message send
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...geminiMessages, userMsg];
    setGeminiMessages(newHistory);
    setInputPrompt('');
    setIsAiLoading(true);
    setAiError(null);

    // Prepare live context data for Gemini
    const contextData = {
      fourTiles,
      selectedMonth,
      monthStats: stats
        ? {
            month: stats.monthName,
            tasksCreated: stats.tasksCreated,
            tasksCompleted: stats.tasksCompleted,
            unfinishedTasks: stats.unfinishedTasks,
            postponedTasks: stats.postponedTasks,
            completionRate: stats.completionRate,
            priorityBreakdown: stats.priorityBreakdown,
            categoryBreakdown: stats.categoryBreakdown,
            topAccomplishments: stats.accomplishments.slice(0, 5).map((a) => a.title),
          }
        : null,
      activePendingCount: tasks.filter((t) => t.status !== 'COMPLETED').length,
    };

    try {
      const res = await fetch('/api/gemini/reports-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          contextData,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        role: 'assistant',
        content: data.text || 'Analysis complete.',
        timestamp: Date.now(),
      };
      setGeminiMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Unable to connect to Gemini 3.8 Flash service.';
      setAiError(errMsg);
      const fallbackMsg: ChatMessage = {
        id: 'bot_err_' + Date.now(),
        role: 'assistant',
        content:
          "I couldn't reach the Gemini 3.8 Flash API. Please ensure your GEMINI_API_KEY is configured in the AI Studio Secrets panel. Meanwhile, your local offline statistics above remain 100% active and accurate.",
        timestamp: Date.now(),
      };
      setGeminiMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const quickPromptChips = [
    'Analyze my completion rates and bottlenecks',
    'How should I prioritize my Present 1 tasks?',
    'Give me a weekly recovery plan',
    'Summarize my accomplishments this month',
  ];

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header & Month Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Productivity & Historical Reports
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Offline historical metrics reconstructed from timestamped task logs.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none min-h-[38px]"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {getMonthDisplayName(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================
          THE 4 REQUIRED TILES:
          1. Daily Completion Rate
          2. Weekly Completion Rate
          3. Monthly Completion Rate
          4. No of Unfinished Tasks (Present 1, Present 5, Later 1, Later 5)
         ======================================================== */}
      <section aria-label="Core Performance Tiles" className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Core Velocity & Completion Rates
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tile 1: Daily Completion Rate */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Daily Completion Rate
              </span>
              <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {fourTiles.daily.rate}%
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">today</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {fourTiles.daily.completed} of {fourTiles.daily.total} completed today
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-elevated)] overflow-hidden mt-3">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, fourTiles.daily.rate))}%` }}
              />
            </div>
          </div>

          {/* Tile 2: Weekly Completion Rate */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Weekly Completion Rate
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {fourTiles.weekly.rate}%
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">7-day</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {fourTiles.weekly.completed} completed this past week
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-elevated)] overflow-hidden mt-3">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, fourTiles.weekly.rate))}%` }}
              />
            </div>
          </div>

          {/* Tile 3: Monthly Completion Rate */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Monthly Completion Rate
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fourTiles.monthly.rate}%
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  {getMonthDisplayName(selectedMonth).split(' ')[0]}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                {fourTiles.monthly.completed} finished of {fourTiles.monthly.total} total volume
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-elevated)] overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, fourTiles.monthly.rate))}%` }}
              />
            </div>
          </div>

          {/* Tile 4: Number of Unfinished Tasks with Present1, Present5, Later1, Later5 */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Unfinished Tasks
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">
                  {fourTiles.unfinished.total}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">active pending</span>
              </div>

              {/* Exact breakdown: Present 1, Present 5, Later 1, Later 5 */}
              <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)]">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Present 1:</span>
                  <span className="font-bold tabular-nums text-[var(--text-primary)]">
                    {fourTiles.unfinished.present1}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)]">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Present 5:</span>
                  <span className="font-bold tabular-nums text-[var(--text-primary)]">
                    {fourTiles.unfinished.present5}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)]">
                  <span className="font-semibold text-sky-700 dark:text-sky-400">Later 1:</span>
                  <span className="font-bold tabular-nums text-[var(--text-primary)]">
                    {fourTiles.unfinished.later1}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)]">
                  <span className="font-semibold text-[var(--text-muted)]">Later 5:</span>
                  <span className="font-bold tabular-nums text-[var(--text-primary)]">
                    {fourTiles.unfinished.later5}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          GEMINI CHAT FEATURE: Powered by gemini-3.8-flash
         ======================================================== */}
      <section
        aria-label="Gemini Flash 3.8 Productivity Intelligence"
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs space-y-3 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Gemini 3.8 Flash Productivity Advisor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  gemini-3.8-flash
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Ask questions about your completion rates, priority bottlenecks, and execution trends.
              </p>
            </div>
          </div>

          {/* Specific Button to Clear Gemini Chat */}
          <button
            type="button"
            onClick={clearGeminiChat}
            title="Clear Gemini chat history"
            aria-label="Clear chat"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[var(--border-subtle)] transition-colors min-h-[32px] shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {quickPromptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={isAiLoading}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors whitespace-nowrap min-h-[32px] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Messages Log */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 py-1">
          {geminiMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 text-xs ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    isUser
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-tr-xs'
                      : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <FormattedMarkdown content={msg.content} />
                  )}
                </div>
                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-[var(--text-secondary)] text-[var(--bg-surface)] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isAiLoading && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-2">
              <Bot className="w-4 h-4 animate-bounce" />
              <span className="font-medium animate-pulse">
                Gemini 3.8 Flash is analyzing your reports and task logs...
              </span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isAiLoading}
            placeholder="Ask Gemini 3.8 Flash about your productivity data..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-h-[44px]"
          />
          <button
            type="submit"
            disabled={isAiLoading || !inputPrompt.trim()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors shrink-0 disabled:opacity-50"
            aria-label="Send message to Gemini"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* ========================================================
          SUB-SECTIONS:
          1. Priority Workload Distribution
          2. Category Performance & Delivery
          3. Accomplishments Ledger (Finished this month)
          4. Detailed Historical Event Timeline / Month Comparison
         ======================================================== */}
      <section className="space-y-4">
        {/* Navigation Tabs for Sub-sections */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                reportTab === 'dashboard'
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Overview & Workload
            </button>
            <button
              onClick={() => setReportTab('detailed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                reportTab === 'detailed'
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Detailed Event Log
            </button>
            <button
              onClick={() => setReportTab('comparison')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[36px] ${
                reportTab === 'comparison'
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Month Comparison
            </button>
          </div>

          {singleMonthResult && (
            <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
              Cache: {singleMonthResult.isFromCache ? 'Hit (Instant)' : 'Recomputed v' + dataVersion}
            </span>
          )}
        </div>

        {/* Tab 1: Overview & Workload */}
        {reportTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Priority Workload Distribution */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Priority Workload Matrix ({stats.monthName})
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Completed vs active workload across the four mandatory priority tiers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {PRIORITY_OPTIONS.map((p) => {
                  const data = stats.priorityBreakdown[p];
                  const total = data.completed + data.active;
                  const rate = total > 0 ? Math.round((data.completed / total) * 100) : 0;

                  return (
                    <div
                      key={p}
                      className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{p}</span>
                        <span className="text-xs font-bold text-[var(--accent-primary)] tabular-nums">
                          {rate}% completed
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Finished: {data.completed}</span>
                        <span>Active Unfinished: {data.active}</span>
                        <span>Created: {data.created}</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Productivity & Bottlenecks */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Category Distribution & Delivery
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Breakdown of tasks accomplished versus tasks initiated per category.
                </p>
              </div>

              <div className="space-y-2.5">
                {Object.entries(stats.categoryBreakdown).map(([catId, catInfo]) => {
                  if (catInfo.completed === 0 && catInfo.created === 0) return null;
                  return (
                    <div
                      key={catId}
                      className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {catInfo.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Created in month: {catInfo.created}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {catInfo.completed} completed
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accomplishments Ledger */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Accomplishments Ledger ({stats.accomplishments.length})
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Verified tasks completed during {stats.monthName}.
                  </p>
                </div>
              </div>

              {stats.accomplishments.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                  No completed accomplishments recorded in {stats.monthName}.
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.accomplishments.map((item, idx) => (
                    <div
                      key={`${item.id}_${idx}`}
                      className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {item.title}
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {item.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.priority}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.categoryName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {new Date(item.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Event Log */}
        {reportTab === 'detailed' && stats && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Chronological Event Log for {stats.monthName} ({stats.timelineEvents.length})
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Immutable event stream during this calendar month window.
              </p>
            </div>

            {stats.timelineEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">
                No events recorded during this month.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {stats.timelineEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="tabular-nums">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-1 truncate">
                      {evt.taskTitle}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {evt.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Month Comparison */}
        {reportTab === 'comparison' && comparisonResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Base Month:</span>
                <select
                  value={compMonthA}
                  onChange={(e) => setCompMonthA(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] min-h-[38px]"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {getMonthDisplayName(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Compare To:</span>
                <select
                  value={compMonthB}
                  onChange={(e) => setCompMonthB(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] min-h-[38px]"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {getMonthDisplayName(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Deltas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Completed</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                    {comparisonResult.comparison.monthA.tasksCompleted}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    vs {comparisonResult.comparison.monthB.tasksCompleted}
                  </span>
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1 ${
                    comparisonResult.comparison.deltaCompleted >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600'
                  }`}
                >
                  {comparisonResult.comparison.deltaCompleted >= 0 ? '+' : ''}
                  {comparisonResult.comparison.deltaCompleted} delta
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Completion Rate</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-bold text-[var(--accent-primary)] tabular-nums">
                    {comparisonResult.comparison.monthA.completionRate}%
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    vs {comparisonResult.comparison.monthB.completionRate}%
                  </span>
                </div>
                <p
                  className={`text-[11px] font-semibold mt-1 ${
                    comparisonResult.comparison.deltaCompletionRate >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600'
                  }`}
                >
                  {comparisonResult.comparison.deltaCompletionRate >= 0 ? '+' : ''}
                  {comparisonResult.comparison.deltaCompletionRate}% delta
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Tasks Created</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                    {comparisonResult.comparison.monthA.tasksCreated}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    vs {comparisonResult.comparison.monthB.tasksCreated}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                  {comparisonResult.comparison.deltaCreated >= 0 ? '+' : ''}
                  {comparisonResult.comparison.deltaCreated} delta
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">Postponed</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                    {comparisonResult.comparison.monthA.postponedTasks}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    vs {comparisonResult.comparison.monthB.postponedTasks}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-1">
                  {comparisonResult.comparison.deltaPostponed >= 0 ? '+' : ''}
                  {comparisonResult.comparison.deltaPostponed} delta
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
