import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { appTitle, siteUrl } from '../../core/site';

/** Starter home. Replace the template copy with your landing page. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  protected readonly appTitle = appTitle;
  protected readonly siteUrl = siteUrl;
}
