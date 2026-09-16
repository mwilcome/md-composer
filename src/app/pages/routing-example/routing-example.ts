import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/** Example page. Replace with a real feature. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-routing-example',
  styleUrl: './routing-example.scss',
  templateUrl: './routing-example.html',
})
export class RoutingExample {
  protected readonly showHint = signal(false);

  protected toggleHint(): void {
    this.showHint.update((value) => !value);
  }
}
