import { render, screen, userEvent } from '@testing-library/react-native';
import { ZTabs, type ZTab } from './z-tabs';

const tabs: ZTab[] = [
  { id: 'all', label: 'All', count: 3 },
  { id: 'reviewed', label: 'Reviewed', count: 0 },
  { id: 'pending', label: 'Pending' },
];

test('renders every tab label and its count', async () => {
  await render(<ZTabs tabs={tabs} activeId="all" onChange={jest.fn()} />);
  expect(screen.getByText('All')).toBeOnTheScreen();
  expect(screen.getByText('Reviewed')).toBeOnTheScreen();
  expect(screen.getByText('Pending')).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
  expect(screen.getByText('0')).toBeOnTheScreen();
});

test('tapping a tab calls onChange with its id', async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  await render(<ZTabs tabs={tabs} activeId="all" onChange={onChange} />);
  await user.press(screen.getByRole('tab', { name: 'Reviewed' }));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('reviewed');
});

test('marks the active tab as selected', async () => {
  await render(<ZTabs tabs={tabs} activeId="reviewed" onChange={jest.fn()} />);
  expect(screen.getByRole('tab', { name: 'Reviewed' })).toBeSelected();
  expect(screen.getByRole('tab', { name: 'All' })).not.toBeSelected();
});
