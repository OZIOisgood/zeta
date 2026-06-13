import { useState } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ZTextarea } from './z-textarea';

function Controlled() {
  const [value, setValue] = useState('');
  return <ZTextarea accessibilityLabel="Description" value={value} onChangeText={setValue} />;
}

test('accepts multi-line text', async () => {
  const user = userEvent.setup();
  await render(<Controlled />);
  const input = screen.getByLabelText('Description');
  await user.type(input, 'line one');
  expect(input).toHaveDisplayValue('line one');
  expect(input.props.multiline).toBe(true);
});
