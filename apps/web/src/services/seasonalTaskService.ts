/**
 * Seasonal Task Service
 * Pre-populated calendar of forestry tasks for Swedish forest owners.
 * 40+ tasks across the full year, covering monitoring, harvesting, planting,
 * maintenance, regulatory, and financial categories.
 */

export type TaskCategory = 'monitoring' | 'harvesting' | 'planting' | 'maintenance' | 'regulatory' | 'financial';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface SeasonalTask {
  id: string;
  month: number; // 1-12
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  applicableSpecies?: string[];
  conditionBased?: string;
  actionUrl?: string;
  icon: string; // lucide icon name
}

const STORAGE_KEY = 'beetlesense-seasonal-completed';

/* ─── Task Database ─── */

const ALL_TASKS: SeasonalTask[] = [
  // ══════ January ══════
  {
    id: 'jan-01',
    month: 1,
    title: 'Review your forest plan',
    description: 'Start the year by reviewing your skogsbruksplan. Check if planned activities match current conditions and update any changes from the previous year.',
    category: 'maintenance',
    priority: 'medium',
    actionUrl: '/owner/forest-plan',
    icon: 'FileText',
  },
  {
    id: 'jan-02',
    month: 1,
    title: 'Check for snow damage after storms',
    description: 'Heavy snow can break branches and topple trees. Walk your parcels after major storms and document any damage for insurance claims.',
    category: 'monitoring',
    priority: 'high',
    actionUrl: '/owner/storm-risk',
    icon: 'AlertTriangle',
  },
  {
    id: 'jan-03',
    month: 1,
    title: 'Plan spring activities',
    description: 'Map out planting, thinning, and road maintenance for the spring months. Book contractors early — they fill up fast.',
    category: 'maintenance',
    priority: 'low',
    actionUrl: '/owner/calendar',
    icon: 'CalendarDays',
  },
  {
    id: 'jan-04',
    month: 1,
    title: 'Winter harvesting on frozen ground',
    description: 'Frozen ground allows harvesting in wet areas without damaging soil. Coordinate with your contractor for optimal conditions.',
    category: 'harvesting',
    priority: 'medium',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Axe',
  },

  // ══════ February ══════
  {
    id: 'feb-01',
    month: 2,
    title: 'Order seedlings for spring planting',
    description: 'Contact your nursery now to reserve seedlings. Spruce and pine varieties take time to prepare. Specify site-adapted provenances for your region.',
    category: 'planting',
    priority: 'high',
    actionUrl: '/owner/forest-profile',
    icon: 'Sprout',
  },
  {
    id: 'feb-02',
    month: 2,
    title: 'Review timber market trends',
    description: 'Check current and forecast timber prices before planning any harvests. Market timing can significantly affect your income.',
    category: 'financial',
    priority: 'medium',
    actionUrl: '/owner/timber-market',
    icon: 'TrendingUp',
  },
  {
    id: 'feb-03',
    month: 2,
    title: 'File tax documents',
    description: 'Deadline for Swedish tax declarations is approaching. Gather all forestry income, expenses, and capital gains records from last year.',
    category: 'financial',
    priority: 'high',
    actionUrl: '/owner/profit-tracker',
    icon: 'FileText',
  },
  {
    id: 'feb-04',
    month: 2,
    title: 'Check EUDR documentation',
    description: 'EU Deforestation Regulation requires chain-of-custody records. Verify your parcel geolocation data and due diligence statements are current.',
    category: 'regulatory',
    priority: 'medium',
    actionUrl: '/owner/eudr-compliance',
    icon: 'Shield',
  },

  // ══════ March ══════
  {
    id: 'mar-01',
    month: 3,
    title: 'Inspect roads for frost damage',
    description: 'Spring thaw creates frost heaves and soft spots. Walk your forest roads and mark areas needing repair before heavy machinery arrives.',
    category: 'maintenance',
    priority: 'high',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Route',
  },
  {
    id: 'mar-02',
    month: 3,
    title: 'Set up beetle traps',
    description: 'Deploy pheromone traps along south-facing spruce edges. BeetleSense can guide optimal placement based on last year\'s hotspots.',
    category: 'monitoring',
    priority: 'high',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/microclimate',
    icon: 'Bug',
  },
  {
    id: 'mar-03',
    month: 3,
    title: 'Monitor degree-day accumulation',
    description: 'Bark beetles start flying once degree-days exceed ~400°C. Track the BeetleSense degree-day counter — swarming season is approaching.',
    category: 'monitoring',
    priority: 'medium',
    conditionBased: 'Show when degree-days tracking starts',
    actionUrl: '/owner/microclimate',
    icon: 'Thermometer',
  },

  // ══════ April ══════
  {
    id: 'apr-01',
    month: 4,
    title: 'CRITICAL — Check spruce edges for bore dust',
    description: 'Inspect south-facing spruce stand edges for bore dust (borrspån). Early detection can save entire stands. Look at trunk base and under bark flaps.',
    category: 'monitoring',
    priority: 'high',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/microclimate',
    icon: 'Bug',
  },
  {
    id: 'apr-02',
    month: 4,
    title: 'Begin daily bark beetle monitoring',
    description: 'If degree-days are rising fast, increase your monitoring frequency. Check BeetleSense beetle forecast daily and set alert thresholds.',
    category: 'monitoring',
    priority: 'high',
    conditionBased: 'Show only if degree-days > 400',
    actionUrl: '/owner/microclimate',
    icon: 'AlertTriangle',
  },
  {
    id: 'apr-03',
    month: 4,
    title: 'Spring road maintenance',
    description: 'Grade and fill potholes on your forest roads. Ensure drainage ditches are clear before the wet season. Good roads = lower transport costs.',
    category: 'maintenance',
    priority: 'medium',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Route',
  },
  {
    id: 'apr-04',
    month: 4,
    title: 'Review satellite imagery for winter damage',
    description: 'New satellite passes reveal storm damage, snow break, and early signs of stress. Compare with autumn baseline images in BeetleSense.',
    category: 'monitoring',
    priority: 'medium',
    actionUrl: '/owner/satellite-check',
    icon: 'Satellite',
  },

  // ══════ May ══════
  {
    id: 'may-01',
    month: 5,
    title: 'PEAK BEETLE RISK — Daily monitoring required',
    description: 'This is the highest-risk month for bark beetle attack. Monitor all spruce parcels daily. If DD > 500, swarming is active. Act immediately on any bore dust.',
    category: 'monitoring',
    priority: 'high',
    conditionBased: 'Show only if degree-days > 500',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/microclimate',
    icon: 'Bug',
  },
  {
    id: 'may-02',
    month: 5,
    title: 'Fell infested trees immediately',
    description: 'Any tree with fresh bore dust must be felled and removed within 3 weeks to prevent beetle reproduction. Contact your contractor urgently.',
    category: 'harvesting',
    priority: 'high',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/book-contractor',
    icon: 'Axe',
  },
  {
    id: 'may-03',
    month: 5,
    title: 'Planting window opens',
    description: 'Soil temperature is now suitable for planting. Plant seedlings as soon as conditions allow. Early planting gives the best first-year survival.',
    category: 'planting',
    priority: 'high',
    actionUrl: '/owner/forest-profile',
    icon: 'Sprout',
  },
  {
    id: 'may-04',
    month: 5,
    title: 'File avverkningsanmälan for autumn harvest',
    description: 'If you plan to harvest more than 0.5 ha this autumn, file your harvesting notification now. Skogsstyrelsen requires 6 weeks lead time.',
    category: 'regulatory',
    priority: 'high',
    actionUrl: '/owner/avverkningsanmalan',
    icon: 'FileText',
  },

  // ══════ June ══════
  {
    id: 'jun-01',
    month: 6,
    title: 'Continue beetle monitoring — 2nd swarming possible',
    description: 'A second bark beetle swarming wave can occur in warm years. Keep checking traps and spruce edges, especially after warm spells.',
    category: 'monitoring',
    priority: 'high',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/microclimate',
    icon: 'Bug',
  },
  {
    id: 'jun-02',
    month: 6,
    title: 'Thinning window — improve stand quality',
    description: 'June is good for commercial thinning. Remove suppressed and damaged trees to improve growth on remaining stems. Revenues cover costs in mature stands.',
    category: 'harvesting',
    priority: 'medium',
    actionUrl: '/owner/harvest-logistics',
    icon: 'TreePine',
  },
  {
    id: 'jun-03',
    month: 6,
    title: 'Apply for environmental subsidies',
    description: 'Skogsstyrelsen offers grants for nature conservation, forest roads, and climate adaptation. Application windows open now — check eligibility.',
    category: 'financial',
    priority: 'medium',
    actionUrl: '/owner/forest-finance',
    icon: 'Banknote',
  },
  {
    id: 'jun-04',
    month: 6,
    title: 'Check replanting obligations',
    description: 'Under Skogsvårdslagen §6, you must replant within 3 years of felling. Review any parcels harvested in 2023 — the clock is ticking.',
    category: 'regulatory',
    priority: 'medium',
    actionUrl: '/owner/compliance',
    icon: 'ClipboardCheck',
  },

  // ══════ July ══════
  {
    id: 'jul-01',
    month: 7,
    title: 'Summer monitoring — reduced but not zero risk',
    description: 'Beetle risk decreases but doesn\'t disappear. Check monthly, especially after heat waves. New infestations can still start in warm microclimates.',
    category: 'monitoring',
    priority: 'medium',
    actionUrl: '/owner/microclimate',
    icon: 'Bug',
  },
  {
    id: 'jul-02',
    month: 7,
    title: 'Plan autumn harvest operations',
    description: 'Review which compartments are ready for harvest. Get quotes from contractors and plan logistics. Autumn is the busiest season.',
    category: 'harvesting',
    priority: 'medium',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Axe',
  },
  {
    id: 'jul-03',
    month: 7,
    title: 'Check fire risk during dry spells',
    description: 'July heat can create extreme fire conditions. Monitor the BeetleSense fire risk index. Restrict machinery use in dry periods. Keep firefighting equipment accessible.',
    category: 'monitoring',
    priority: 'high',
    actionUrl: '/owner/fire-risk',
    icon: 'Flame',
  },

  // ══════ August ══════
  {
    id: 'aug-01',
    month: 8,
    title: 'Prepare harvest roads',
    description: 'Autumn rains will soften the ground. Reinforce road surfaces and drainage now. Proper preparation prevents costly rutting damage.',
    category: 'maintenance',
    priority: 'high',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Route',
  },
  {
    id: 'aug-02',
    month: 8,
    title: 'Review carbon credit opportunities',
    description: 'Check your forest\'s carbon sequestration rate. Voluntary carbon markets are growing — your older stands may qualify for carbon credits.',
    category: 'financial',
    priority: 'low',
    actionUrl: '/owner/carbon',
    icon: 'Leaf',
  },
  {
    id: 'aug-03',
    month: 8,
    title: 'Book contractors for autumn harvesting',
    description: 'September-November is peak harvest season. If you haven\'t booked a harvester and forwarder yet, do it now — the good operators fill up fast.',
    category: 'harvesting',
    priority: 'high',
    actionUrl: '/owner/book-contractor',
    icon: 'Axe',
  },

  // ══════ September ══════
  {
    id: 'sep-01',
    month: 9,
    title: 'Autumn harvesting begins',
    description: 'Conditions are ideal: dry ground, cooling temperatures, and daylight. Supervise the first loads and check that operators follow your instructions.',
    category: 'harvesting',
    priority: 'high',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Axe',
  },
  {
    id: 'sep-02',
    month: 9,
    title: 'Check storm preparedness',
    description: 'Autumn storms start now. Review your insurance coverage and ensure vulnerable parcels (tall thin stands, recently thinned areas) are identified.',
    category: 'maintenance',
    priority: 'medium',
    actionUrl: '/owner/storm-risk',
    icon: 'AlertTriangle',
  },
  {
    id: 'sep-03',
    month: 9,
    title: 'File subsidy applications — deadline approaching',
    description: 'Many Skogsstyrelsen subsidies have September 30 deadlines. Submit your applications for nature conservation, road grants, or climate measures now.',
    category: 'regulatory',
    priority: 'high',
    actionUrl: '/owner/forest-finance',
    icon: 'FileText',
  },
  {
    id: 'sep-04',
    month: 9,
    title: 'Verify beetle damage in satellite images',
    description: 'Late-summer satellite passes reveal cumulative beetle damage as canopy browning. Compare with spring baseline to quantify any losses.',
    category: 'monitoring',
    priority: 'medium',
    applicableSpecies: ['spruce', 'gran'],
    actionUrl: '/owner/satellite-check',
    icon: 'Satellite',
  },

  // ══════ October ══════
  {
    id: 'oct-01',
    month: 10,
    title: 'Continue harvesting — optimal conditions',
    description: 'October offers the best balance of dry ground and cool temperatures. Maximize timber extraction before winter sets in.',
    category: 'harvesting',
    priority: 'high',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Axe',
  },
  {
    id: 'oct-02',
    month: 10,
    title: 'Review hunting lease renewals',
    description: 'Hunting leases typically renew in autumn. Review terms, ensure fair pricing, and update lease contracts. Hunting income is tax-deductible.',
    category: 'financial',
    priority: 'medium',
    actionUrl: '/owner/leases',
    icon: 'FileText',
  },
  {
    id: 'oct-03',
    month: 10,
    title: 'Prepare for first frost',
    description: 'Mark sensitive areas (newly planted sites, seedling patches). Frost can heave young plants out of the soil. Consider mulching vulnerable areas.',
    category: 'planting',
    priority: 'low',
    actionUrl: '/owner/forest-profile',
    icon: 'Snowflake',
  },

  // ══════ November ══════
  {
    id: 'nov-01',
    month: 11,
    title: 'Winter harvesting on frozen ground',
    description: 'Wet areas that are impassable in summer become accessible when frozen. Plan winter logging for these compartments — it minimizes soil damage.',
    category: 'harvesting',
    priority: 'medium',
    actionUrl: '/owner/harvest-logistics',
    icon: 'Axe',
  },
  {
    id: 'nov-02',
    month: 11,
    title: 'Review annual finances',
    description: 'Assess the year\'s timber sales, expenses, and subsidies received. Calculate net income and identify any outstanding invoices before year-end.',
    category: 'financial',
    priority: 'high',
    actionUrl: '/owner/profit-tracker',
    icon: 'TrendingUp',
  },
  {
    id: 'nov-03',
    month: 11,
    title: 'Plan next year\'s activities',
    description: 'Based on this year\'s results, draft a preliminary plan for next year: which stands to thin, where to plant, and what monitoring is needed.',
    category: 'maintenance',
    priority: 'medium',
    actionUrl: '/owner/forest-plan',
    icon: 'CalendarDays',
  },

  // ══════ December ══════
  {
    id: 'dec-01',
    month: 12,
    title: 'Year-end financial review',
    description: 'Compile all income and expenses for tax purposes. Forestry offers favorable tax rules (skogskonto) — ensure you\'re using them optimally.',
    category: 'financial',
    priority: 'high',
    actionUrl: '/owner/profit-tracker',
    icon: 'Banknote',
  },
  {
    id: 'dec-02',
    month: 12,
    title: 'Check insurance coverage',
    description: 'Review your forest insurance: storm, fire, and pest coverage. Adjust insured values based on current timber prices and growth.',
    category: 'financial',
    priority: 'medium',
    actionUrl: '/owner/insurance',
    icon: 'Shield',
  },
  {
    id: 'dec-03',
    month: 12,
    title: 'Update your forest management plan',
    description: 'With the year wrapping up, incorporate all harvested volumes, newly planted areas, and damage assessments into your skogsbruksplan.',
    category: 'maintenance',
    priority: 'low',
    actionUrl: '/owner/forest-plan',
    icon: 'FileText',
  },
];

