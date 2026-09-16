import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Starter 404. Keep a wildcard route; replace the copy as needed. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-not-found',
  styleUrl: './not-found.scss',
  templateUrl: './not-found.html',
})
export class NotFound {}
