import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { Feature, FeatureService } from '../../shared/services/feature.service';

export const featureGuard: CanActivateFn = async (route) => {
  const featureService = inject(FeatureService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const feature = route.data['feature'] as Feature;

  if (!feature) {
    return true;
  }

  // Wait for features to load if they haven't yet
  if (authService.loading()) {
    // Wait for loading to complete by checking the signal periodically
    while (authService.loading()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  if (featureService.hasFeature(feature)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
