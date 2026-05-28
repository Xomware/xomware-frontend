import { Agent } from '../models/agent.model';

/**
 * Dom's AI subagent team, rendered in the "Meet the Agents" section.
 * Each agent gets a unique CSS-art avatar driven by its `visualStyle` and
 * `color`. `color.glow` is an `r, g, b` triplet consumed via
 * `rgba(var(--agent-glow), <alpha>)` in agents-section.scss.
 */
export const AGENTS: Agent[] = [
  {
    id: 'kova',
    name: 'Kova',
    specialty: 'Code Implementation',
    description: 'Ships features end to end — services, endpoints, and data models across the stack.',
    color: { primary: '#00D4FF', secondary: '#0091EA', glow: '0, 212, 255' },
    visualStyle: 'geometric',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    specialty: 'Security & Review',
    description: 'Audits every change for vulnerabilities and quality. Nothing gets past the watch.',
    color: { primary: '#DC143C', secondary: '#8B0A28', glow: '220, 20, 60' },
    visualStyle: 'angular',
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    specialty: 'Frontend & UI',
    description: 'Crafts interfaces that feel alive — layout, motion, and accessibility.',
    color: { primary: '#B794F4', secondary: '#805AD5', glow: '183, 148, 244' },
    visualStyle: 'flowing',
  },
  {
    id: 'titan',
    name: 'Titan',
    specialty: 'Infrastructure',
    description: 'Lays solid ground for everything — Terraform, AWS, and CI/CD pipelines.',
    color: { primary: '#FF6B35', secondary: '#C2410C', glow: '255, 107, 53' },
    visualStyle: 'industrial',
  },
  {
    id: 'echo',
    name: 'Echo',
    specialty: 'Research',
    description: 'Pulls signal out of the noise — investigates tech and surfaces tradeoffs.',
    color: { primary: '#20B2AA', secondary: '#0F766E', glow: '32, 178, 170' },
    visualStyle: 'ripple',
  },
  {
    id: 'glitch',
    name: 'Glitch',
    specialty: 'Debugging',
    description: 'Hunts bugs in the static — traces errors to root cause and never guesses.',
    color: { primary: '#FF1493', secondary: '#C71585', glow: '255, 20, 147' },
    visualStyle: 'glitch',
  },
];
