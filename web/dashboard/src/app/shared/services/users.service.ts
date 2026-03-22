import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EnvService } from './env.service';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  role?: 'admin' | 'expert' | 'student';
  name: string;
}

interface ListUsersResponse {
  data: Omit<User, 'name'>[];
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);
  private env = inject(EnvService);
  private get apiUrl() {
    return `${this.env.apiUrl}/groups`;
  }

  list(groupId: string): Observable<User[]> {
    return this.http.get<ListUsersResponse>(`${this.apiUrl}/${groupId}/users`).pipe(
      map((response) =>
        response.data.map((u) => ({
          ...u,
          name: `${u.first_name} ${u.last_name}`,
        })),
      ),
    );
  }
}
