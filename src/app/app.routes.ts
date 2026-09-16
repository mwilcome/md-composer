import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

/** Starter routes. Replace the example path with real features; keep `**` last. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', title: 'Home', component: Home },
  {
    // Example lazy route. Delete this entry and pages/routing-example in a real app.
    path: 'routing-example',
    title: 'Routing example',
    loadComponent: () => import('./pages/routing-example/routing-example').then((m) => m.RoutingExample),
  },
  {
    path: '**',
    title: 'Not found',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
