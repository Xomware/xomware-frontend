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
  selector: '[appAgentBlob]',
  templateUrl: './agent-blob.component.html',
  styleUrls: ['./agent-blob.component.scss'],
})
export class AgentBlobComponent implements AfterViewInit, OnDestroy {
  @Input() agent!: AgentBlob;
  @Output() blobClick = new EventEmitter<AgentBlob>();
  @Output() blobHover = new EventEmitter<{ agent: AgentBlob; entering: boolean }>();

  @ViewChild('blobGroup', { static: true }) blobGroupRef!: ElementRef<SVGGElement>;

  hoverEmoji = '👋';
  convoBubbleText = '';

  private blinkTimer: any;
  private signatureTimer: any;
  private idleTween: gsap.core.Tween | null = null;
  private prefersReducedMotion = false;
  private isTouchActive = false;
  private touchStartTime = 0;
  private clickCount = 0;

  private readonly agentEmojis: Record<string, string[]> = {
    boris: ['📨', '⚡', '🏃', '💬', '📱', '🔥', '😎'],
    forge: ['🔨', '🛠️', '💻', '🚀', '⚙️', '🏗️', '💪'],
    winston: ['☕', '✅', '🛡️', '👀', '🔍', '🚦', '💚'],
    rocco: ['🔬', '🧠', '📊', '🔮', '🎯', '📡', '🤓'],
    stormy: ['📝', '✍️', '📚', '🗂️', '💭', '🌊', '📖'],
    debo: ['🏗️', '🔧', '☁️', '🖥️', '⚡', '🔒', '💎'],
  };

  private readonly agentQuotes: Record<string, string[]> = {
    boris: ['Dispatching...', 'On it, boss!', 'Message sent! 📨', 'Roger that.', 'Spawning agents...'],
    forge: ['Building...', 'PR incoming!', 'Code shipped 🚀', 'Tests passing ✅', 'Hammering away...'],
    winston: ['All green ✓', 'Builds stable', 'Watching pipes...', 'CI clear! ☕', 'Nothing escapes me'],
    rocco: ['Analyzing...', 'Data says yes', 'Found something!', 'Interesting... 🔬', 'Pattern detected'],
    stormy: ['Documenting...', 'Memory saved', 'Context logged 📝', 'Writing it down', 'For posterity...'],
    debo: ['Infra solid 💪', 'Terraform clean', 'Servers humming', 'Zero downtime', 'All nodes green'],
  };

  get el(): SVGGElement {
    return this.blobGroupRef.nativeElement;
  }

  private mouseMoveHandler = (e: MouseEvent) => this.trackEyes(e);

  ngAfterViewInit(): void {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.startIdleAnimation();
    this.startBlink();
    this.startHaloPulse();
    if (!this.prefersReducedMotion) {
      this.scheduleSignature();
      document.addEventListener('mousemove', this.mouseMoveHandler);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.blinkTimer);
    clearTimeout(this.signatureTimer);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    gsap.killTweensOf(this.el);
    gsap.killTweensOf(this.el.querySelectorAll('*'));
  }

