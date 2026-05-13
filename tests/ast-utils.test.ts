import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser-bridge';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  extractConfig,
  extractSystem,
  extractVariables,
  extractSubagents,
} from '../src/ast-utils';

const examplesDir = resolve(__dirname, '..', 'examples');

describe('extractConfig', () => {
  it('extracts config from hello_world.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const doc = parse(source);
    const config = extractConfig(doc.ast);
    expect(config.agentName).toBe('HelloWorldBot');
    expect(config.defaultAgentUser).toBe('hello@world.com');
  });

  it('extracts config from weather.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const doc = parse(source);
    const config = extractConfig(doc.ast);
    expect(config.agentName).toBe('WeatherPro_Assistant');
    expect(config.defaultAgentUser).toBe('support@weatherpro.com');
  });
});

describe('extractSystem', () => {
  it('extracts system from hello_world.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const doc = parse(source);
    const system = extractSystem(doc.ast);
    expect(system.instructions).toContain('friendly and empathetic');
    expect(system.welcomeMessage).toContain('Greeting Bot');
    expect(system.errorMessage).toContain('something went wrong');
  });

  it('extracts system from weather.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const doc = parse(source);
    const system = extractSystem(doc.ast);
    expect(system.instructions).toContain('weather information');
    expect(system.welcomeMessage).toContain('WeatherPro');
    expect(system.errorMessage).toContain('technical difficulties');
  });
});

describe('extractVariables', () => {
  it('returns empty for hello_world (no variables block)', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const doc = parse(source);
    const variables = extractVariables(doc.ast);
    expect(variables).toEqual([]);
  });

  it('extracts variables from weather.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const doc = parse(source);
    const variables = extractVariables(doc.ast);
    expect(variables.length).toBeGreaterThan(10);

    // Check specific variable
    const userCity = variables.find(v => v.name === 'user_city');
    expect(userCity).toBeDefined();
    expect(userCity?.type).toBe('string');
    expect(userCity?.mutable).toBe(true);
    expect(userCity?.defaultValue).toBe('');

    const temperature = variables.find(v => v.name === 'temperature');
    expect(temperature).toBeDefined();
    expect(temperature?.type).toBe('number');
  });
});

describe('extractSubagents', () => {
  it('extracts start_agent from hello_world.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const doc = parse(source);
    const subagents = extractSubagents(doc.ast);
    expect(subagents.length).toBe(1);
    expect(subagents[0].name).toBe('hello_world');
    expect(subagents[0].kind).toBe('start_agent');
    expect(subagents[0].reasoningInstructions).toContain('iambic pentameter');
  });

  it('extracts all agents from weather.agent', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const doc = parse(source);
    const subagents = extractSubagents(doc.ast);
    // Should have: weather_service_router (start_agent) + 4 topics
    expect(subagents.length).toBe(5);

    const router = subagents.find(s => s.name === 'weather_service_router');
    expect(router).toBeDefined();
    expect(router?.kind).toBe('start_agent');
    expect(router?.systemInstructions).toContain('weather service assistant');

    const currentWeather = subagents.find(s => s.name === 'current_weather_service');
    expect(currentWeather).toBeDefined();
    expect(currentWeather?.kind).toBe('topic');
    expect(currentWeather?.actions.length).toBeGreaterThan(0);

    // Check actions have target
    const weatherAction = currentWeather?.actions.find(a => a.name === 'Get_Current_Weather_Data');
    expect(weatherAction).toBeDefined();
    expect(weatherAction?.target).toContain('flow://');
    expect(weatherAction?.inputs.length).toBeGreaterThan(0);
  });

  it('extracts before/after reasoning logic', () => {
    const source = readFileSync(resolve(examplesDir, 'weather.agent'), 'utf-8');
    const doc = parse(source);
    const subagents = extractSubagents(doc.ast);

    const currentWeather = subagents.find(s => s.name === 'current_weather_service');
    expect(currentWeather?.beforeReasoning.length).toBeGreaterThan(0);

    // Check first before_reasoning statement (should be an if)
    const firstStmt = currentWeather?.beforeReasoning[0];
    expect(firstStmt?.kind).toBe('if');
  });
});