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

    for (const name of ['Xom Appétit', 'Xom Forms']) {
      const t = tile(root, name);
      expect(t.querySelector('.status')?.textContent?.trim()).toBe('Beta');
      expect(t.querySelector('.tile__wip')?.textContent).toContain('Work in progress');
    }
    expect(tile(root, 'Xomify').querySelector('.status')?.textContent?.trim()).toBe('Live');
    expect(tile(root, 'Xomify').querySelector('.tile__wip')).toBeNull();
  });

  it('lists Armchair Judge with a separate link to its DWTS app', () => {
    const t = tile(render(), 'Armchair Judge');

    expect(t.querySelector<HTMLAnchorElement>('.tile__link')?.href).toBe('https://armchairjudge.com/');
    const sub = t.querySelector<HTMLAnchorElement>('.tile__sublink');
    expect(sub?.textContent).toContain('Dancing with the Stars');
    expect(sub?.href).toBe('https://dwts.armchairjudge.com/');
  });

  it('shows each app by its banner where it has one, not its square mark', () => {
    const root = render();

    const xomify = tile(root, 'Xomify').querySelector<HTMLImageElement>('.tile__art');
    expect(xomify?.getAttribute('src')).toBe('assets/img/banners/xomify.webp');
    expect(xomify?.classList).not.toContain('tile__art--mark');
    // Armchair Judge has no banner yet; its mark keeps a square slot.
    const armchair = tile(root, 'Armchair Judge').querySelector<HTMLImageElement>('.tile__art');
    expect(armchair?.classList).toContain('tile__art--mark');
  });

  it('keeps admin-only tools off the public directory', () => {
    const names = Array.from(render().querySelectorAll('.tile__link')).map((a) => a.textContent?.trim());

    expect(names).not.toContain('Xomcron');
  });
});
