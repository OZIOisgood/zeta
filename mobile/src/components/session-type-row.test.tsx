import { render } from '@testing-library/react-native';
import { SessionTypeRow } from './session-type-row';

const TYPE = {
  id: 'st1',
  expert_id: 'e1',
  group_id: 'g1',
  name: '60-min session',
  description: 'Standard session',
  duration_minutes: 60,
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

test('SessionTypeRow shows name, duration badge, and description', async () => {
  const { getByText } = await render(
    <SessionTypeRow
      sessionType={TYPE}
      durationLabel="60 min"
      deleteLabel="Delete"
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
  expect(getByText('60-min session')).toBeTruthy();
  expect(getByText('60 min')).toBeTruthy();
  expect(getByText('Standard session')).toBeTruthy();
});
