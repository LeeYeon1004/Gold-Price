import { Component, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/layout/navbar.component';
import { LoadingService } from './services/loading.service';
import { AuthService } from './services/auth.service';
import { MemberService } from './services/member.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  loading = inject(LoadingService);
  private auth = inject(AuthService);
  private memberSvc = inject(MemberService);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.memberSvc.load();
      } else {
        this.memberSvc.members.set([]);
        this.memberSvc.activeMemberId.set(null);
      }
    });
  }
}
