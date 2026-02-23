import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener, OnInit } from '@angular/core';
import { AgentStatusService, AgentStatus } from '../../../services/agent-status.service';
import { Subscription } from 'rxjs';

interface Agent {
  name: string;
  role: string;
  status: 'idle' | 'working' | 'thinking' | 'done';
  x: number;
  y: number;
  color: string;
  skinTone: string;
  hairColor: string;
  hairStyle: 'short' | 'spiky' | 'long' | 'bun' | 'mohawk' | 'bald';
  task?: string;
  frame: number;
}

@Component({
  selector: 'app-pixel-office',
  templateUrl: './pixel-office.component.html',
  styleUrls: ['./pixel-office.component.scss'],
})
export class PixelOfficeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('officeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private rafId = 0;
  private tick = 0;
  private animFrame = 0;
  private canvasW = 600;
  private canvasH = 440;
  private scale = 1;
  private statusSub!: Subscription;
  lastUpdated: string | null = null;

  constructor(private agentStatusService: AgentStatusService) {}

  agentDescriptions: Record<string, string> = {
    'Jarvis': 'Main brain. Orchestrates all other agents, talks to Dom, manages priorities.',
    'Forge': 'Spawned for coding tasks — builds features, fixes bugs, opens PRs across repos.',
    'Recon': 'Web research, docs analysis, best practice scouting. Feeds intel back to Jarvis.',
    'Watchtower': 'Monitors GitHub PRs, CI/CD status, email, calendar. Alerts on anything urgent.',
    'Scribe': 'Maintains MEMORY.md, LESSONS.md, daily logs. Keeps institutional knowledge alive.',
    'Deployer': 'Handles Terraform plans, CI/CD pipelines, infrastructure changes. Reviews before apply.',
  };

  agents: Agent[] = [
    {
      name: 'Jarvis', role: 'Lead Orchestrator', status: 'working',
      x: 100, y: 90, color: '#00b4d8', skinTone: '#d4a574', hairColor: '#2c1810', hairStyle: 'short',
      task: 'Orchestrating agents', frame: 0,
    },
    {
      name: 'Forge', role: 'Code & Build', status: 'idle',
      x: 300, y: 90, color: '#9c0abf', skinTone: '#8d5524', hairColor: '#1a1a1a', hairStyle: 'spiky',
      frame: 0,
    },
    {
      name: 'Recon', role: 'Research & Analysis', status: 'thinking',
      x: 500, y: 90, color: '#ff6b35', skinTone: '#c68642', hairColor: '#4a2c0a', hairStyle: 'long',
      task: 'Analyzing best practices', frame: 0,
    },
    {
      name: 'Watchtower', role: 'Monitor & Alerting', status: 'idle',
      x: 100, y: 270, color: '#00ffab', skinTone: '#f1c27d', hairColor: '#b55239', hairStyle: 'mohawk',
      frame: 0,
    },
    {
      name: 'Scribe', role: 'Docs & Memory', status: 'idle',
      x: 300, y: 270, color: '#ffbe0b', skinTone: '#e0ac69', hairColor: '#555555', hairStyle: 'bun',
      frame: 0,
    },
    {
      name: 'Deployer', role: 'CI/CD & Infra', status: 'idle',
      x: 500, y: 270, color: '#ff5252', skinTone: '#d4a574', hairColor: '#1a1a1a', hairStyle: 'bald',
      frame: 0,
    },
  ];

  ngOnInit(): void {
    // Start polling agent status from the API
    this.agentStatusService.startPolling(10_000);
    this.statusSub = this.agentStatusService.status$.subscribe(data => {
      if (data.agents.length > 0) {
        this.applyStatus(data.agents);
        this.lastUpdated = data.updatedAt;
      }
    });
  }

  ngAfterViewInit(): void {
    this.resizeCanvas();
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.agentStatusService.stopPolling();
    if (this.statusSub) this.statusSub.unsubscribe();
  }

  private applyStatus(statuses: AgentStatus[]): void {
    for (const s of statuses) {
      const agent = this.agents.find(a => a.name === s.name);
      if (agent) {
        agent.status = s.status;
        agent.task = s.task ?? undefined;
      }
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;
    const maxW = Math.min(container.clientWidth, 600);
    this.scale = maxW / 600;
    canvas.width = 600;
    canvas.height = 440;
    canvas.style.width = maxW + 'px';
    canvas.style.height = (440 * this.scale) + 'px';
  }

  private animate = (): void => {
    this.tick++;
    if (this.tick % 6 === 0) {
      this.animFrame++;
      this.agents.forEach(a => a.frame = this.animFrame);
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.animate);
  };

  private draw(): void {
    const ctx = this.ctx;
    const w = 600, h = 440;

    // Background — office floor with carpet texture
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Carpet pattern
    ctx.fillStyle = 'rgba(0,180,216,0.015)';
    for (let x = 0; x < w; x += 20) {
      for (let y = 40; y < h - 30; y += 20) {
        if ((x + y) % 40 === 0) ctx.fillRect(x, y, 20, 20);
      }
    }

    // Wall (top)
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, w, 50);
    ctx.fillStyle = 'rgba(0,180,216,0.06)';
    ctx.fillRect(0, 46, w, 4);

    // Wall decorations — framed logo
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(270, 8, 60, 30);
    ctx.fillStyle = '#00b4d8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('XOMWARE', 300, 22);
    ctx.fillStyle = '#6a6a7a';
    ctx.font = '6px monospace';
    ctx.fillText('HQ', 300, 32);
    ctx.textAlign = 'left';

    // Wall clock
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(540, 25, 12, 0, Math.PI * 2);
    ctx.stroke();
    const now = new Date();
    const hr = (now.getHours() % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    const mn = now.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(540, 25); ctx.lineTo(540 + Math.cos(hr) * 6, 25 + Math.sin(hr) * 6); ctx.stroke();
    ctx.strokeStyle = '#6a6a7a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(540, 25); ctx.lineTo(540 + Math.cos(mn) * 9, 25 + Math.sin(mn) * 9); ctx.stroke();

    // Plants
    this.drawPlant(ctx, 30, 50);
    this.drawPlant(ctx, 570, 50);

    // Draw agents
    this.agents.forEach(agent => this.drawWorkstation(ctx, agent));

    // Title overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 28, w, 28);
    ctx.fillStyle = '#00b4d8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🏢 XOMWARE HQ', 12, h - 11);

    // Legend
    const legends = [
      { color: '#00ffab', label: 'Working' },
      { color: '#ffbe0b', label: 'Thinking' },
      { color: '#6a6a7a', label: 'Idle' },
      { color: '#00b4d8', label: 'Done' },
    ];
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    let lx = w - 12;
    for (let i = legends.length - 1; i >= 0; i--) {
      const l = legends[i];
      const tw = ctx.measureText(l.label).width;
      ctx.fillStyle = '#6a6a7a';
      ctx.fillText(l.label, lx, h - 11);
      lx -= tw + 4;
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.arc(lx, h - 14, 3, 0, Math.PI * 2); ctx.fill();
      lx -= 14;
    }
    ctx.textAlign = 'left';
  }

  private drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Pot
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(x - 5, y + 12, 10, 8);
    ctx.fillRect(x - 7, y + 10, 14, 3);
    // Leaves
    ctx.fillStyle = '#2d8a4e';
    ctx.beginPath(); ctx.ellipse(x, y + 4, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 5, y + 6, 3, 6, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 5, y + 6, 3, 6, 0.4, 0, Math.PI * 2); ctx.fill();
  }

  private drawWorkstation(ctx: CanvasRenderingContext2D, agent: Agent): void {
    const x = agent.x;
    const y = agent.y;
    const bounce = agent.status === 'working' ? Math.sin(this.tick * 0.12) * 1.5 : 0;
    const breathe = Math.sin(this.tick * 0.04) * 0.5;

    // === DESK ===
    // Desk surface (wooden)
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(x - 45, y + 30, 90, 8);
    // Desk front panel
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(x - 45, y + 38, 90, 25);
    // Desk legs
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(x - 43, y + 63, 4, 10);
    ctx.fillRect(x + 39, y + 63, 4, 10);

    // === MONITOR ===
    const monX = x - 16;
    const monY = y + 2;
    // Monitor stand
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 2, monY + 24, 4, 6);
    ctx.fillRect(x - 6, monY + 28, 12, 3);
    // Monitor body
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.fillRect(monX, monY, 32, 24);
    ctx.strokeRect(monX, monY, 32, 24);

    // Screen content
    if (agent.status === 'working') {
      // Active screen with code lines
      ctx.fillStyle = agent.color + '20';
      ctx.fillRect(monX + 2, monY + 2, 28, 20);
      for (let i = 0; i < 6; i++) {
        const lineY = monY + 4 + i * 3;
        const lineW = 4 + ((agent.frame + i * 3) % 18);
        ctx.fillStyle = i === 2 ? agent.color + '80' : 'rgba(255,255,255,0.35)';
        ctx.fillRect(monX + 4, lineY, Math.min(lineW, 24), 1.5);
      }
      // Screen glow
      ctx.fillStyle = agent.color + '08';
      ctx.fillRect(monX - 6, monY - 4, 44, 32);
    } else if (agent.status === 'thinking') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(monX + 2, monY + 2, 28, 20);
      // Pulsing cursor
      if (this.animFrame % 2 === 0) {
        ctx.fillStyle = agent.color;
        ctx.fillRect(monX + 6, monY + 8, 2, 8);
      }
    } else if (agent.status === 'done') {
      ctx.fillStyle = '#0a2a1a';
      ctx.fillRect(monX + 2, monY + 2, 28, 20);
      ctx.fillStyle = '#00ffab';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓', x, monY + 15);
      ctx.textAlign = 'left';
    } else {
      // Screensaver / idle
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(monX + 2, monY + 2, 28, 20);
      const dotX = monX + 10 + Math.sin(this.tick * 0.02) * 6;
      const dotY = monY + 12 + Math.cos(this.tick * 0.03) * 4;
      ctx.fillStyle = agent.color + '40';
      ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI * 2); ctx.fill();
    }

    // === COFFEE MUG ===
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x + 22, y + 24, 6, 7);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 29, y + 27, 2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    // Steam (only when working)
    if (agent.status === 'working' || agent.status === 'thinking') {
      const st = this.tick * 0.08;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 24 + i * 3, y + 23);
        ctx.quadraticCurveTo(x + 25 + i * 3 + Math.sin(st + i) * 2, y + 18, x + 24 + i * 3, y + 14);
        ctx.stroke();
      }
    }

    // === CHAIR ===
    ctx.fillStyle = '#333';
    // Chair back
    ctx.fillRect(x - 10, y + 45 + bounce, 20, 3);
    // Chair seat
    ctx.fillRect(x - 12, y + 55, 24, 4);
    // Chair legs
    ctx.fillRect(x - 10, y + 59, 2, 14);
    ctx.fillRect(x + 8, y + 59, 2, 14);
    // Chair wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - 10, y + 73, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y + 73, 2, 0, Math.PI * 2); ctx.fill();

    // === PERSON (sitting) ===
    const py = y + 32 + bounce; // person base y (at desk level)

    // Legs (sitting, bent at knees)
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(x - 6, py + 18, 5, 12); // left thigh
    ctx.fillRect(x + 1, py + 18, 5, 12); // right thigh
    // Lower legs
    ctx.fillRect(x - 6, py + 28, 5, 6);
    ctx.fillRect(x + 1, py + 28, 5, 6);
    // Shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 7, py + 33, 6, 3);
    ctx.fillRect(x + 1, py + 33, 6, 3);

    // Body / torso (shirt)
    ctx.fillStyle = agent.color;
    ctx.fillRect(x - 7, py, 14, 18);
    // Shirt collar
    ctx.fillStyle = agent.color + 'cc';
    ctx.beginPath();
    ctx.moveTo(x - 3, py);
    ctx.lineTo(x, py + 4);
    ctx.lineTo(x + 3, py);
    ctx.fill();

    // Arms
    const typing = agent.status === 'working';
    const leftArmAngle = typing ? Math.sin(this.tick * 0.3) * 0.15 : 0;
    const rightArmAngle = typing ? Math.sin(this.tick * 0.3 + Math.PI) * 0.15 : 0;

    // Left arm
    ctx.fillStyle = agent.color + 'dd';
    ctx.save();
    ctx.translate(x - 7, py + 2);
    ctx.rotate(-0.3 + leftArmAngle);
    ctx.fillRect(-2, 0, 4, 14);
    // Hand
    ctx.fillStyle = agent.skinTone;
    ctx.fillRect(-2, 13, 4, 3);
    ctx.restore();

    // Right arm
    ctx.fillStyle = agent.color + 'dd';
    ctx.save();
    ctx.translate(x + 7, py + 2);
    ctx.rotate(0.3 + rightArmAngle);
    ctx.fillRect(-2, 0, 4, 14);
    ctx.fillStyle = agent.skinTone;
    ctx.fillRect(-2, 13, 4, 3);
    ctx.restore();

    // Neck
    ctx.fillStyle = agent.skinTone;
    ctx.fillRect(x - 2, py - 4, 4, 5);

    // Head
    ctx.fillStyle = agent.skinTone;
    ctx.beginPath();
    ctx.ellipse(x, py - 12 + breathe, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = agent.hairColor;
    switch (agent.hairStyle) {
      case 'short':
        ctx.beginPath();
        ctx.ellipse(x, py - 16 + breathe, 9, 6, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 8, py - 16 + breathe, 16, 4);
        break;
      case 'spiky':
        ctx.beginPath();
        ctx.ellipse(x, py - 16 + breathe, 9, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Spikes
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 4 - 2, py - 19 + breathe);
          ctx.lineTo(x + i * 4, py - 25 + breathe);
          ctx.lineTo(x + i * 4 + 2, py - 19 + breathe);
          ctx.fill();
        }
        break;
      case 'long':
        ctx.beginPath();
        ctx.ellipse(x, py - 16 + breathe, 10, 6, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Side hair
        ctx.fillRect(x - 10, py - 16 + breathe, 4, 14);
        ctx.fillRect(x + 6, py - 16 + breathe, 4, 14);
        break;
      case 'bun':
        ctx.beginPath();
        ctx.ellipse(x, py - 16 + breathe, 9, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, py - 22 + breathe, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'mohawk':
        ctx.fillRect(x - 2, py - 24 + breathe, 4, 10);
        ctx.fillRect(x - 3, py - 22 + breathe, 6, 4);
        break;
      case 'bald':
        // Just a slight shine
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.ellipse(x + 2, py - 17 + breathe, 3, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    // Face
    const headY = py - 12 + breathe;

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 4, headY - 2, 3, 3);
    ctx.fillRect(x + 1, headY - 2, 3, 3);

    // Pupils (look at monitor)
    ctx.fillStyle = '#1a1a1a';
    const blinkFrame = this.animFrame % 50;
    if (blinkFrame >= 48) {
      // Blink — closed eyes
      ctx.fillStyle = agent.skinTone;
      ctx.fillRect(x - 4, headY - 1, 3, 1);
      ctx.fillRect(x + 1, headY - 1, 3, 1);
    } else {
      ctx.fillRect(x - 3, headY - 1, 2, 2);
      ctx.fillRect(x + 2, headY - 1, 2, 2);
    }

    // Mouth
    ctx.fillStyle = '#1a1a1a';
    if (agent.status === 'working') {
      // Slight smile
      ctx.beginPath();
      ctx.arc(x, headY + 4, 3, 0.1, Math.PI - 0.1);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();
    } else if (agent.status === 'thinking') {
      // Hmm face
      ctx.fillRect(x - 2, headY + 3, 4, 1.5);
    } else {
      // Neutral
      ctx.fillRect(x - 1.5, headY + 3, 3, 1);
    }

    // Status indicator (floating above head)
    let statusColor = '#6a6a7a';
    if (agent.status === 'working') statusColor = '#00ffab';
    else if (agent.status === 'thinking') statusColor = '#ffbe0b';
    else if (agent.status === 'done') statusColor = '#00b4d8';

    const indicatorY = py - 28 + breathe;
    ctx.fillStyle = statusColor;
    const pr = agent.status === 'working' ? 3.5 + Math.sin(this.tick * 0.1) * 1 : 3;
    ctx.beginPath(); ctx.arc(x, indicatorY, pr, 0, Math.PI * 2); ctx.fill();
    // Glow
    ctx.fillStyle = statusColor + '20';
    ctx.beginPath(); ctx.arc(x, indicatorY, pr + 4, 0, Math.PI * 2); ctx.fill();

    // Thinking bubbles
    if (agent.status === 'thinking') {
      const t = this.tick * 0.04;
      for (let i = 0; i < 3; i++) {
        const bub = 1.5 + i * 0.8;
        const bubY = indicatorY - 6 - i * 7 + Math.sin(t + i) * 2;
        const bubX = x + 10 + i * 4;
        ctx.fillStyle = 'rgba(255,190,11,' + (0.5 - i * 0.12) + ')';
        ctx.beginPath(); ctx.arc(bubX, bubY, bub, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Keyboard on desk (in front of monitor)
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(x - 12, y + 26, 24, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeRect(x - 12, y + 26, 24, 5);
    // Key dots
    if (typing) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(x - 10 + i * 4, y + 27.5, 2, 2);
      }
    }

    // Name plate
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, x, y + 82);
    ctx.fillStyle = '#6a6a7a';
    ctx.font = '7px monospace';
    ctx.fillText(agent.role, x, y + 92);

    // Task label
    if (agent.task && (agent.status === 'working' || agent.status === 'thinking')) {
      const tw = ctx.measureText(agent.task).width + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - tw / 2, y + 95, tw, 12);
      ctx.strokeStyle = agent.color + '40';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x - tw / 2, y + 95, tw, 12);
      ctx.fillStyle = agent.color + 'bb';
      ctx.font = '7px monospace';
      ctx.fillText(agent.task, x, y + 104);
    }

    ctx.textAlign = 'left';
  }
}
