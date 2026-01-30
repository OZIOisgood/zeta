import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { Permission, PermissionsService } from '../../shared/services/permissions.service';

export const permissionGuard: CanActivateFn = async (route) => {
  const permissionsService = inject(PermissionsService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const permission = route.data['permission'] as Permission;

  if (!permission) {
    return true;
  }

  // Wait for auth to load if it hasn't yet
  if (authService.loading()) {
    while (authService.loading()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  if (permissionsService.hasPermission(permission)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
