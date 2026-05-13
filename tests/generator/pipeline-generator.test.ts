import { describe, it, expect } from 'vitest';
import { PipelineGenerator } from '../../src/generator/pipeline-generator';
import type { SubagentData, SystemData, ConfigData } from '../../src/ast-utils';

describe('PipelineGenerator', () => {
  it('generates Bot class with chat() and run_cli()', () => {
    const config: ConfigData = { agentName: 'WeatherBot', defaultAgentUser: 'test@test.com' };
    const system: SystemData = {
      instructions: 'You are a weather bot.',
      welcomeMessage: 'Hello!',
      errorMessage: 'Error occurred.',
    };
    const subagents: SubagentData[] = [
      { name: 'router', kind: 'start_agent', description: 'Router', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
      { name: 'forecast', kind: 'topic', description: 'Forecast', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
    ];
    const gen = new PipelineGenerator();
    const code = gen.generateMain(config, system, subagents);
    expect(code).toContain('class WeatherBotBot:');
    expect(code).toContain('async def chat(self, user_message: str)');
    expect(code).toContain('async def run_cli(self)');
    expect(code).toContain('def _build_agents(self)');
    expect(code).toContain('self.state = StateManager()');
    expect(code).toContain('router_agent = create_router');
    expect(code).toContain('Hello!');
    expect(code).toContain('asyncio.run(WeatherBotBot(impls=_impls).run_cli())');
  });

  it('generates AgentWrapper class for hooks', () => {
    const subagent: SubagentData = {
      name: 'order_locator',
      kind: 'start_agent',
      description: 'Locate orders',
      beforeReasoning: [{ kind: 'set', variable: '@variables.order_found', value: 'False' }],
      afterReasoning: [{ kind: 'if', condition: '@variables.order_found', body: [{ kind: 'transition', target: '@topic.order_details' }] }],
      actions: [],
      reasoningActions: [],
    };
    const gen = new PipelineGenerator();
    const code = gen.generateAgentWrapper(subagent);
    expect(code).toContain('class OrderLocatorWrapper');
    expect(code).toContain('async def before_call');
    expect(code).toContain('async def after_call');
  });
});
