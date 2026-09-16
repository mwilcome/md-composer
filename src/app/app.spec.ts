import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { App } from './app';

/** Example Vitest spec. Replace with tests for your features. */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers],
    }).compileComponents();
  });

  it('renders the application shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main')).toBeTruthy();
  });
});
