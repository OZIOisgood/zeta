import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CounterService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/counter';

  get() {
    return this.http.get<{value: number}>(this.baseUrl);
  }

  increment() {
    return this.http.post<{value: number}>(`${this.baseUrl}/increment`, {});
  }
}
