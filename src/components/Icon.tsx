import {
  BarChart3, BookOpenCheck, Bot, Briefcase, Building2, Calculator, Calendar, ClipboardList, FileSearch, FileText, Globe,
  GraduationCap, Headset, Languages, Lightbulb, LineChart, ListChecks, Mail, Megaphone, MessageSquareReply, Package, PenLine,
  Phone, Receipt, Scale, Search, Send, Shield, ShoppingCart, Sparkles, Table, Tags, Truck, UserPlus, Users, Wand2,
  type LucideProps,
} from 'lucide-react';
import type { WorkflowIcon } from '@shared/icons';

const MAP: Record<WorkflowIcon, React.ComponentType<LucideProps>> = {
  Sparkles, FileText, ListChecks, BarChart3, Send, Megaphone, MessageSquareReply, BookOpenCheck, UserPlus, Receipt, Languages,
  Wand2, Mail, Calculator, ClipboardList, Bot, Briefcase, FileSearch, Table, Users, PenLine, Lightbulb, ShoppingCart, Phone, Globe,
  Shield, Calendar, Truck, Package, Headset, Scale, GraduationCap, Building2, LineChart, Search, Tags,
};

/** Render a whitelisted lucide icon by name (workflow definitions store icon names as strings). */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = MAP[name as WorkflowIcon] ?? Sparkles;
  return <Cmp aria-hidden="true" {...props} />;
}
