import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { AppTitleStrategy } from './core/title-strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
