import { describe, it, expect } from 'vitest';
import { convert } from '../src/converter';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '..', 'examples');

describe('convert', () => {
  it('converts hello_world.agent to valid Python', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const result = convert(source, { mock: false });
    expect(result).toContain('class StateManager');
    expect(result).toContain('async def main');
    expect(result).toContain('ReActAgent');
    expect(result.length).toBeGreaterThan(100);
  });

  it('converts weather.agent to valid Python', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const result = convert(source, { mock: false });
    expect(result).toContain('class StateManager');
    expect(result).toContain('async def main');
    expect(result).toContain('ReActAgent');
    expect(result).toContain('weather_service_router');
  });

  it('throws on parse errors', () => {
    expect(() => convert('invalid: !!!syntax!!!')).toThrow();
  });
});
