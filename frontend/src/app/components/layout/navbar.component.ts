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

  // Add member
  showAddMember = signal(false);
  newMemberName = signal('');
  addingMember = signal(false);

  // Rename member
  editingMemberId = signal<number | null>(null);
  editingMemberName = signal('');
  renamingMember = signal(false);

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.memberMenuOpen() && !this.el.nativeElement.contains(e.target as Node)) {
      this.closeMenu();
    }
  }

  toggleMemberMenu(e: MouseEvent) {
    e.stopPropagation();
    if (this.memberMenuOpen()) {
      this.closeMenu();
    } else {
      this.memberMenuOpen.set(true);
    }
  }

  closeMenu() {
    this.memberMenuOpen.set(false);
    this.showAddMember.set(false);
    this.editingMemberId.set(null);
    this.editingMemberName.set('');
  }

  selectMember(id: number | null) {
    this.memberSvc.setActive(id);
    this.closeMenu();
  }

  // ── Add ──────────────────────────────────────────────
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

  // ── Rename ───────────────────────────────────────────
  startEdit(id: number, currentName: string, e: MouseEvent) {
    e.stopPropagation();
    this.editingMemberId.set(id);
    this.editingMemberName.set(currentName);
    this.showAddMember.set(false);
  }

  submitRename(e?: MouseEvent) {
    e?.stopPropagation();
    const id = this.editingMemberId();
    const name = this.editingMemberName().trim();
    if (!id || !name) return;
    this.renamingMember.set(true);

    this.memberSvc.renameMember(id, name).subscribe({
      next: () => {
        this.memberSvc.load();
        this.editingMemberId.set(null);
        this.editingMemberName.set('');
        this.renamingMember.set(false);
      },
      error: () => this.renamingMember.set(false),
    });
  }

  cancelEdit(e?: MouseEvent) {
    e?.stopPropagation();
    this.editingMemberId.set(null);
    this.editingMemberName.set('');
  }

  // ── Delete ───────────────────────────────────────────
  deleteMember(id: number, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this member? Their transaction data will also be deleted.')) return;
    this.memberSvc.deleteMember(id).subscribe({
      next: () => {
        if (this.memberSvc.activeMemberId() === id) this.memberSvc.setActive(null);
        this.memberSvc.load();
      },
    });
  }
}
