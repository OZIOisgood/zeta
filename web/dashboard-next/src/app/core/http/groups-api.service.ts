import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvService } from './env.service';

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  avatar: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class GroupsApiClient {
  private readonly http = inject(HttpClient);
  private readonly env = inject(EnvService);

  private get apiUrl(): string {
    return `${this.env.apiUrl}/groups`;
  }

  listGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  getGroup(id: string): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(data: { name: string; description?: string; avatar: string }): Observable<Group> {
    return this.http.post<Group>(this.apiUrl, {
      name: data.name,
      description: data.description || null,
      avatar: data.avatar,
    });
  }

  updateGroup(
    id: string,
    data: { name: string; description?: string; avatar?: string },
  ): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/${id}`, data);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
