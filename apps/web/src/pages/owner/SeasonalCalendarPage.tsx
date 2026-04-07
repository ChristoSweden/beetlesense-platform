import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertTriangle,
  Bug,
  TreePine,
  FileText,
  TrendingUp,
  Wrench,
  Sprout,
} from 'lucide-react';
import {
  getTasksForMonth,
  getCompletedTaskIds,
  toggleTaskCompletion,
  getMonthlyTaskCounts,
  getOverdueTasks,
  MONTH_NAMES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  PRIORITY_COLORS,
  type SeasonalTask,
  type TaskCategory,
} from '@/services/seasonalTaskService';

const CATEGORY_ICONS: Record<TaskCategory, React.ReactNode> = {
  monitoring: <Bug size={14} />,
  harvesting: <TreePine size={14} />,
  planting: <Sprout size={14} />,
  maintenance: <Wrench size={14} />,
  regulatory: <FileText size={14} />,
  financial: <TrendingUp size={14} />,
};

export default function SeasonalCalendarPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => getCompletedTaskIds());
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  const tasks = useMemo(() => {
    const monthTasks = getTasksForMonth(selectedMonth);
    if (categoryFilter === 'all') return monthTasks;
    return monthTasks.filter(t => t.category === categoryFilter);
  }, [selectedMonth, categoryFilter]);

  const overdueTasks = useMemo(() => getOverdueTasks(), []);
  const monthlyCounts = useMemo(() => getMonthlyTaskCounts(), []);

  const handleToggle = useCallback((taskId: string) => {
    const newSet = toggleTaskCompletion(taskId);
    setCompletedIds(new Set(newSet));
  }, []);

  const completedCount = tasks.filter(t => completedIds.has(t.id)).length;
  const isCurrentMonth = selectedMonth === now.getMonth() + 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-500/10">
              <Calendar size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Seasonal Calendar</h1>
              <p className="text-[11px] text-[var(--text3)]">Monthly forestry tasks and reminders</p>
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && isCurrentMonth && (
          <div className="rounded-xl p-4 mb-5 border border-orange-200" style={{ background: '#fff7ed' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">{overdueTasks.length} overdue from last month</span>
            </div>
            {overdueTasks.slice(0, 2).map(t => (
              <p key={t.id} className="text-xs text-orange-700 ml-6">{t.title}</p>
            ))}
          </div>
        )}

        {/* Month selector */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ChevronLeft size={16} className="text-[var(--text2)]" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text)]">{MONTH_NAMES[selectedMonth - 1]}</h2>
            <p className="text-[10px] text-[var(--text3)]">
              {completedCount}/{tasks.length} completed
            </p>
          </div>
          <button
            onClick={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ChevronRight size={16} className="text-[var(--text2)]" />
          </button>
        </div>

        {/* Year overview (mini) */}
        <div className="grid grid-cols-12 gap-1 mb-5">
          {monthlyCounts.map(mc => {
            const isCurrent = mc.month === selectedMonth;
            return (
              <button
                key={mc.month}
                onClick={() => setSelectedMonth(mc.month)}
                className={`h-8 rounded text-[9px] font-medium transition-all ${
                  isCurrent ? 'bg-[var(--green)] text-white' : 'border border-[var(--border)] text-[var(--text3)] hover:border-[var(--green)]'
                }`}
                style={!isCurrent ? { background: 'var(--bg2)' } : undefined}
                title={`${MONTH_NAMES[mc.month - 1]}: ${mc.total} tasks`}
              >
                {MONTH_NAMES[mc.month - 1].slice(0, 1)}
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'all' ? 'bg-[var(--green)] text-white' : 'border border-[var(--border)] text-[var(--text3)]'
            }`}
            style={categoryFilter !== 'all' ? { background: 'var(--bg2)' } : undefined}
          >
            All
          </button>
          {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                categoryFilter === cat ? 'text-white' : 'border border-[var(--border)] text-[var(--text3)]'
              }`}
              style={categoryFilter === cat ? { background: CATEGORY_COLORS[cat] } : { background: 'var(--bg2)' }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {tasks.map(task => {
            const isDone = completedIds.has(task.id);
            return (
              <div
                key={task.id}
                className={`rounded-xl p-4 border transition-all ${isDone ? 'border-[var(--border)] opacity-60' : 'border-[var(--border)]'}`}
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle size={18} className="text-[var(--green)]" />
                    ) : (
                      <Circle size={18} className="text-[var(--text3)]" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: CATEGORY_COLORS[task.category] }}>{CATEGORY_ICONS[task.category]}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ color: PRIORITY_COLORS[task.priority], background: `${PRIORITY_COLORS[task.priority]}15` }}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${isDone ? 'line-through text-[var(--text3)]' : 'text-[var(--text)]'}`}>
                      {task.title}
                    </h3>
                    <p className="text-xs text-[var(--text3)] leading-relaxed">{task.description}</p>
                    {task.actionUrl && !isDone && (
                      <Link
                        to={task.actionUrl}
                        className="inline-block mt-2 text-[10px] font-semibold text-[var(--green)] hover:underline"
                      >
                        Go to tool &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="rounded-xl p-8 border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
              <Calendar size={24} className="text-[var(--text3)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text3)]">No tasks for this filter.</p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-6 italic">
          Tasks are tailored for Swedish forestry. Adjust timing based on your region and local conditions.
        </p>
      </div>
    </div>
  );
}
