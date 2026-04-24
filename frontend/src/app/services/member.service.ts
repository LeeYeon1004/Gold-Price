import { Injectable, signal, computed, inject } from '@angular/core';
import { Member } from '../models/gold.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private api = inject(ApiService);

  members = signal<Member[]>([]);
  activeMemberId = signal<number | null>(null);

  activeMember = computed(() => {
    const id = this.activeMemberId();
    return id ? (this.members().find(m => m.id === id) ?? null) : null;
  });

  load() {
    this.api.getMembers().subscribe({
      next: res => {
        const sorted = [...(res.data ?? [])].sort((a, b) =>
          a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
        );
        this.members.set(sorted);
        if (this.activeMemberId() === null && sorted.length > 0) {
          this.activeMemberId.set(sorted[0].id);
        }
      },
      error: () => {},
    });
  }

  setActive(id: number | null) {
    this.activeMemberId.set(id);
  }

  addMember(name: string) {
    return this.api.addMember(name);
  }

  renameMember(id: number, name: string) {
    return this.api.renameMember(id, name);
  }

  deleteMember(id: number) {
    return this.api.deleteMember(id);
  }
}
