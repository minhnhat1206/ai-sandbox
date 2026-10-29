/**
 * Lumen icon set – drawn for this product on a 24px grid, 1.75px round strokes.
 * Workflow icons are duotone: a translucent fill (`.duo`) under the stroke, which
 * gives them presence in cards without reading as heavy. UI icons are stroke only.
 * Names of workflow icons match `shared/icons.ts` (stored on workflow definitions).
 */
import type { SVGProps } from 'react';

type Paths = React.ReactNode;

const duo = (d: string) => <path className="duo" d={d} fill="currentColor" stroke="none" opacity={0.16} />;

export const ICONS: Record<string, Paths> = {
  // ---------------------------------------------------------------- UI
  arrowLeft: <><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  play: <>{duo('M8 5.5v13l11-6.5z')}<path d="M8 5.5v13l11-6.5z" strokeLinejoin="round" /></>,
  chat: <>{duo('M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z')}<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z" /><path d="M8.5 9h7M8.5 12h4" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  rotate: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 3.5V9H9" /></>,
  sparkle: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" strokeLinejoin="round" /><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor" stroke="none" /></>,
  send: <><path d="M21 3L10.5 13.5" /><path d="M21 3l-6.5 18-4-7.5L3 9.5z" strokeLinejoin="round" /></>,
  trash: <><path d="M4 7h16" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7l.9 12.2A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" /><path d="M10 11v5M14 11v5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M9.5 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h4" /><path d="M15 8l4 4-4 4" /><path d="M19 12H9.5" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  timer: <><circle cx="12" cy="13.5" r="7" /><path d="M12 10.5V14" /><path d="M10 3h4M12 3v3.5" /></>,
  book: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z" /></>,
  shield: <><path d="M12 3l7.5 3v5.5c0 4.7-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.8-7.5-9.5V6z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" /></>,
  star: <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8l6-.8z" strokeLinejoin="round" />,
  starFilled: <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8l6-.8z" fill="currentColor" strokeLinejoin="round" />,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.75" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.75" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.75" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.75" /></>,
  docCheck: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 15l2 2 4-4.5" /></>,
  handshake: <><path d="M2.5 12.5L7 8h4l3 3-2.5 2.5a1.8 1.8 0 0 0 2.5 2.5l3-3h4.5" /><path d="M5 15l3 3M8 18l2.5 2.5M11 20l1.8-1.8M14 18l2.3-2.3" /></>,
  coins: <><circle cx="9" cy="9" r="5.5" /><path d="M14.3 10.2A5.5 5.5 0 1 1 10.2 14.3" /><path d="M9 7v4M7.5 8.5h3" /></>,
  dashboard: <><rect x="4" y="4" width="7" height="9" rx="1.75" /><rect x="13" y="4" width="7" height="5" rx="1.75" /><rect x="13" y="11" width="7" height="9" rx="1.75" /><rect x="4" y="15" width="7" height="5" rx="1.75" /></>,
  building: <><path d="M4 20h16" /><path d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20" /><path d="M9.5 8h1.5M13 8h1.5M9.5 11.5h1.5M13 11.5h1.5" /><path d="M10.5 20v-4h3v4" /></>,
  library: <><path d="M4 4h3v16H4z" /><path d="M9.5 4h3v16h-3z" /><path d="M14.5 5.3l2.9-.8 4 14.5-2.9.8z" /></>,
  loader: <path d="M12 3a9 9 0 0 1 9 9" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none" /></>,
  alert: <><path d="M12 3.5l9 16h-18z" strokeLinejoin="round" /><path d="M12 10v4" /><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  thumbsUp: <><path d="M7 11v9H4v-9z" /><path d="M7 11l4-7.5a2 2 0 0 1 2.3 2.5L12.5 10H18a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 16.8 20H7" strokeLinejoin="round" /></>,
  calendarCheck: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15.5l2 2 4-4" /></>,
  bolt: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" strokeLinejoin="round" />,
  hours: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.5 1.5" /><path d="M12 3.5v1M20.5 12h-1M12 20.5v-1M3.5 12h1" /></>,
  users2: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M21.5 20a6.5 6.5 0 0 0-4.5-6.2" /></>,
  paperclip: <path d="M20 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.6 1.6 0 0 1-2.3-2.3l8-8" />,
  dollar: <><path d="M12 3v18" /><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2.5a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6H10a3.5 3.5 0 0 1-3.5-2.5" /></>,
  inbox: <><path d="M4 13l2.2-7.4A1.5 1.5 0 0 1 7.6 4.5h8.8a1.5 1.5 0 0 1 1.4 1.1L20 13v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" /><path d="M4 13h4.5l1.2 2.5h4.6L15.5 13H20" /></>,
  quote: <><path d="M10 8H6.5A1.5 1.5 0 0 0 5 9.5v3A1.5 1.5 0 0 0 6.5 14H9a1 1 0 0 1 1 1 2.5 2.5 0 0 1-2.5 2.5" /><path d="M19 8h-3.5A1.5 1.5 0 0 0 14 9.5v3a1.5 1.5 0 0 0 1.5 1.5H18a1 1 0 0 1 1 1 2.5 2.5 0 0 1-2.5 2.5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" strokeLinejoin="round" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,

  // ----------------------------------------------------- workflow (duotone)
  Sparkles: <>{duo('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z')}<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" strokeLinejoin="round" /><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor" stroke="none" /><path d="M5 17.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill="currentColor" stroke="none" /></>,
  FileText: <>{duo('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z')}<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  ListChecks: <>{duo('M9 5h12v4H9zM9 10h12v4H9zM9 15h12v4H9z')}<path d="M10 7h10M10 12h10M10 17h10" /><path d="M3 7l1.5 1.5L7.5 5.5M3 12l1.5 1.5 3-3M3 17l1.5 1.5 3-3" /></>,
  BarChart3: <>{duo('M4 12h4v8H4zM10 5h4v15h-4zM16 9h4v11h-4z')}<path d="M4 12h4v8H4zM10 5h4v15h-4zM16 9h4v11h-4z" strokeLinejoin="round" /><path d="M3 20h18" /></>,
  Send: <>{duo('M21 3l-6.5 18-4-7.5L3 9.5z')}<path d="M21 3L10.5 13.5" /><path d="M21 3l-6.5 18-4-7.5L3 9.5z" strokeLinejoin="round" /></>,
  Megaphone: <>{duo('M3 10v4a1 1 0 0 0 1 1h3l8 4V5L7 9H4a1 1 0 0 0-1 1z')}<path d="M3 10v4a1 1 0 0 0 1 1h3l8 4V5L7 9H4a1 1 0 0 0-1 1z" strokeLinejoin="round" /><path d="M18.5 9a3.2 3.2 0 0 1 0 6" /><path d="M7.5 15.5v3.5a1 1 0 0 0 1 1H10" /></>,
  MessageSquareReply: <>{duo('M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z')}<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z" strokeLinejoin="round" /><path d="M10 7.5L7.5 10 10 12.5" /><path d="M7.5 10H13a3 3 0 0 1 3 3v.5" /></>,
  BookOpenCheck: <>{duo('M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4.5A1.5 1.5 0 0 1 3 16.5z')}<path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4.5A1.5 1.5 0 0 1 3 16.5z" /><path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5z" /><path d="M15 10.5l1.5 1.5 3-3" /></>,
  UserPlus: <>{duo('M3.5 20a6.5 6.5 0 0 1 13 0z')}<circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6M16 11h6" /></>,
  Receipt: <>{duo('M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z')}<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  Languages: <>{duo('M13 20l4-9 4 9z')}<path d="M3 5.5h10M8 3.5v2" /><path d="M5 9.5c1.5 4 4 6.5 7 8M11 9.5c-1.5 4-4 6.5-7 8" /><path d="M13 20l4-9 4 9" strokeLinejoin="round" /><path d="M14.5 17h5" /></>,
  Wand2: <>{duo('M3 21l9.5-9.5 3 3L6 21z')}<path d="M3 21l12-12" /><path d="M13 7l4 4" /><path d="M15.5 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" /><path d="M20.5 10.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" /></>,
  Mail: <>{duo('M3 5h18v14H3z')}<rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></>,
  Calculator: <>{duo('M5 3h14v18H5z')}<rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7h7" /><circle cx="9" cy="12" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r=".9" fill="currentColor" stroke="none" /><circle cx="9" cy="16" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="16" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="16" r=".9" fill="currentColor" stroke="none" /></>,
  ClipboardList: <>{duo('M5 4h14v17H5z')}<rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 3h6v3H9z" strokeLinejoin="round" /><path d="M9 11.5h6M9 15.5h4" /></>,
  Bot: <>{duo('M4 8h16v11H4z')}<rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4.5V8" /><circle cx="12" cy="3.5" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" /><path d="M9.5 16.5h5" /><path d="M2 12v4M22 12v4" /></>,
  Briefcase: <>{duo('M3 7h18v13H3z')}<rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" /><path d="M3 12.5h18" /></>,
  FileSearch: <>{duo('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z')}<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5" /><circle cx="11" cy="13.5" r="2.5" /><path d="M13 15.5l2 2" /></>,
  Table: <>{duo('M3 5h18v14H3z')}<rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18M3 14.5h18M9 10v9M15 10v9" /></>,
  Users: <>{duo('M2.5 20a6.5 6.5 0 0 1 13 0z')}<circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M21.5 20a6.5 6.5 0 0 0-4.5-6.2" /></>,
  PenLine: <>{duo('M14.5 4.5l5 5L9 20H4v-5z')}<path d="M4 20h16" /><path d="M14.5 4.5l5 5L9 20H4v-5z" strokeLinejoin="round" /><path d="M12.5 6.5l5 5" /></>,
  Lightbulb: <>{duo('M8 13.5A6 6 0 1 1 16 13.5c-.8.8-1.5 2-1.5 3.5h-5c0-1.5-.7-2.7-1.5-3.5z')}<path d="M8 13.5A6 6 0 1 1 16 13.5c-.8.8-1.5 2-1.5 3.5h-5c0-1.5-.7-2.7-1.5-3.5z" strokeLinejoin="round" /><path d="M9.5 20h5" /><path d="M12 7.5a3 3 0 0 0-3 3" /></>,
  ShoppingCart: <>{duo('M6.5 7h14.5L18.5 15h-11z')}<path d="M3 4h2l2.5 11h11L21 7H6.5" strokeLinejoin="round" /><circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none" /><circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" /></>,
  Phone: <>{duo('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z')}<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" strokeLinejoin="round" /></>,
  Globe: <>{duo('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z')}<circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>,
  Shield: <>{duo('M12 3l7.5 3v5.5c0 4.7-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.8-7.5-9.5V6z')}<path d="M12 3l7.5 3v5.5c0 4.7-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.8-7.5-9.5V6z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" /></>,
  Calendar: <>{duo('M3 10h18v11H3z')}<rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2" /></>,
  Truck: <>{duo('M3 6h11v10H3z')}<path d="M3 6h11v10H3z" strokeLinejoin="round" /><path d="M14 10h4l3 3v3h-7" strokeLinejoin="round" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  Package: <>{duo('M12 3l8 4.5v9L12 21l-8-4.5v-9z')}<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" strokeLinejoin="round" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" /></>,
  Headset: <>{duo('M4 13h4v6H4zM16 13h4v6h-4z')}<path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="4" y="13" width="4" height="6" rx="1.5" /><rect x="16" y="13" width="4" height="6" rx="1.5" /><path d="M20 19a3 3 0 0 1-3 3h-3" /></>,
  Scale: <>{duo('M2 14l3-6 3 6zM16 14l3-6 3 6z')}<path d="M12 3v18M8 21h8M12 6l-7 2M12 6l7 2" /><path d="M2 14l3-6 3 6a3 3 0 0 1-6 0z" strokeLinejoin="round" /><path d="M16 14l3-6 3 6a3 3 0 0 1-6 0z" strokeLinejoin="round" /></>,
  GraduationCap: <>{duo('M2 9l10-4.5L22 9l-10 4.5z')}<path d="M2 9l10-4.5L22 9l-10 4.5z" strokeLinejoin="round" /><path d="M6 11.5v4.5c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" /><path d="M22 9v5" /></>,
  Building2: <>{duo('M5 4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21H5z')}<path d="M3 21h18" /><path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21" /><path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V21" /><path d="M8.5 7h2M8.5 10.5h2M8.5 14h2M8.5 17.5h2M17 13h1M17 16.5h1" /></>,
  LineChart: <>{duo('M7 14l4-4 3 3 5-6v12H7z')}<path d="M4 4v16h16" /><path d="M7 14l4-4 3 3 5-6" /><circle cx="19" cy="7" r="1.5" fill="currentColor" stroke="none" /></>,
  Search: <>{duo('M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z')}<circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  Landmark: <>{duo('M3 9.5L12 4l9 5.5z')}<path d="M3 9.5L12 4l9 5.5z" strokeLinejoin="round" /><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" /><path d="M3.5 20h17M4.5 17.5h15" /></>,
  Presentation: <>{duo('M4 4h16v11H4z')}<path d="M3 4h18" /><rect x="4" y="4" width="16" height="11" rx="1.5" /><path d="M12 15v3M8.5 21l3.5-3 3.5 3" /><path d="M8 11.5V10M11 11.5V8M14 11.5V9.5M17 11.5V7.5" /></>,
  Inbox: <>{duo('M4 13h4.5l1.2 2.5h4.6L15.5 13H20v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z')}<path d="M4 13l2.2-7.4A1.5 1.5 0 0 1 7.6 4.5h8.8a1.5 1.5 0 0 1 1.4 1.1L20 13v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" /><path d="M4 13h4.5l1.2 2.5h4.6L15.5 13H20" /><path d="M9 8h6M10 10.5h4" /></>,
  Radar: <>{duo('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z')}<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><path d="M12 12l6-6" /><circle cx="15.5" cy="9" r="1" fill="currentColor" stroke="none" /></>,
  Wallet: <>{duo('M4 7h15a1 1 0 0 1 1 1v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z')}<path d="M4 7h15a1 1 0 0 1 1 1v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1.5-1.5H17v2.5" strokeLinejoin="round" /><path d="M20 11h-4a2 2 0 0 0 0 4h4" /><circle cx="16.2" cy="13" r=".9" fill="currentColor" stroke="none" /></>,
  Funnel: <>{duo('M3.5 5h17l-6.5 8v6l-4 1.5V13z')}<path d="M3.5 5h17l-6.5 8v6l-4 1.5V13z" strokeLinejoin="round" /><path d="M7 9h10" /></>,
  Tags: <>{duo('M3 12V4h8l9 9-8 8z')}<path d="M3 12V4h8l9 9-8 8z" strokeLinejoin="round" /><circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /><path d="M14 4l8 8" /></>,
};

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, className = '', ...rest }: IconProps) {
  const paths = ICONS[name] ?? ICONS.Sparkles;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${name === 'loader' ? 'animate-spin' : ''} ${className}`}
      {...rest}
    >
      {paths}
    </svg>
  );
}
