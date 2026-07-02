import { roles } from '../theme/roles';
const REQUIRED = ['accent','onAccent','accentContainer','secondaryContainer','onSecondaryContainer','success','warning','danger','background','surface','surfaceVariant','surface1','surface2','surface3','surface4','onSurface','onSurfaceVariant','outline'] as const;
test('every role exists in light and dark', () => {
  for (const r of REQUIRED) {
    expect(roles.light[r]).toMatch(/^#/);
    expect(roles.dark[r]).toMatch(/^#/);
  }
});
