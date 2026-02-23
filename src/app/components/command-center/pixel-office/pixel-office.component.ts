import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

interface Agent {
  name: string;
  role: string;
  status: 'idle' | 'working' | 'thinking' | 'done';
  x: number;
  y: number;
  desk: { x: number; y: number; w: number; h: number };
  color: string;
  task?: string;
  frame: number;
}

@Component({
  selector: 'app-pixel-office',
  templateUrl: './pixel-office.component.html',
  styleUrls: ['./pixel-office.component.scss'],
})
export class PixelOfficeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('officeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animFrame = 0;
  private rafId = 0;
  private tick = 0;

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
      name: 'Jarvis',
      role: 'Lead Orchestrator',
      status: 'working',
      x: 120, y: 180,
      desk: { x: 80, y: 160, w: 80, h: 50 },
      color: '#00b4d8',
      task: 'Building Command Center',
      frame: 0,
    },
    {
      name: 'Forge',
      role: 'Code & Build Agent',
      status: 'idle',
      x: 300, y: 180,
      desk: { x: 260, y: 160, w: 80, h: 50 },
      color: '#9c0abf',
      frame: 0,
    },
    {
      name: 'Recon',
      role: 'Research & Analysis Agent',
      status: 'thinking',
      x: 480, y: 180,
      desk: { x: 440, y: 160, w: 80, h: 50 },
      color: '#ff6b35',
      task: 'Analyzing best practices',
      frame: 0,
    },
    {
      name: 'Watchtower',
      role: 'Monitor & Alerting Agent',
      status: 'idle',
      x: 120, y: 320,
      desk: { x: 80, y: 300, w: 80, h: 50 },
      color: '#00ffab',
      frame: 0,
    },
    {
      name: 'Scribe',
      role: 'Docs & Memory Agent',
      status: 'idle',
      x: 300, y: 320,
      desk: { x: 260, y: 300, w: 80, h: 50 },
      color: '#ffbe0b',
      frame: 0,
    },
    {
      name: 'Deployer',
      role: 'CI/CD & Infra Agent',
      status: 'idle',
      x: 480, y: 320,
      desk: { x: 440, y: 300, w: 80, h: 50 },
      color: '#ff5252',
      frame: 0,
    },
  ];

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = 600;
    canvas.height = 460;
    this.ctx = canvas.getContext('2d')!;
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private animate = (): void => {
    this.tick++;
    if (this.tick % 8 === 0) {
      this.animFrame++;
      this.agents.forEach(a => a.frame = this.animFrame);
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.animate);
  };

  private draw(): void {
    const ctx = this.ctx;
    const w = 600, h = 460;

    // Background — dark office floor
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Floor grid (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Title bar
    ctx.fillStyle = 'rgba(0,180,216,0.08)';
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = '#00b4d8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('🏢 XOMWARE HQ — Agent Office', 16, 26);

    // Current time
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    ctx.fillStyle = '#6a6a7a';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(time, w - 16, 26);
    ctx.textAlign = 'left';

    // Draw each agent's workspace
    this.agents.forEach(agent => this.drawAgent(ctx, agent));

    // Legend
    this.drawLegend(ctx, w, h);
  }

  private drawAgent(ctx: CanvasRenderingContext2D, agent: Agent): void {
    const d = agent.desk;

    // Desk
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeRect(d.x, d.y, d.w, d.h);

    // Monitor on desk
    const monX = d.x + d.w / 2 - 12;
    const monY = d.y + 5;
    ctx.fillStyle = agent.status === 'working' ? agent.color : '#2a2a3e';
    ctx.fillRect(monX, monY, 24, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(monX, monY, 24, 16);

    // Screen glow when working
    if (agent.status === 'working') {
      ctx.fillStyle = agent.color + '15';
      ctx.fillRect(monX - 8, monY - 4, 40, 28);

      // Scrolling code lines
      for (let i = 0; i < 4; i++) {
        const lineY = monY + 3 + i * 3;
        const lineW = 6 + ((agent.frame + i * 3) % 12);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(monX + 2, lineY, Math.min(lineW, 19), 1);
      }
    }

    // Agent body (pixel character)
    const bx = agent.x;
    const by = agent.y + d.h + 8;
    const bounce = agent.status === 'working' ? Math.sin(this.tick * 0.15) * 2 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 22, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = agent.color;
    ctx.fillRect(bx - 6, by - 12 + bounce, 12, 16);

    // Head
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bx - 5, by - 20 + bounce, 10, 8);

    // Eyes
    ctx.fillStyle = '#0a0a14';
    const blinkFrame = this.animFrame % 40;
    const eyeH = blinkFrame === 0 ? 1 : 2;
    ctx.fillRect(bx - 3, by - 17 + bounce, 2, eyeH);
    ctx.fillRect(bx + 1, by - 17 + bounce, 2, eyeH);

    // Status indicator
    let statusColor = '#6a6a7a';
    if (agent.status === 'working') statusColor = '#00ffab';
    else if (agent.status === 'thinking') statusColor = '#ffbe0b';
    else if (agent.status === 'done') statusColor = '#00b4d8';

    ctx.fillStyle = statusColor;
    const pulseR = agent.status === 'working' ? 4 + Math.sin(this.tick * 0.1) : 3;
    ctx.beginPath();
    ctx.arc(bx, by - 28 + bounce, pulseR, 0, Math.PI * 2);
    ctx.fill();

    // Thinking bubbles
    if (agent.status === 'thinking') {
      const t = this.tick * 0.05;
      for (let i = 0; i < 3; i++) {
        const bub = 2 + i;
        const bubY = by - 32 - i * 8 + Math.sin(t + i) * 3;
        const bubX = bx + 12 + i * 5;
        ctx.fillStyle = 'rgba(255,190,11,0.4)';
        ctx.beginPath();
        ctx.arc(bubX, bubY + bounce, bub, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Name label
    ctx.fillStyle = agent.color;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, bx, by + 30);

    // Role
    ctx.fillStyle = '#6a6a7a';
    ctx.font = '8px monospace';
    ctx.fillText(agent.role, bx, by + 40);

    // Task label
    if (agent.task && (agent.status === 'working' || agent.status === 'thinking')) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      const taskW = ctx.measureText(agent.task).width + 12;
      ctx.fillRect(bx - taskW / 2, by + 44, taskW, 14);
      ctx.fillStyle = '#8a8a9a';
      ctx.font = '8px monospace';
      ctx.fillText(agent.task, bx, by + 54);
    }

    ctx.textAlign = 'left';
  }

  private drawLegend(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const legends = [
      { color: '#00ffab', label: 'Working' },
      { color: '#ffbe0b', label: 'Thinking' },
      { color: '#6a6a7a', label: 'Idle' },
      { color: '#00b4d8', label: 'Done' },
    ];

    const ly = h - 24;
    let lx = 16;
    ctx.font = '9px monospace';

    legends.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(lx + 4, ly, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6a6a7a';
      ctx.fillText(l.label, lx + 12, ly + 3);
      lx += ctx.measureText(l.label).width + 28;
    });
  }
}
