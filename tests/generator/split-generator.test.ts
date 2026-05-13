import { describe, it, expect } from 'vitest';
import { SplitGenerator } from '../../src/generator/split-generator';
import type { ConfigData, SystemData, VariableData, SubagentData } from '../../src/ast-utils';

describe('SplitGenerator', () => {
  it('generates package structure with multiple files', () => {
    const config: ConfigData = { agentName: 'WeatherBot', defaultAgentUser: 'test@test.com' };
    const system: SystemData = { instructions: 'Weather bot.', welcomeMessage: 'Hello!' };
    const variables: VariableData[] = [
      { name: 'city', type: 'string', mutable: true, linked: false, defaultValue: '""', description: 'City' },
    ];
    const subagents: SubagentData[] = [
      { name: 'router', kind: 'start_agent', description: 'Router', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
    ];

    const gen = new SplitGenerator();
    const files = gen.generate(config, system, variables, subagents, { mock: false });

    expect(files).toHaveProperty('state.py');
    expect(files).toHaveProperty('tools.py');
    expect(files).toHaveProperty('agents.py');
    expect(files).toHaveProperty('pipeline.py');
    expect(files).toHaveProperty('main.py');
    expect(files).toHaveProperty('__init__.py');

    expect(files['state.py']).toContain('class StateManager');
    expect(files['main.py']).toContain('asyncio.run(main())');
  });
});
