import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

/** Example Vitest spec. Replace with tests for your features. */
describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
  });

  it('renders its template', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')).toBeTruthy();
  });
});
