import { render } from '@testing-library/react-native';
import { ScheduleDayRow } from './schedule-day-row';

const ITEM = {
  id: 'a1',
  expert_id: 'e1',
  group_id: 'g1',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
};

test('ScheduleDayRow shows the weekday name and time range', async () => {
  const { getByText } = await render(
    <ScheduleDayRow
      availability={ITEM}
      dayName="Monday"
      deleteLabel="Delete"
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
  expect(getByText('Monday')).toBeTruthy();
  expect(getByText('09:00 – 17:00')).toBeTruthy();
});
