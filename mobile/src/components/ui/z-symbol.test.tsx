import { render } from '@testing-library/react-native';
import { ZSymbol } from './z-symbol';

test('renders with an accessibility label', async () => {
  const { getByLabelText } = await render(<ZSymbol name="home" label="Home" />);
  expect(getByLabelText('Home')).toBeTruthy();
});
