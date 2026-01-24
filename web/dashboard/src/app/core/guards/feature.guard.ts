import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Feature, FeatureService } from '../../shared/services/feature.service';

export const featureGuard: CanActivateFn = (route) => {
  const featureService = inject(FeatureService);
  const router = inject(Router);
  const feature = route.data['feature'] as Feature;

  if (!feature) {
    return true;
  }

  if (featureService.hasFeature(feature)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
