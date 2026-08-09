import type { Preview } from '@storybook/react';
import './i18n-storybook';
import '../global.css';
import { withProviders } from './decorators';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    a11y: { test: 'todo' },
    controls: { expanded: true },
  },
  decorators: [withProviders],
};

export default preview;
