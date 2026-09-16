import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-md-icon',
  templateUrl: './md-icon.html',
})
export class MdIcon {
  readonly name = input.required<string>();
}
