import { render, screen, fireEvent } from '@testing-library/react-native';
import { ZQueryError } from './z-query-error';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe('ZQueryError', () => {
  it('renders the title and default retry label and fires onRetry', async () => {
    const onRetry = jest.fn();
    await render(<ZQueryError title="Videos could not be loaded" onRetry={onRetry} />);
    expect(screen.getByText('Videos could not be loaded')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('common.actions.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('honours a custom retry label and testID', async () => {
    await render(
      <ZQueryError title="x" onRetry={() => {}} retryLabel="upload.retry" testID="r" />,
    );
    expect(screen.getByTestId('r')).toBeOnTheScreen();
  });
});
