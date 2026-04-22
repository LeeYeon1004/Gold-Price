import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/layout/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen bg-slate-50">
      <app-navbar/>
      <main>
        <router-outlet/>
      </main>
    </div>
  `,
})
export class AppComponent {}
