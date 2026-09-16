import { Routes } from '@angular/router';
import { Composer } from './composer/composer';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Composer },
  {
    path: '**',
    title: 'Not found',
    loadComponent: () => import('./not-found').then((m) => m.NotFound),
  },
];
