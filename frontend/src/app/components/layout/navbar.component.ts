import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  auth = inject(AuthService);
  memberSvc = inject(MemberService);
  private el = inject(ElementRef);
  mobileOpen = signal(false);
  memberMenuOpen = signal(false);
  showAddMember = signal(false);
  newMemberName = signal('');
  addingMember = signal(false);

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.memberMenuOpen() && !this.el.nativeElement.contains(e.target as Node)) {
      this.memberMenuOpen.set(false);
      this.showAddMember.set(false);
    }
  }

  toggleMemberMenu(e: MouseEvent) {
    e.stopPropagation();
    this.memberMenuOpen.set(!this.memberMenuOpen());
    if (this.memberMenuOpen()) this.showAddMember.set(false);
  }

  selectMember(id: number | null) {
    this.memberSvc.setActive(id);
    this.memberMenuOpen.set(false);
  }

  submitAddMember() {
    const name = this.newMemberName().trim();
    if (!name) return;
    this.addingMember.set(true);
    this.memberSvc.addMember(name).subscribe({
      next: () => {
        this.memberSvc.load();
        this.newMemberName.set('');
        this.showAddMember.set(false);
        this.addingMember.set(false);
      },
      error: () => this.addingMember.set(false),
    });
  }

  deleteMember(id: number, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Xóa thành viên này? Dữ liệu giao dịch của họ cũng sẽ bị xóa.')) return;
    this.memberSvc.deleteMember(id).subscribe({
      next: () => {
        if (this.memberSvc.activeMemberId() === id) this.memberSvc.setActive(null);
        this.memberSvc.load();
      },
    });
  }
}
