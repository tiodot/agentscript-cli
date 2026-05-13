import { describe, it, expect } from 'vitest';
import { AgentGenerator } from '../../src/generator/agent-generator';
import type { SubagentData } from '../../src/ast-utils';

describe('AgentGenerator', () => {
  it('generates agent factory function', () => {
    const subagent: SubagentData = {
      name: 'weather_service_router',
      kind: 'start_agent',
      description: 'Welcome and route users',
      systemInstructions: 'You are a weather service assistant.',
      reasoningInstructions: 'Analyze input and route appropriately.',
      actions: [],
      beforeReasoning: [],
      reasoningActions: [],
      afterReasoning: [],
    };
    const gen = new AgentGenerator();
    const code = gen.generateFactory(subagent);
    expect(code).toContain('def create_weather_service_router(state: StateManager, toolkit: Toolkit)');
    expect(code).toContain('ReActAgent');
    expect(code).toContain('name="weather_service_router"');
    expect(code).toContain('DashScopeChatModel');
  });

  it('combines system + reasoning instructions in sys_prompt', () => {
    const subagent: SubagentData = {
      name: 'test_agent',
      kind: 'subagent',
      description: 'Test',
      systemInstructions: 'Base instruction.',
      reasoningInstructions: 'Reasoning guidance.',
      actions: [],
      beforeReasoning: [],
      reasoningActions: [],
      afterReasoning: [],
    };
    const gen = new AgentGenerator();
    const code = gen.generateFactory(subagent);
    expect(code).toContain('Base instruction.');
    expect(code).toContain('Reasoning guidance.');
  });
});