  onMouseEnter(): void {
    this.blobHover.emit({ agent: this.agent, entering: true });
    this.playWave();
    this.showRandomEmoji();
    gsap.to(this.el, {
      scale: 1.15,
      duration: 0.3,
      ease: 'back.out(1.7)',
      transformOrigin: 'center center',
    });
    gsap.to(this.el.querySelector('.agent-label'), {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
    // Color pulse on hover
    this.playColorPulse();
  }

  onMouseLeave(): void {
    this.blobHover.emit({ agent: this.agent, entering: false });
    gsap.to(this.el, {
      scale: this.agent.scale,
      duration: 0.3,
      ease: 'power2.out',
      transformOrigin: 'center center',
    });
    gsap.to(this.el.querySelector('.agent-label'), {
      opacity: 0,
      duration: 0.2,
    });
    gsap.to(this.el.querySelector('.hover-emoji'), {
      opacity: 0,
      duration: 0.2,
    });
  }

  onClick(): void {
    this.clickCount++;
    // Show conversation bubble on first click, open modal on second
    if (this.clickCount % 2 === 1) {
      this.showConvoBubble();
      this.playDanceAnimation();
    } else {
      this.blobClick.emit(this.agent);
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartTime = Date.now();
  }

  onTouchEnd(event: TouchEvent): void {
    event.preventDefault(); // Prevent ghost click / mouseenter
    const elapsed = Date.now() - this.touchStartTime;
    if (elapsed > 500) return; // Ignore long press

    if (!this.isTouchActive) {
      // First tap: show hover state + play wave
      this.isTouchActive = true;
      this.playWave();
      gsap.to(this.el, {
        scale: 1.15,
        duration: 0.3,
        ease: 'back.out(1.7)',
        transformOrigin: 'center center',
      });
      gsap.to(this.el.querySelector('.agent-label'), {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        if (this.isTouchActive) {
          this.dismissTouch();
        }
      }, 3000);
    } else {
      // Second tap: open modal
      this.dismissTouch();
      this.blobClick.emit(this.agent);
    }
  }

  private dismissTouch(): void {
    this.isTouchActive = false;
    gsap.to(this.el, {
      scale: this.agent.scale,
      duration: 0.3,
      ease: 'power2.out',
      transformOrigin: 'center center',
    });
    gsap.to(this.el.querySelector('.agent-label'), {
      opacity: 0,
      duration: 0.2,
    });
  }

  // ── Personality animations ──────────────────────────────
  private showRandomEmoji(): void {
    const emojis = this.agentEmojis[this.agent.name] || ['👋', '😊', '✨'];
    this.hoverEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const emojiEl = this.el.querySelector('.hover-emoji');
    if (!emojiEl) return;
    gsap.fromTo(emojiEl,
      { opacity: 0, y: 0, scale: 0.5 },
      {
        opacity: 1, y: -8, scale: 1.2,
        duration: 0.4,
        ease: 'back.out(2)',
        transformOrigin: 'center center',
      }
    );
  }

  private showConvoBubble(): void {
    const quotes = this.agentQuotes[this.agent.name] || ['Hey!'];
    this.convoBubbleText = quotes[Math.floor(Math.random() * quotes.length)];
    const bubble = this.el.querySelector('.convo-bubble');
    if (!bubble) return;
    gsap.fromTo(bubble,
      { opacity: 0, y: 10, scale: 0.8 },
      {
        keyframes: [
          { opacity: 1, y: 0, scale: 1, duration: 0.3 },
          { opacity: 1, y: 0, scale: 1, duration: 1.5 },
          { opacity: 0, y: -10, scale: 0.9, duration: 0.3 },
        ],
        transformOrigin: 'center bottom',
      }
    );
  }

  private playDanceAnimation(): void {
    if (this.prefersReducedMotion) return;
    // Quick wiggle dance
    gsap.to(this.el, {
      keyframes: [
        { rotation: -8, duration: 0.1 },
        { rotation: 8, duration: 0.1 },
        { rotation: -6, duration: 0.1 },
        { rotation: 6, duration: 0.1 },
        { rotation: 0, duration: 0.15 },
      ],
      transformOrigin: 'center bottom',
    });
    // Color flash on body
    const body = this.el.querySelector('.b-body');
    if (body) {
      gsap.to(body, {
        attr: { fill: '#ffffff' },
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          gsap.set(body, { attr: { fill: this.agent.color } });
        },
      });
    }
  }

  private playColorPulse(): void {
    if (this.prefersReducedMotion) return;
    const halo = this.el.querySelector('.b-halo');
    if (!halo) return;
    gsap.to(halo, {
      opacity: 0.5,
      attr: { rx: 32, ry: 28 },
      duration: 0.3,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });
  }

  // ── Wave arm on hover ──────────────────────────────
  private playWave(): void {
    if (this.prefersReducedMotion) return;
    const arm = this.el.querySelector('.arm-right');
    if (!arm) return;
    gsap.to(arm, {
      rotation: -35,
      transformOrigin: 'left center',
      duration: 0.22,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 5,
    });
  }

  // ── Idle animations per agent ──────────────────────────────
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

    // Universal breath squish on all blobs
    const body = this.el.querySelector('.b-body');
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

  // Boris: pacing left-right
  private animatePace(): void {
    gsap.to(this.el, {
      x: '+=40',
      duration: 1.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // Forge: hammering bounce + body squash
  private animateHammer(): void {
    const body = this.el.querySelector('.b-body');
    gsap.to(this.el, {
      y: '+=3',
      duration: 0.3,
      ease: 'power2.in',
      yoyo: true,
      repeat: -1,
    });
    if (body) {
      gsap.to(body, {
        attr: { ry: 13 },
        duration: 0.3,
        ease: 'power2.in',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // Winston: patrol walk + steam puffs
  private animatePatrol(): void {
    gsap.to(this.el, {
      x: '+=80',
      duration: 4,
      ease: 'none',
      yoyo: true,
      repeat: -1,
    });
    const steams = this.el.querySelectorAll('.steam-1, .steam-2');
    gsap.to(steams, {
      opacity: 0,
      y: '-=4',
      duration: 0.8,
      ease: 'sine.out',
      stagger: 0.2,
      repeat: -1,
      repeatDelay: 0.2,
    });
  }

  // Rocco: orbiting data dots
  private animateOrbit(): void {
    const dots = this.el.querySelectorAll('.data-dot-1, .data-dot-2, .data-dot-3');
    dots.forEach((dot, i) => {
      let angle = (i / dots.length) * Math.PI * 2;
      const radius = 28;
      const speed = 0.04 + i * 0.01;
      gsap.to({}, {
        duration: 999,
        repeat: -1,
        ease: 'none',
        onUpdate: function () {
          angle += speed;
          gsap.set(dot, {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.6,
          });
        },
      });
    });

    // Head tilt
    gsap.to(this.el, {
      rotation: 10,
      duration: 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // Stormy: quill writing oscillation
  private animateWrite(): void {
    const acc = this.el.querySelector('.accessory-group');
    if (acc) {
      gsap.to(acc, {
        x: '+=4',
        y: '+=2',
        duration: 0.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
    // Also gentle drift
    gsap.to(this.el, {
      y: '+=3',
      duration: 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // Debo: slow nod
  private animateNod(): void {
    gsap.to(this.el, {
      y: '+=2',
      duration: 2.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
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
    const bubble = this.el.querySelector('.status-bubble');
    const txt = this.el.querySelector('.status-text');
    if (!bubble || !txt) return;
    if (txt) (txt as SVGTextElement).textContent = '📨';
    gsap.fromTo(bubble,
      { opacity: 0, y: 0 },
      {
        keyframes: [
          { opacity: 1, y: -10, duration: 0.4 },
          { opacity: 0.9, y: -22, duration: 0.9 },
          { opacity: 0, y: -38, duration: 0.4 },
        ],
      }
    );
  }

  private sigForge(): void {
    const badge = this.el.querySelector('.pr-badge');
    if (!badge) return;
    gsap.fromTo(badge,
      { opacity: 0, y: 0 },
      {
        keyframes: [
          { opacity: 1, y: -12, duration: 0.5 },
          { opacity: 1, y: -28, duration: 0.9 },
          { opacity: 0, y: -44, duration: 0.4 },
        ],
      }
    );
  }

  private sigWinston(): void {
    const check = this.el.querySelector('.ci-check');
    if (!check) return;
    gsap.fromTo(check,
      { opacity: 0, y: 0, scale: 0.5 },
      {
        keyframes: [
          { opacity: 1, y: -10, scale: 1.2, duration: 0.3 },
          { opacity: 0.8, y: -22, scale: 1, duration: 0.8 },
          { opacity: 0, y: -36, duration: 0.4 },
        ],
        transformOrigin: 'center center',
      }
    );
  }

  private sigRocco(): void {
    const dots = this.el.querySelectorAll('.data-dot-1, .data-dot-2, .data-dot-3');
    gsap.to(dots, {
      scale: 2,
      opacity: 1,
      duration: 0.3,
      stagger: 0.1,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      transformOrigin: 'center center',
    });
  }

  private sigStormy(): void {
    const notebook = this.el.querySelector('.notebook');
    if (!notebook) return;
    gsap.fromTo(notebook,
      { opacity: 0.5, y: 0 },
      {
        keyframes: [
          { opacity: 1, y: -8, duration: 0.5 },
          { opacity: 1, y: -18, duration: 0.5 },
          { opacity: 0, y: -30, duration: 0.4 },
        ],
      }
    );
  }

  private sigDebo(): void {
    const server = this.el.querySelector('.server-glow');
    if (!server) return;
    gsap.fromTo(server,
      { opacity: 0.2 },
      {
        opacity: 0.9,
        duration: 0.4,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 3,
      }
    );
  }

  // ── Eye Tracking ──────────────────────────────
  private trackEyes(e: MouseEvent): void {
    const pupils = this.el.querySelectorAll('.b-pupil');
    if (!pupils.length) return;

    const svgEl = this.el.closest('svg');
    if (!svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const blobRect = this.el.getBoundingClientRect();
    const cx = blobRect.left + blobRect.width / 2;
    const cy = blobRect.top + blobRect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxMove = 1.8;
    const factor = Math.min(dist / 200, 1);

    const moveX = (dx / (dist || 1)) * maxMove * factor;
    const moveY = (dy / (dist || 1)) * maxMove * factor;

    pupils.forEach((pupil, i) => {
      const baseX = i === 0 ? -4.5 : 7.5;
      gsap.to(pupil, {
        attr: { cx: baseX + moveX, cy: -3 + moveY },
        duration: 0.15,
        ease: 'power2.out',
      });
    });
  }

  // ── Halo Pulse ──────────────────────────────
  private startHaloPulse(): void {
    if (this.prefersReducedMotion) return;
    const halo = this.el.querySelector('.b-halo');
    if (!halo) return;
    gsap.to(halo, {
      opacity: 0.3,
      attr: { rx: 28, ry: 24 },
      duration: 2 + Math.random(),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Blink ──────────────────────────────
  private startBlink(): void {
    const schedule = () => {
      this.blinkTimer = setTimeout(() => {
        const eyes = this.el.querySelector('.b-eyes');
        if (eyes) {
          gsap.to(eyes, {
            scaleY: 0.08,
            duration: 0.06,
            ease: 'power2.in',
            transformOrigin: '0px -3px',
            onComplete: () => {
              gsap.to(eyes, {
                scaleY: 1,
                duration: 0.1,
                ease: 'power2.out',
                delay: 0.04,
                transformOrigin: '0px -3px',
              });
            },
          });
        }
        schedule();
      }, 2500 + Math.random() * 3500);
    };
    schedule();
  }
}
