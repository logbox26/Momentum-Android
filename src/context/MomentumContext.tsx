import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  TaskEntity,
  TaskHistoryEntity,
  CategoryEntity,
  ThemeId,
  Priority,
  BackupPayload,
  ChatMessage,
} from '../types';
import { MomentumRepository, getTodayString } from '../db/storage';

interface MomentumContextValue {
  tasks: TaskEntity[];
  categories: CategoryEntity[];
  history: TaskHistoryEntity[];
  currentTheme: ThemeId;
  deviceFrameEnabled: boolean;
  activeTab: 'home' | 'reports' | 'settings';
  dataVersion: number;
  todayStr: string;

  // Gemini Chat Persistence & Clear
  geminiMessages: ChatMessage[];
  setGeminiMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearGeminiChat: () => void;

  // Filtered Task Groups
  tasksCompletedToday: TaskEntity[];
  tasksDueToday: TaskEntity[];
  pendingTasks: TaskEntity[];
  completedTasks: TaskEntity[];

  // Task Actions
  createTask: (data: {
    title: string;
    notes: string;
    dueDate: string;
    priority: Priority;
    categoryId: string | null;
  }) => TaskEntity;
  updateTask: (
    taskId: string,
    updates: Partial<Omit<TaskEntity, 'id' | 'createdDate'>>
  ) => TaskEntity;
  completeTask: (taskId: string) => void;
  reopenTask: (taskId: string) => void;
  postponeTask: (taskId: string, newDueDate: string, reason?: string) => void;
  deleteTask: (taskId: string) => boolean;

  // Category Actions
  createCategory: (name: string, colorHex?: string) => CategoryEntity;
  renameCategory: (id: string, newName: string) => CategoryEntity;
  deleteCategorySafely: (id: string) => { affectedTasksCount: number };

  // Theme & Navigation
  setTheme: (theme: ThemeId) => void;
  toggleDeviceFrame: () => void;
  setActiveTab: (tab: 'home' | 'reports' | 'settings') => void;

  // Backup & Maintenance
  restoreBackup: (payload: BackupPayload) => {
    success: boolean;
    tasksRestored: number;
    historyRestored: number;
    categoriesRestored: number;
  };
  refreshData: () => void;
}

const MomentumContext = createContext<MomentumContextValue | null>(null);

