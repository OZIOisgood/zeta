import { useState } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ZTextInput } from './z-text-input';

function Controlled() {
  const [value, setValue] = useState('');
  return <ZTextInput accessibilityLabel="Title" value={value} onChangeText={setValue} />;
}

test('accepts typed text', async () => {
  const user = userEvent.setup();
  await render(<Controlled />);
  await user.type(screen.getByLabelText('Title'), 'Kata 1');
  expect(screen.getByLabelText('Title')).toHaveDisplayValue('Kata 1');
});

test('disabled input is not editable', async () => {
  await render(
    <ZTextInput accessibilityLabel="Title" value="x" onChangeText={jest.fn()} disabled />,
  );
  expect(screen.getByLabelText('Title')).toBeDisabled();
});
