import { Component, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { claimIntro } from '../space-intro/space-intro.component';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  /** Claimed before the first render, so the page never shows and then gets covered. */
  readonly introActive = signal(claimIntro());
  /** The intro's ship has hit and the page is arriving under the blast. */
  readonly arriving = signal(false);

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initScrollAnimations();
    }, 100);
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  private initScrollAnimations(): void {
    // Hero fade out on scroll
    gsap.to('.hero-content', {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
      },
      opacity: 0,
      y: -50,
    });

    // Section headers slide in
    gsap.utils.toArray('.section-header').forEach((header: unknown) => {
      gsap.from(header as gsap.TweenTarget, {
        scrollTrigger: {
          trigger: header as Element,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // Footer slide in
    gsap.from('.footer-inner', {
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      },
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out',
    });

    ScrollTrigger.refresh();
  }
}
