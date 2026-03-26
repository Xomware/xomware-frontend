import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';

@Component({
  selector: 'app-monster',
  templateUrl: './monster.component.html',
  styleUrls: ['./monster.component.scss'],
})
export class MonsterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('blobSvg', { static: true }) svgRef!: ElementRef<SVGElement>;

  private readonly NUM_BLOBS = 6;
  private readonly SCALES = [80, 100, 120, 65, 90, 75];
  private readonly BRAND_COLORS = [
    '#00e5ff', // brand cyan
    '#a855f7', // xomify purple
    '#f97316', // xomcloud orange
    '#10b981', // xomper emerald
  ];
  private readonly START_POS = [
    [300, 200], [900, 400], [1500, 300], [600, 700], [1200, 600], [200, 900],
  ];

  private reducedMotion = false;

  ngAfterViewInit(): void {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initBlobs();

    if (this.reducedMotion) {
      this.placeStatic();
    } else {
      this.startAmbient();
    }
  }

  ngOnDestroy(): void {
    this.killAll();
  }

  private get svg(): SVGElement {
    return this.svgRef.nativeElement;
  }

  private qa(selector: string): Element[] {
    return Array.from(this.svg.querySelectorAll(selector));
  }

  private blob(i: number): Element | null {
    return this.svg.querySelector(`.blob-${i}`);
  }

  private initBlobs(): void {
    for (let i = 0; i < this.NUM_BLOBS; i++) {
      const el = this.blob(i);
      if (!el) continue;
      const scale = this.SCALES[i];
      gsap.set(el, {
        x: this.START_POS[i][0],
        y: this.START_POS[i][1],
        scale: scale / 18, // base ellipse rx=18, so scale factor = desired/18
      });
    }
  }

  private placeStatic(): void {
    // Reduced motion: place blobs at spread-out positions, assign colors, no animation
    for (let i = 0; i < this.NUM_BLOBS; i++) {
      const body = this.blob(i)?.querySelector('.b-body');
      if (!body) continue;
      const color = this.BRAND_COLORS[i % this.BRAND_COLORS.length];
      gsap.set(body, { attr: { fill: color } });
    }
  }

  private startAmbient(): void {
    for (let i = 0; i < this.NUM_BLOBS; i++) {
      this.wanderBlob(i);
      this.breatheBlob(i);
      this.cycleColor(i);
    }
  }

  private wanderBlob(index: number): void {
    const el = this.blob(index);
    if (!el) return;

    const x = 100 + Math.random() * 1720; // 0-90% of 1920
    const y = 50 + Math.random() * 980;    // 0-90% of 1080
    const duration = 8 + Math.random() * 7; // 8-15s

    gsap.to(el, {
      x,
      y,
      duration,
      ease: 'sine.inOut',
      onComplete: () => this.wanderBlob(index),
    });
  }

  private breatheBlob(index: number): void {
    const body = this.blob(index)?.querySelector('.b-body');
    if (!body) return;

    gsap.to(body, {
      attr: { ry: 18 },
      duration: 3 + Math.random() * 2, // 3-5s cycle
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: Math.random() * 2,
    });
  }

  private cycleColor(index: number): void {
    const body = this.blob(index)?.querySelector('.b-body');
    if (!body) return;

    const startColorIndex = index % this.BRAND_COLORS.length;
    const colors = [
      ...this.BRAND_COLORS.slice(startColorIndex),
      ...this.BRAND_COLORS.slice(0, startColorIndex),
    ];

    const tl = gsap.timeline({ repeat: -1, delay: index * 5 });

    colors.forEach((color) => {
      tl.to(body, {
        attr: { fill: color },
        duration: 30 + Math.random() * 30, // 30-60s per transition
        ease: 'sine.inOut',
      });
    });
  }

  private killAll(): void {
    const allEls = this.qa('*');
    gsap.killTweensOf(allEls);

    for (let i = 0; i < this.NUM_BLOBS; i++) {
      const el = this.blob(i);
      if (el) gsap.killTweensOf(el);
    }
  }
}
