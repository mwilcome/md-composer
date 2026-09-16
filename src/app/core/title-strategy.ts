import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { appTitle } from './site';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${appTitle}` : appTitle);
  }
}
