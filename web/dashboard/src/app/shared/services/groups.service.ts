import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  avatar: string | null; // Base64 encoded image data
  description: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get apiUrl() {
    return `${this.env.apiUrl}/groups`;
  }

  list(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  get(id: string): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  create(name: string, description?: string, avatar?: string): Observable<Group> {
    return this.http.post<Group>(this.apiUrl, {
      name,
      description: description || null,
      avatar: avatar || null,
    });
  }

  update(
    id: string,
    data: { name: string; description?: string; avatar?: string },
  ): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
