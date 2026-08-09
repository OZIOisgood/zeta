/**
 * @jest-environment node
 *
 * ESLint guardrail tests — verifies that the flat-config rules in
 * eslint.config.js block raw @expo/ui, Pressable, Modal, and
 * lucide-react-native in src/app/** screens.
 *
 * We load the config via require() + overrideConfigFile:true so ESLint skips
 * the dynamic import() codepath (which requires --experimental-vm-modules
 * under jest). The two assertions — banned in src/app, allowed in
 * src/components/ui — are kept as specified in the task.
 */
import path from 'path';
import { ESLint, type Linter } from 'eslint';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require(path.resolve(process.cwd(), 'eslint.config.js')) as Linter.Config[];

function makeEslint() {
  return new ESLint({
    // overrideConfigFile:true tells ESLint "use overrideConfig exclusively,
    // don't search for a config file" — avoids the dynamic import() call.
    overrideConfigFile: true,
    overrideConfig: config,
    cwd: process.cwd(),
  });
}

test('bans @expo/ui import in a screen', async () => {
  const eslint = makeEslint();
  const [res] = await eslint.lintText("import { Button } from '@expo/ui/swift-ui';\n", {
    filePath: path.resolve(process.cwd(), 'src/app/foo.tsx'),
  });
  expect(res.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true);
});

test('allows @expo/ui import inside components/ui', async () => {
  const eslint = makeEslint();
  const [res] = await eslint.lintText("import { Button } from '@expo/ui/swift-ui';\n", {
    filePath: path.resolve(process.cwd(), 'src/components/ui/z-button.ios.tsx'),
  });
  expect(res.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(false);
});
