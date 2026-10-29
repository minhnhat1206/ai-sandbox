/**
 * Icon names a workflow may use. Each one is drawn in src/icons (the Lumen set);
 * the whitelist lets the catalog validator reject unknown names.
 */
export const WORKFLOW_ICONS = [
  'Sparkles', 'FileText', 'ListChecks', 'BarChart3', 'Send', 'Megaphone', 'MessageSquareReply', 'BookOpenCheck',
  'UserPlus', 'Receipt', 'Languages', 'Wand2', 'Mail', 'Calculator', 'ClipboardList', 'Bot', 'Briefcase', 'FileSearch',
  'Table', 'Users', 'PenLine', 'Lightbulb', 'ShoppingCart', 'Phone', 'Globe', 'Shield', 'Calendar', 'Truck', 'Package',
  'Headset', 'Scale', 'GraduationCap', 'Building2', 'LineChart', 'Search', 'Tags', 'Landmark', 'Presentation', 'Inbox', 'Radar', 'Wallet', 'Funnel',
] as const;

export type WorkflowIcon = (typeof WORKFLOW_ICONS)[number];
