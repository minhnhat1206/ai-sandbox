/**
 * Icon names a workflow may use (lucide-react). Kept as a whitelist so the
 * browser bundle only ships these icons and the catalog validator can check them.
 */
export const WORKFLOW_ICONS = [
  'Sparkles', 'FileText', 'ListChecks', 'BarChart3', 'Send', 'Megaphone', 'MessageSquareReply', 'BookOpenCheck',
  'UserPlus', 'Receipt', 'Languages', 'Wand2', 'Mail', 'Calculator', 'ClipboardList', 'Bot', 'Briefcase', 'FileSearch',
  'Table', 'Users', 'PenLine', 'Lightbulb', 'ShoppingCart', 'Phone', 'Globe', 'Shield', 'Calendar', 'Truck', 'Package',
  'Headset', 'Scale', 'GraduationCap', 'Building2', 'LineChart', 'Search', 'Tags',
] as const;

export type WorkflowIcon = (typeof WORKFLOW_ICONS)[number];
