import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Group {
  id: string;
  name: string;
  avatar: string | null; // Base64 encoded image data
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/groups`;

  list(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  create(name: string, avatar?: string): Observable<Group> {
    return this.http.post<Group>(this.apiUrl, { name, avatar: avatar || null });
  }
}
