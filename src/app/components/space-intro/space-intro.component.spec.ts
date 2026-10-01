import { TestBed } from '@angular/core/testing';
import { INTRO_END, INTRO_IMPACT } from '../../space/intro-timing';
import { INTRO_PATIENCE, IntroView, SpaceIntroComponent, claimIntro, introStage } from './space-intro.component';

function mockMotion(reduce: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({ matches: reduce } as MediaQueryList);
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

describe('claimIntro', () => {
  it('never plays under reduced motion', () => {
    mockMotion(true);
    expect(claimIntro()).toBeFalse();
  });

  it('plays once per page load', () => {
    mockMotion(false);
    expect(claimIntro()).toBeTrue();
    expect(claimIntro()).toBeFalse();
  });
});

describe('SpaceIntroComponent', () => {
  let scene: jasmine.SpyObj<IntroView>;

  beforeEach(() => {
    scene = jasmine.createSpyObj<IntroView>('scene', ['resize', 'draw', 'dispose']);
  });

  function mount() {
    TestBed.configureTestingModule({ imports: [SpaceIntroComponent] });
    const fixture = TestBed.createComponent(SpaceIntroComponent);
    let done = 0;
    let impact = 0;
    fixture.componentInstance.done.subscribe(() => done++);
    fixture.componentInstance.impact.subscribe(() => impact++);
    fixture.detectChanges();
    return { fixture, done: () => done, impact: () => impact };
  }

  // The scene's promise settles, then its first frame draws.
  async function settle(): Promise<void> {
    await Promise.resolve();
    await frame();
    await frame();
  }

  it('draws the scene from its own first frame, then uncovers the page', async () => {
    spyOn(introStage, 'open').and.resolveTo(scene);
    const { fixture } = mount();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).not.toContain('is-drawn');

    await settle();

    expect(scene.draw.calls.first().args[0]).toBe(0);
    expect(host.classList).toContain('is-drawn');
    fixture.destroy();
  });

  it('signals the impact and finishes on the scene clock', async () => {
    spyOn(introStage, 'open').and.resolveTo(scene);
    let now = 1000;
    spyOn(performance, 'now').and.callFake(() => now);
    const { fixture, done, impact } = mount();
    await settle();

    now += INTRO_IMPACT * 1000;
    await frame();
    expect(impact()).toBe(1);
    expect(done()).toBe(0);

    now += (INTRO_END - INTRO_IMPACT) * 1000;
    await frame();
    expect(done()).toBe(1);
    fixture.destroy();
  });

  it('goes straight to the page without WebGL 2', async () => {
    spyOn(introStage, 'open').and.resolveTo(null);
    const { done } = mount();
    await settle();
    expect(done()).toBe(1);
  });

  it('goes straight to the page when the scene fails to load', async () => {
    spyOn(introStage, 'open').and.rejectWith(new Error('chunk failed'));
    const { done } = mount();
    await settle();
    expect(done()).toBe(1);
  });

  it('gives up on a scene that never arrives', () => {
    jasmine.clock().install();
    try {
      spyOn(introStage, 'open').and.returnValue(new Promise<IntroView | null>(() => undefined));
      const { done } = mount();

      jasmine.clock().tick(INTRO_PATIENCE);

      expect(done()).toBe(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('finishes when Skip is pressed', () => {
    spyOn(introStage, 'open').and.resolveTo(scene);
    const { fixture, done } = mount();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.intro__skip')?.click();

    expect(done()).toBe(1);
  });

  it('finishes on Escape, once', () => {
    spyOn(introStage, 'open').and.resolveTo(scene);
    const { done } = mount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(done()).toBe(1);
  });

  it('locks page scroll while it runs, and gives it and the GPU back after', async () => {
    spyOn(introStage, 'open').and.resolveTo(scene);
    const { fixture } = mount();
    expect(document.documentElement.style.overflow).toBe('hidden');
    await settle();

    fixture.destroy();

    expect(document.documentElement.style.overflow).toBe('');
    expect(scene.dispose).toHaveBeenCalled();
  });
});
