import { TestBed } from '@angular/core/testing';
import { SpaceIntroComponent, claimIntro } from './space-intro.component';

function mockMotion(reduce: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({ matches: reduce } as MediaQueryList);
}

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
  function mount() {
    TestBed.configureTestingModule({ imports: [SpaceIntroComponent] });
    const fixture = TestBed.createComponent(SpaceIntroComponent);
    let done = 0;
    fixture.componentInstance.done.subscribe(() => done++);
    fixture.detectChanges();
    return { fixture, done: () => done };
  }

  it('finishes when Skip is pressed', () => {
    const { fixture, done } = mount();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.intro__skip')?.click();

    expect(done()).toBe(1);
  });

  it('finishes on Escape, once', () => {
    const { done } = mount();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(done()).toBe(1);
  });

  it('locks page scroll while it runs and gives it back after', () => {
    const { fixture } = mount();
    expect(document.documentElement.style.overflow).toBe('hidden');

    fixture.destroy();

    expect(document.documentElement.style.overflow).toBe('');
  });
});
