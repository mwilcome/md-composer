import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

/** Example Vitest spec. Replace with tests for your features. */
describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
  });

  it('renders its template', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')).toBeTruthy();
  });
});
