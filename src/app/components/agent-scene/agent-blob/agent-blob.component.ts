import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { AgentBlob } from '../../../models/agent.models';

@Component({
  selector: 'app-agent-blob',
  templateUrl: './agent-blob.component.html',
  styleUrls: ['./agent-blob.component.scss'],
})
export class AgentBlobComponent implements AfterViewInit, OnDestroy {
  @Input() agent!: AgentBlob;
  @Output() blobClick = new EventEmitter<AgentBlob>();
  @Output() blobHover = new EventEmitter<{ agent: AgentBlob; entering: boolean }>();

  @ViewChild('blobSvg', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  private blinkTimer: any;
  private signatureTimer: any;
  prefersReducedMotion = false;

  private get svg(): SVGSVGElement {
    return this.svgRef.nativeElement;
  }

  private qa(sel: string): Element[] {
    return Array.from(this.svg.querySelectorAll(sel));
  }

  ngAfterViewInit(): void {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Apply initial scale via GSAP on the SVG itself
    gsap.set(this.svg, { scale: this.agent.scale, transformOrigin: 'center center' });

    // Show name label hidden initially
    gsap.set(this.svg.querySelector('.agent-label'), { opacity: 0 });

    this.startIdleAnimation();
    this.startBlink();
    if (!this.prefersReducedMotion) {
      this.scheduleSignature();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.blinkTimer);
    clearTimeout(this.signatureTimer);
    gsap.killTweensOf(this.svg);
    gsap.killTweensOf(this.qa('*'));
  }

  onMouseEnter(): void {
    this.blobHover.emit({ agent: this.agent, entering: true });
    this.playWave();
    gsap.to(this.svg, {
      scale: this.agent.scale * 1.15,
      duration: 0.3,
      ease: 'back.out(1.7)',
      transformOrigin: 'center center',
    });
    gsap.to(this.svg.querySelector('.agent-label'), {
      opacity: 1,
      duration: 0.3,
    });
  }

  onMouseLeave(): void {
    this.blobHover.emit({ agent: this.agent, entering: false });
    gsap.to(this.svg, {
      scale: this.agent.scale,
      duration: 0.3,
      ease: 'power2.out',
      transformOrigin: 'center center',
    });
    gsap.to(this.svg.querySelector('.agent-label'), {
      opacity: 0,
      duration: 0.2,
    });
  }

  onClick(): void {
    this.blobClick.emit(this.agent);
  }

  // ── Public wave (called from scene orchestrator) ──
  wave(delay = 0): void {
    if (this.prefersReducedMotion) return;
    const arm = this.svg.querySelector('.arm-right');
    if (!arm) return;
    gsap.to(arm, {
      rotation: -35,
      transformOrigin: 'left center',
      duration: 0.22,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 5,
      delay,
    });
  }

  // ── Private: Wave on hover ──
  private playWave(): void {
    this.wave(0);
  }

  // ── Idle animations ──────────────────────────────
  private startIdleAnimation(): void {
    if (this.prefersReducedMotion) return;

    switch (this.agent.idleAnimation) {
      case 'pace':    this.animatePace(); break;
      case 'hammer':  this.animateHammer(); break;
      case 'patrol':  this.animatePatrol(); break;
      case 'orbit':   this.animateOrbit(); break;
      case 'write':   this.animateWrite(); break;
      case 'nod':     this.animateNod(); break;
    }

    // Universal breathing squish
    const body = this.svg.querySelector('.b-body');
    if (body) {
      gsap.to(body, {
        attr: { ry: 17 },
        duration: 1.8 + Math.random() * 0.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: Math.random(),
      });
    }
  }

  private animatePace(): void {
    gsap.to(this.svg, {
      x: '+=40',
      duration: 1.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private animateHammer(): void {
    const body = this.svg.querySelector('.b-body');
    gsap.to(this.svg, { y: '+=3', duration: 0.3, ease: 'power2.in', yoyo: true, repeat: -1 });
    if (body) {
      gsap.to(body, { attr: { ry: 13 }, duration: 0.3, ease: 'power2.in', yoyo: true, repeat: -1 });
    }
  }

  private animatePatrol(): void {
    gsap.to(this.svg, { x: '+=60', duration: 4, ease: 'none', yoyo: true, repeat: -1 });
    const steams = this.qa('.steam-1, .steam-2');
    if (steams.length) {
      gsap.to(steams, { opacity: 0, y: '-=4', duration: 0.8, ease: 'sine.out', stagger: 0.2, repeat: -1, repeatDelay: 0.2 });
    }
  }

  private animateOrbit(): void {
    const dots = this.qa('.data-dot-1, .data-dot-2, .data-dot-3');
    dots.forEach((dot, i) => {
      let angle = (i / dots.length) * Math.PI * 2;
      const radius = 26;
      const speed = 0.04 + i * 0.01;
      gsap.to({}, {
        duration: 9999,
        repeat: -1,
        ease: 'none',
        onUpdate: function () {
          angle += speed;
          gsap.set(dot, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.6 });
        },
      });
    });
    gsap.to(this.svg, { rotation: 8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  private animateWrite(): void {
    const acc = this.svg.querySelector('g:not(.b-eyes):not(.b-mouth)');
    gsap.to(this.svg, { y: '+=3', duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  private animateNod(): void {
    gsap.to(this.svg, { y: '+=2', duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // ── Signature animations ──────────────────────────────
  private scheduleSignature(): void {
    const delay = 8000 + Math.random() * 7000;
    this.signatureTimer = setTimeout(() => {
      this.playSignature();
      this.scheduleSignature();
    }, delay);
  }

  private playSignature(): void {
    switch (this.agent.name) {
      case 'boris':   this.sigBoris(); break;
      case 'forge':   this.sigForge(); break;
      case 'winston': this.sigWinston(); break;
      case 'rocco':   this.sigRocco(); break;
      case 'stormy':  this.sigStormy(); break;
      case 'debo':    this.sigDebo(); break;
    }
  }

  private sigBoris(): void {
    const bubble = this.svg.querySelector('.status-bubble');
    if (!bubble) return;
    gsap.fromTo(bubble, { opacity: 0, y: 0 }, {
      keyframes: [
        { opacity: 1, y: -8, duration: 0.4 },
        { opacity: 0.9, y: -20, duration: 0.9 },
        { opacity: 0, y: -36, duration: 0.4 },
      ],
    });
  }

  private sigForge(): void {
    const badge = this.svg.querySelector('.pr-badge');
    if (!badge) return;
    gsap.fromTo(badge, { opacity: 0, y: 0 }, {
      keyframes: [
        { opacity: 1, y: -10, duration: 0.5 },
        { opacity: 1, y: -26, duration: 0.9 },
        { opacity: 0, y: -42, duration: 0.4 },
      ],
    });
  }

  private sigWinston(): void {
    const check = this.svg.querySelector('.ci-check');
    if (!check) return;
    gsap.fromTo(check, { opacity: 0, y: 0, scale: 0.5 }, {
      keyframes: [
        { opacity: 1, y: -8, scale: 1.2, duration: 0.3 },
        { opacity: 0.8, y: -20, scale: 1, duration: 0.8 },
        { opacity: 0, y: -34, duration: 0.4 },
      ],
      transformOrigin: 'center center',
    });
  }

  private sigRocco(): void {
    const dots = this.qa('.data-dot-1, .data-dot-2, .data-dot-3');
    gsap.to(dots, {
      scale: 2.5, opacity: 1, duration: 0.3,
      stagger: 0.1, yoyo: true, repeat: 3,
      ease: 'sine.inOut', transformOrigin: 'center center',
    });
  }

  private sigStormy(): void {
    const nb = this.svg.querySelector('.notebook');
    if (!nb) return;
    gsap.fromTo(nb, { opacity: 0.5, y: 0 }, {
      keyframes: [
        { opacity: 1, y: -6, duration: 0.5 },
        { opacity: 1, y: -16, duration: 0.5 },
        { opacity: 0, y: -28, duration: 0.4 },
      ],
    });
  }

  private sigDebo(): void {
    const glows = this.qa('.server-glow');
    gsap.fromTo(glows, { opacity: 0.2 }, {
      opacity: 0.95, duration: 0.4, ease: 'power2.inOut', yoyo: true, repeat: 3,
    });
  }

  // ── Blink ──────────────────────────────
  private startBlink(): void {
    const schedule = () => {
      this.blinkTimer = setTimeout(() => {
        const eyes = this.svg.querySelector('.b-eyes');
        if (eyes) {
          gsap.to(eyes, {
            scaleY: 0.08, duration: 0.06, ease: 'power2.in', transformOrigin: '0px -3px',
            onComplete: () => {
              gsap.to(eyes, { scaleY: 1, duration: 0.1, ease: 'power2.out', delay: 0.04, transformOrigin: '0px -3px' });
            },
          });
        }
        schedule();
      }, 2500 + Math.random() * 3500);
    };
    schedule();
  }
}
