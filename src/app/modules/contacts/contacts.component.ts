import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db } from '../../core/database/db';

interface SimpleContact {
  id?: number;
  name: string;
  category: string;
  notes: string;
  photoFront?: string;
  photoBack?: string;
}

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit {
  contacts: SimpleContact[] = [];
  filtered: SimpleContact[] = [];
  loading = true;
  showForm = false;
  editingId: number | null = null;
  searchQuery = '';
  photoModal: SimpleContact | null = null;
  photoSide: 'front' | 'back' = 'front';

  form: SimpleContact = { name: '', category: '', notes: '', photoFront: '', photoBack: '' };

  categories = ['Trabajo', 'Personal', 'Proveedor', 'Cliente', 'Médico', 'Otro'];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.contacts = await db.contacts.orderBy('name').toArray() as unknown as SimpleContact[];
    this.filter();
    this.loading = false;
  }

  filter() {
    const q = this.searchQuery.toLowerCase();
    if (!q) {
      this.filtered = this.contacts;
    } else {
      this.filtered = this.contacts.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
  }

  onFileChange(event: Event, side: 'front' | 'back') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.compressImage(file, 800, 0.7).then(compressed => {
      if (side === 'front') this.form.photoFront = compressed;
      else this.form.photoBack = compressed;
    });
  }

  private compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  edit(contact: SimpleContact) {
    this.editingId = contact.id!;
    this.form = { ...contact };
    this.showForm = true;
  }

  async save() {
    if (!this.form.name) return;
    const data: any = { ...this.form };

    if (this.editingId) {
      await db.contacts.update(this.editingId, data);
    } else {
      await db.contacts.add(data);
    }
    this.cancelForm();
    await this.load();
  }

  async delete(id: number) {
    await db.contacts.delete(id);
    await this.load();
  }

  cancelForm() {
    this.form = { name: '', category: '', notes: '', photoFront: '', photoBack: '' };
    this.showForm = false;
    this.editingId = null;
  }

  openPhoto(contact: SimpleContact) {
    this.photoModal = contact;
    this.photoSide = 'front';
  }
}
