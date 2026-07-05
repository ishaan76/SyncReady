export interface DiagnosticsInput {
  os: string;
  browser: string;
  appType: "Web" | "Desktop" | "Beta App";
  connection: string;
  lastLoginDays: number;
  issueFrequency: string;
  hasBatterySaver: boolean;
  notes: string;
}

export interface OptimizationCommand {
  title: string;
  desc: string;
  cmd: string;
  platform: "shell" | "instructions";
}

export interface DiagnosticsResult {
  diagnosis: string;
  commands: OptimizationCommand[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
}

export interface NetworkPingMetric {
  url: string;
  alias: string;
  latency: number | "Timeout" | "Testing";
  status: "success" | "warning" | "error" | "idle";
}

export interface QuickContact {
  id: string;
  name: string;
  phone: string;
  category: "Self" | "Work" | "Personal" | "Other";
}
