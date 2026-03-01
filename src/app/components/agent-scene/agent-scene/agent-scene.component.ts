import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { AgentBlob, AGENTS } from '../../../models/agent.models';

@Component({
  selector: 'app-agent-scene',
  templateUrl: './agent-scene.component.html',
  styleUrls: ['./agent-scene.component.scss'],
})
export class AgentSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sceneSvg', { static: false }) sceneSvgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('sceneSvgMobile', { static: false }) sceneSvgMobileRef!: ElementRef<SVGSVGElement>;

  selectedAgent: AgentBlob | null = null;

  private proximityInterval: any;
  private intersectionObserver: IntersectionObserver | null = null;
  private hasWaved = false;
  private agentPositions: Map<string, { x: number; y: number }> = new Map();

  /** Agents sourced from shared AGENTS constant — single source of truth */
  readonly agents: AgentBlob[] = AGENTS;

  /** Agents to show on mobile (reduced) */
  get mobileAgents(): AgentBlob[] {
    return this.agents.filter(a => ['boris', 'forge', 'winston'].includes(a.name));
  }

  /** Mobile 3×2 grid positions */
  getMobileX(index: number): number {
    const col = index % 3;
    return 55 + col * 100; // 55, 155, 255
  }

  getMobileY(index: number): number {
    const row = Math.floor(index / 3);
    return 55 + row * 110; // row 0: 55, row 1: 165
  }

  ngAfterViewInit(): void {
    this.initAgentPositions();
    this.setupScrollTrigger();
    this.startProximityCheck();
  }

  ngOnDestroy(): void {
    clearInterval(this.proximityInterval);
    this.intersectionObserver?.disconnect();
  }

  onAgentClick(agent: AgentBlob): void {
    this.selectedAgent = agent;
  }

  onModalClose(): void {
    this.selectedAgent = null;
  }

  onBlobHover(event: { agent: AgentBlob; entering: boolean }): void {
    // Track for analytics or cross-agent reactions if desired
  }

  // ── Positions ──────────────────────────────
  private initAgentPositions(): void {
    this.agents.forEach(a => {
      this.agentPositions.set(a.name, { x: a.startX, y: a.startY });
    });
  }

  // ── Scroll trigger — wave on view ──────────────────────────────
  private setupScrollTrigger(): void {
    const target = (this.sceneSvgRef || this.sceneSvgMobileRef)?.nativeElement;
    if (!target) return;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.hasWaved) {
          this.hasWaved = true;
          this.allAgentsWave();
          this.intersectionObserver?.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    this.intersectionObserver.observe(target);
  }

  private allAgentsWave(): void {
    const svg = (this.sceneSvgRef || this.sceneSvgMobileRef)?.nativeElement;
    if (!svg) return;
    const arms = svg.querySelectorAll('.arm-right');
    arms.forEach((arm, i) => {
      gsap.to(arm, {
        rotation: -35,
        transformOrigin: 'left center',
        duration: 0.22,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 5,
        delay: i * 0.15,
      });
    });
  }

  // ── Collision / proximity detection ──────────────────────────────
  private startProximityCheck(): void {
    this.proximityInterval = setInterval(() => {
      this.checkAgentProximity();
    }, 500);
  }

  private checkAgentProximity(): void {
    const agentList = this.agents;
    for (let i = 0; i < agentList.length; i++) {
      for (let j = i + 1; j < agentList.length; j++) {
        const posA = this.agentPositions.get(agentList[i].name);
        const posB = this.agentPositions.get(agentList[j].name);
        if (!posA || !posB) continue;
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 35) {
          this.triggerCollision(agentList[i].name, agentList[j].name);
        }
      }
    }
  }

  private triggerCollision(a: string, b: string): void {
    const emojis = ['😂', '🤝', '👋', '💪', '🎉'];
    const svg = this.sceneSvgRef.nativeElement;
    const blobA = svg.querySelector(`[data-agent="${a}"]`);
    const blobB = svg.querySelector(`[data-agent="${b}"]`);
    if (!blobA || !blobB) return;

    // Bounce apart
    gsap.to(blobA, { x: '-=12', duration: 0.3, ease: 'back.out(2)' });
    gsap.to(blobB, { x: '+=12', duration: 0.3, ease: 'back.out(2)' });

    // 40% chance: emoji pop
    if (Math.random() < 0.4) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      this.showEmojiPop(blobA, emoji);
    }
  }

  private showEmojiPop(blobEl: Element, emoji: string): void {
    const svg = this.sceneSvgRef.nativeElement;
    const ns = 'http://www.w3.org/2000/svg';
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('font-size', '14');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('x', '0');
    text.setAttribute('y', '0');
    text.textContent = emoji;
    blobEl.appendChild(text);

    gsap.fromTo(text,
      { opacity: 0, y: 0 },
      {
        keyframes: [
          { opacity: 1, y: -10, duration: 0.3 },
          { opacity: 0.8, y: -28, duration: 0.6 },
          { opacity: 0, y: -44, duration: 0.3 },
        ],
        onComplete: () => text.remove(),
      }
    );
  }
}