export const MomentumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repo = useMemo(() => MomentumRepository.getInstance(), []);

  const [tasks, setTasks] = useState<TaskEntity[]>(() => repo.getTasks());
  const [categories, setCategories] = useState<CategoryEntity[]>(() => repo.getCategories());
  const [history, setHistory] = useState<TaskHistoryEntity[]>(() => repo.getHistory());
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(() => repo.getTheme());
  const [dataVersion, setDataVersion] = useState<number>(() => repo.getDataVersion());
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'settings'>('home');
  const [deviceFrameEnabled, setDeviceFrameEnabled] = useState<boolean>(() => {
    const s = repo.getSettings();
    return s.deviceFrame !== 'false';
  });

  const DEFAULT_INITIAL_CHAT_MESSAGE: ChatMessage = {
    id: 'init_1',
    role: 'assistant',
    content:
      "Hello! I'm your Momentum Productivity Advisor powered by **Gemini 3.8 Flash**. I've analyzed your daily, weekly, and monthly rates alongside your Present and Later unfinished tasks. What insights or recommendations would you like?",
    timestamp: Date.now(),
  };

  const [geminiMessages, setGeminiMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('momentum_gemini_chat_v1');
      return saved ? JSON.parse(saved) : [DEFAULT_INITIAL_CHAT_MESSAGE];
    } catch {
      return [DEFAULT_INITIAL_CHAT_MESSAGE];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('momentum_gemini_chat_v1', JSON.stringify(geminiMessages));
    } catch {
      // Storage quota safety
    }
  }, [geminiMessages]);

  const clearGeminiChat = useCallback(() => {
    const fresh: ChatMessage[] = [
      {
        id: 'init_' + Date.now(),
        role: 'assistant',
        content:
          "Chat cleared. I'm ready to answer any questions about your Momentum reports, completion rates, or task bottlenecks.",
        timestamp: Date.now(),
      },
    ];
    setGeminiMessages(fresh);
    try {
      localStorage.setItem('momentum_gemini_chat_v1', JSON.stringify(fresh));
    } catch {
      // Ignore
    }
  }, []);

  const todayStr = useMemo(() => getTodayString(), []);

  // Sync theme attribute on document.body for CSS variable propagation
  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'deep-focus') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  const refreshData = useCallback(() => {
    setTasks(repo.getTasks());
    setCategories(repo.getCategories());
    setHistory(repo.getHistory());
    setDataVersion(repo.getDataVersion());
  }, [repo]);

  const setTheme = useCallback(
    (newTheme: ThemeId) => {
      repo.setTheme(newTheme);
      setCurrentThemeState(newTheme);
    },
    [repo]
  );

  const toggleDeviceFrame = useCallback(() => {
    setDeviceFrameEnabled((prev) => {
      const next = !prev;
      const s = repo.getSettings();
      s.deviceFrame = String(next);
      localStorage.setItem('momentum_settings_v1', JSON.stringify(s));
      return next;
    });
  }, [repo]);

  // Tasks completed today (for the prominent "Tasks Did Today" card)
  const tasksCompletedToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startMs = todayStart.getTime();

    const uniqueCompletedTasks = new Map<string, TaskEntity>();
    tasks.forEach((t) => {
      if (t.status === 'COMPLETED' && t.completedAt && t.completedAt >= startMs) {
        uniqueCompletedTasks.set(t.id, t);
      }
    });
    return Array.from(uniqueCompletedTasks.values());
  }, [tasks]);

  // Tasks due today (pending or postponed, scheduled for today)
  const tasksDueToday = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'COMPLETED') return false;
      return t.dueDate === todayStr;
    });
  }, [tasks, todayStr]);

  // All pending & upcoming tasks (excluding completed)
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'COMPLETED');
  }, [tasks]);

  // All completed tasks
  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'COMPLETED')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [tasks]);

  // Task Actions
  const createTask = useCallback(
    (data: {
      title: string;
      notes: string;
      dueDate: string;
      priority: Priority;
      categoryId: string | null;
    }) => {
      const created = repo.createTask(data);
      refreshData();
      return created;
    },
    [repo, refreshData]
  );

  const updateTask = useCallback(
    (taskId: string, updates: Partial<Omit<TaskEntity, 'id' | 'createdDate'>>) => {
      const updated = repo.updateTask(taskId, updates);
      refreshData();
      return updated;
    },
    [repo, refreshData]
  );

  const completeTask = useCallback(
    (taskId: string) => {
      repo.completeTask(taskId);
      refreshData();
    },
    [repo, refreshData]
  );

  const reopenTask = useCallback(
    (taskId: string) => {
      repo.reopenTask(taskId);
      refreshData();
    },
    [repo, refreshData]
  );

  const postponeTask = useCallback(
    (taskId: string, newDueDate: string, reason?: string) => {
      repo.postponeTask(taskId, newDueDate, reason);
      refreshData();
    },
    [repo, refreshData]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const res = repo.deleteTask(taskId);
      refreshData();
      return res;
    },
    [repo, refreshData]
  );

  // Category Actions
  const createCategory = useCallback(
    (name: string, colorHex?: string) => {
      const cat = repo.createCategory(name, colorHex);
      refreshData();
      return cat;
    },
    [repo, refreshData]
  );

  const renameCategory = useCallback(
    (id: string, newName: string) => {
      const cat = repo.renameCategory(id, newName);
      refreshData();
      return cat;
    },
    [repo, refreshData]
  );

  const deleteCategorySafely = useCallback(
    (id: string) => {
      const res = repo.deleteCategorySafely(id);
      refreshData();
      return res;
    },
    [repo, refreshData]
  );

  const restoreBackup = useCallback(
    (payload: BackupPayload) => {
      const res = repo.importFullBackup(payload);
      if (res.success) {
        refreshData();
        setCurrentThemeState(repo.getTheme());
      }
      return res;
    },
    [repo, refreshData]
  );

  return (
    <MomentumContext.Provider
      value={{
        tasks,
        categories,
        history,
        currentTheme,
        deviceFrameEnabled,
        activeTab,
        dataVersion,
        todayStr,
        geminiMessages,
        setGeminiMessages,
        clearGeminiChat,
        tasksCompletedToday,
        tasksDueToday,
        pendingTasks,
        completedTasks,
        createTask,
        updateTask,
        completeTask,
        reopenTask,
        postponeTask,
        deleteTask,
        createCategory,
        renameCategory,
        deleteCategorySafely,
        setTheme,
        toggleDeviceFrame,
        setActiveTab,
        restoreBackup,
        refreshData,
      }}
    >
      {children}
    </MomentumContext.Provider>
  );
};

export function useMomentum(): MomentumContextValue {
  const context = useContext(MomentumContext);
  if (!context) {
    throw new Error('useMomentum must be used within a MomentumProvider');
  }
  return context;
}
