import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Gold Prices – Gold Tracker',
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent),
    title: 'Portfolio – Gold Tracker',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login – Gold Tracker',
  },
  {
    path: 'trades',
    loadComponent: () => import('./pages/trades/trades.component').then(m => m.TradesComponent),
    title: 'Trades – Gold Tracker',
  },
  { path: '**', redirectTo: '' },
];
