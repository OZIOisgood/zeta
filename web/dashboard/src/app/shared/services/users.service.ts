import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { EnvService } from './env.service';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  role?: 'admin' | 'expert' | 'student';
  name: string;
}

export type GroupUsersListKind = 'students' | 'experts';

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

  list(groupId: string, kind: GroupUsersListKind = 'students'): Observable<User[]> {
    const segment = kind === 'experts' ? 'experts' : 'users';

    return this.http.get<ListUsersResponse>(`${this.apiUrl}/${groupId}/${segment}`).pipe(
      map((response) =>
        response.data.map((u) => ({
          ...u,
          name: `${u.first_name} ${u.last_name}`,
        })),
      ),
    );
  }

  remove(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${groupId}/users/${userId}`);
  }
}
