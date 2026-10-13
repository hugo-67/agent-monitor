import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSandboxEnabled, sandboxBypassRequested } from '../src/main/security';

test('normal arguments preserve Chromium sandbox', () => {
  assert.equal(sandboxBypassRequested(['agent-monitor', '--disable-setuid-sandbox']), false);
  assert.doesNotThrow(() => assertSandboxEnabled(['agent-monitor', '--disable-setuid-sandbox']));
});
test('explicit --no-sandbox is rejected', () => {
  assert.equal(sandboxBypassRequested(['agent-monitor', '--no-sandbox']), true);
  assert.throws(() => assertSandboxEnabled(['agent-monitor', '--no-sandbox']), /refuses to start/);
});
test('--disable-sandbox and switch=value variants are rejected', () => {
  for (const flag of ['--disable-sandbox', '--no-sandbox=true', '--disable-sandbox=1']) {
    assert.throws(() => assertSandboxEnabled(['agent-monitor', flag]), /refuses to start/);
  }
});
test('Chromium switches seen through app.commandLine are rejected', () => {
  assert.throws(() => assertSandboxEnabled(['agent-monitor'], name => name === 'no-sandbox'), /refuses to start/);
});
test('strings which merely resemble flags are not blocked', () => {
  assert.doesNotThrow(() => assertSandboxEnabled(['agent-monitor', '/tmp/--no-sandbox.txt']));
});
