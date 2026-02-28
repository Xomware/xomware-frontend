import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  HostListener,
} from '@angular/core';
import { AgentBlob } from '../../../models/agent.models';
import { AgentBlobComponent } from '../agent-blob/agent-blob.component';

@Component({
  selector: 'app-agent-scene',
  templateUrl: './agent-scene.component.html',
  styleUrls: ['./agent-scene.component.scss'],
})
export class AgentSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sceneStage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChildren(AgentBlobComponent) blobComponents!: QueryList<AgentBlobComponent>;

  selectedAgent: AgentBlob | null = null;
  isMobile = window.innerWidth < 768;

  private intersectionObserver: IntersectionObserver | null = null;
  private hasWaved = false;

  readonly agents: AgentBlob[] = [
    {
      name: 'boris',
      displayName: 'Boris',
      role: 'iMessage Dispatcher',
      color: '#00b4d8',
      scale: 1.0,
      startX: 30,
      startY: 60,
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
      startX: 120,
      startY: 45,
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
      startX: 210,
      startY: 65,
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
      startY: 55,
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
      startX: 390,
      startY: 68,
      idleAnimation: 'write',
      signatureAnimation: 'write',
      currentTask: 'Documenting today\'s decisions',
      lastAction: 'Updated MEMORY.md',
    },
    {
      name: 'debo',
      displayName: 'Debo',
      role: 'Infrastructure Agent',
      color: '#E74C3C',
      scale: 1.15,
      startX: 470,
      startY: 50,
      idleAnimation: 'nod',
      signatureAnimation: 'nod',
      currentTask: 'Watching infra on 4 nodes',
      lastAction: 'Terraform apply: success',
    },
  ];

  get visibleAgents(): AgentBlob[] {
    if (this.isMobile) {
      return this.agents.filter(a => ['boris', 'forge', 'winston'].includes(a.name));
    }
    return this.agents;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  ngAfterViewInit(): void {
    this.setupScrollTrigger();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  onAgentClick(agent: AgentBlob): void {
    this.selectedAgent = agent;
  }

  onModalClose(): void {
    this.selectedAgent = null;
  }

  onBlobHover(_event: { agent: AgentBlob; entering: boolean }): void {
    // Available for cross-agent reactions
  }

  // ── Scroll-into-view: all agents wave simultaneously ──
  private setupScrollTrigger(): void {
    const target = this.stageRef.nativeElement;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.hasWaved) {
          this.hasWaved = true;
          this.blobComponents.forEach((blob, i) => blob.wave(i * 0.15));
          this.intersectionObserver?.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    this.intersectionObserver.observe(target);
  }
}
