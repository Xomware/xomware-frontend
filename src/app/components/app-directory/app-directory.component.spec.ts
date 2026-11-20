import { TestBed } from '@angular/core/testing';
import { AppDirectoryComponent } from './app-directory.component';

function render(): HTMLElement {
  TestBed.configureTestingModule({ imports: [AppDirectoryComponent] });
  const fixture = TestBed.createComponent(AppDirectoryComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function tile(root: HTMLElement, name: string): HTMLElement {
  const link = Array.from(root.querySelectorAll<HTMLAnchorElement>('.tile__link')).find(
    (a) => a.textContent?.trim() === name,
  );
  const li = link?.closest('.tile');
  if (!li) throw new Error(`no tile for ${name}`);
  return li as HTMLElement;
}

describe('AppDirectoryComponent', () => {
  it('marks the unfinished apps as Beta and work in progress', () => {
    const root = render();

    const t = tile(root, 'Xom Appétit');
    expect(t.querySelector('.status')?.textContent?.trim()).toBe('Beta');
    expect(t.querySelector('.tile__wip')?.textContent).toContain('Work in progress');
    expect(tile(root, 'Xomify').querySelector('.status')?.textContent?.trim()).toBe('Live');
    expect(tile(root, 'Xomify').querySelector('.tile__wip')).toBeNull();
  });

  it('lists Armchair Judge with separate links to its DWTS and Traitors apps', () => {
    const t = tile(render(), 'Armchair Judge');

    expect(t.querySelector<HTMLAnchorElement>('.tile__link')?.href).toBe('https://armchairjudge.com/');
    const subs = Array.from(t.querySelectorAll<HTMLAnchorElement>('.tile__sublink'));
    expect(subs.map((a) => [a.textContent?.trim(), a.href])).toEqual([
      ['Dancing with the Stars', 'https://dwts.armchairjudge.com/'],
      ['The Traitors', 'https://traitors.armchairjudge.com/'],
    ]);
  });

  it('shows each app by its banner where it has one, not its square mark', () => {
    const root = render();

    const xomify = tile(root, 'Xomify').querySelector<HTMLImageElement>('.tile__art');
    expect(xomify?.getAttribute('src')).toBe('assets/img/banners/xomify.webp');
    expect(xomify?.classList).not.toContain('tile__art--mark');
    const armchair = tile(root, 'Armchair Judge').querySelector<HTMLImageElement>('.tile__art');
    expect(armchair?.getAttribute('src')).toBe('assets/img/banners/armchair-judge.webp');
    expect(armchair?.classList).not.toContain('tile__art--mark');
  });

  it('labels each group with its factory line and numbers tiles straight through like the stations', () => {
    const root = render();

    const lines = Array.from(root.querySelectorAll('.group__line')).map((e) => e.textContent?.trim());
    expect(lines).toEqual(['Line A', 'Line B', 'Line C']);
    const bays = Array.from(root.querySelectorAll('.group')).map((g) =>
      Array.from(g.querySelectorAll('.tile__bay')).map((e) => e.textContent?.trim()),
    );
    expect(bays[0][0]).toBe('A-01');
    expect(bays[1][0]).toBe(`B-${String(bays[0].length + 1).padStart(2, '0')}`);
  });

  it('keeps admin-only tools off the public directory', () => {
    const names = Array.from(render().querySelectorAll('.tile__link')).map((a) => a.textContent?.trim());

    expect(names).not.toContain('Xomcron');
  });

  it('sends iOS testers to the contact page instead of showing an email address', () => {
    const root = render();
    const note = root.querySelector('#directory-ios')?.closest('.group__head')?.querySelector('.group__note');
    const link = note?.querySelector<HTMLAnchorElement>('a');

    expect(link?.textContent?.trim()).toBe('Request access');
    expect(link?.href).toBe('https://dominickgiordano.com/#contact');
    expect(root.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(root.textContent).not.toContain('@');
  });
});
