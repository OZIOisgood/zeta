import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

export type GroupMembersListKind = 'students' | 'experts';

export type GroupMember = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  role?: 'admin' | 'expert' | 'student' | string;
  name: string;
};

type ListGroupMembersResponse = {
  data: Omit<GroupMember, 'name'>[];
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

  listGroupMembers(groupId: string, kind: GroupMembersListKind): Observable<GroupMember[]> {
    const segment = kind === 'experts' ? 'experts' : 'users';

    return this.http
      .get<ListGroupMembersResponse>(`${this.apiUrl}/${groupId}/${segment}`)
      .pipe(
        map((response) =>
          response.data.map((member) => ({
            ...member,
            name: `${member.first_name} ${member.last_name}`.trim() || member.email,
          })),
        ),
      );
  }

  removeGroupMember(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${groupId}/users/${userId}`);
  }
}