/* ─── Public API ─── */

/** Get all seasonal tasks */
export function getAllTasks(): SeasonalTask[] {
  return ALL_TASKS;
}

/** Get tasks for a specific month (1-12) */
export function getTasksForMonth(month: number): SeasonalTask[] {
  return ALL_TASKS.filter((t) => t.month === month).sort((a, b) => {
    const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/** Get the current month's tasks */
export function getCurrentMonthTasks(): SeasonalTask[] {
  return getTasksForMonth(new Date().getMonth() + 1);
}

/** Get urgent/smart suggestions based on current date */
export function getSmartSuggestions(): SeasonalTask[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentTasks = getTasksForMonth(currentMonth);
  return currentTasks.filter((t) => t.priority === 'high').slice(0, 3);
}

/** Get overdue tasks (high-priority from previous month, not completed) */
export function getOverdueTasks(): SeasonalTask[] {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const completed = getCompletedTaskIds();
  return getTasksForMonth(prevMonth).filter(
    (t) => t.priority === 'high' && !completed.has(t.id),
  );
}

/** Task count per month for the year overview */
export function getMonthlyTaskCounts(): { month: number; total: number; highPriority: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const tasks = getTasksForMonth(month);
    return {
      month,
      total: tasks.length,
      highPriority: tasks.filter((t) => t.priority === 'high').length,
    };
  });
}

/* ─── Completion persistence (localStorage) ─── */

export function getCompletedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function toggleTaskCompletion(taskId: string): Set<string> {
  const completed = getCompletedTaskIds();
  if (completed.has(taskId)) {
    completed.delete(taskId);
  } else {
    completed.add(taskId);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  } catch {
    // ignore
  }
  return completed;
}

export function getCompletedCountForMonth(month: number): number {
  const tasks = getTasksForMonth(month);
  const completed = getCompletedTaskIds();
  return tasks.filter((t) => completed.has(t.id)).length;
}

/* ─── Category helpers ─── */

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  monitoring: 'Monitoring',
  harvesting: 'Harvesting',
  planting: 'Planting',
  maintenance: 'Maintenance',
  regulatory: 'Regulatory',
  financial: 'Financial',
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  monitoring: '#ef4444',
  harvesting: '#f59e0b',
  planting: '#22c55e',
  maintenance: '#6366f1',
  regulatory: '#8b5cf6',
  financial: '#3b82f6',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
