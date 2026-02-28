export type AgentAnimation =
  | 'pace' | 'hammer' | 'patrol' | 'orbit' | 'write' | 'nod';

/** Alias kept for backwards compatibility with ticket spec */
export type AgentAnimationType = AgentAnimation;

export interface AgentBlob {
  name: string;
  displayName: string;
  role: string;
  color: string;
  scale: number;
  startX: number;
  startY: number;
  idleAnimation: AgentAnimation;
  signatureAnimation: AgentAnimation;
  currentTask?: string;
  lastAction?: string;
}

/** Canonical AGENTS config — single source of truth for all 6 AI agents */
export const AGENTS: AgentBlob[] = [
  {
    name: 'boris',
    displayName: 'Boris',
    role: 'iMessage Dispatcher',
    color: '#00b4d8',
    scale: 1.0,
    startX: 50,
    startY: 90,
    idleAnimation: 'pace',
    signatureAnimation: 'pace',
    currentTask: 'Dispatching messages to Dom',
    lastAction: 'Spawned Forge sub-agent',
  },
  {
    name: 'forge',
    displayName: 'Forge',
    role: 'Code Builder',
    color: '#FF6B35',
    scale: 1.2,
    startX: 130,
    startY: 75,
    idleAnimation: 'hammer',
    signatureAnimation: 'hammer',
    currentTask: 'Building agent-blobs feature',
    lastAction: 'Opened PR #42',
  },
  {
    name: 'rocco',
    displayName: 'Rocco',
    role: 'Research Analyst',
    color: '#9C0ABF',
    scale: 0.85,
    startX: 220,
    startY: 100,
    idleAnimation: 'orbit',
    signatureAnimation: 'orbit',
    currentTask: 'Analyzing competitor landscape',
    lastAction: 'Filed research report',
  },
  {
    name: 'winston',
    displayName: 'Winston',
    role: 'CI/CD Watchdog',
    color: '#00FFAB',
    scale: 1.0,
    startX: 300,
    startY: 80,
    idleAnimation: 'patrol',
    signatureAnimation: 'patrol',
    currentTask: 'Monitoring 3 build pipelines',
    lastAction: 'Build #88 passed ✓',
  },
  {
    name: 'stormy',
    displayName: 'Stormy',
    role: 'Memory Curator',
    color: '#4A90D9',
    scale: 0.8,
    startX: 400,
    startY: 95,
    idleAnimation: 'write',
    signatureAnimation: 'write',
    currentTask: "Documenting today's decisions",
    lastAction: 'Updated MEMORY.md',
  },
  {
    name: 'debo',
    displayName: 'Debo',
    role: 'Infrastructure Agent',
    color: '#E74C3C',
    scale: 1.15,
    startX: 490,
    startY: 85,
    idleAnimation: 'nod',
    signatureAnimation: 'nod',
    currentTask: 'Watching infra on 4 nodes',
    lastAction: 'Terraform apply: success',
  },
];
