import React from "react";
import {
  Search,
  Bell,
  Plus,
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  Users,
  Settings,
  LayoutDashboard,
  CalendarDays,
  UserCircle,
  Quote,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  Bot,
  Play,
  Pause,
  RefreshCw,
  Save,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  AlertCircle,
  CreditCard,
  UserPlus,
  Edit,
  Trash2,
  Send,
  Loader2,
  Building2,
  UserCheck,
  Briefcase,
} from "lucide-react";

interface IconProps {
  name:
    | "search"
    | "bell"
    | "plus"
    | "trending-up"
    | "clock"
    | "calendar"
    | "dollar-sign"
    | "message-square"
    | "file-text"
    | "phone"
    | "mail"
    | "users"
    | "settings"
    | "layout-dashboard"
    | "calendar-days"
    | "user-circle"
    | "quote"
    | "phone-call"
    | "phone-incoming"
    | "phone-outgoing"
    | "mic"
    | "bot"
    | "play"
    | "pause"
    | "refresh"
    | "save"
    | "x"
    | "check"
    | "chevron-right"
    | "chevron-down"
    | "copy"
    | "external-link"
    | "alert-circle"
    | "credit-card"
    | "user-plus"
    | "edit"
    | "trash-2"
    | "send"
    | "loader-2"
    | "building-2"
    | "user-check"
    | "briefcase";
  className?: string;
  size?: number;
}

export function Icon({ name, className = "", size = 20 }: IconProps) {
  const icons = {
    search: Search,
    bell: Bell,
    plus: Plus,
    "trending-up": TrendingUp,
    clock: Clock,
    calendar: Calendar,
    "dollar-sign": DollarSign,
    "message-square": MessageSquare,
    "file-text": FileText,
    phone: Phone,
    mail: Mail,
    users: Users,
    settings: Settings,
    "layout-dashboard": LayoutDashboard,
    "calendar-days": CalendarDays,
    "user-circle": UserCircle,
    quote: Quote,
    "phone-call": PhoneCall,
    "phone-incoming": PhoneIncoming,
    "phone-outgoing": PhoneOutgoing,
    mic: Mic,
    bot: Bot,
    play: Play,
    pause: Pause,
    refresh: RefreshCw,
    save: Save,
    x: X,
    check: Check,
    "chevron-right": ChevronRight,
    "chevron-down": ChevronDown,
    copy: Copy,
    "external-link": ExternalLink,
    "alert-circle": AlertCircle,
    "credit-card": CreditCard,
    "user-plus": UserPlus,
    edit: Edit,
    "trash-2": Trash2,
    send: Send,
    "loader-2": Loader2,
    "building-2": Building2,
    "user-check": UserCheck,
    briefcase: Briefcase,
  };

  const IconComponent = icons[name];
  return <IconComponent className={className} size={size} />;
}
