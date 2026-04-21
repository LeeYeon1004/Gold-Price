import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Bảng giá vàng – Vàng Tracker',
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent),
    title: 'Danh mục – Vàng Tracker',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Đăng nhập – Vàng Tracker',
  },
  { path: '**', redirectTo: '' },
];
