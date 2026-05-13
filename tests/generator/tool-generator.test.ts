import { describe, it, expect } from 'vitest';
import { ToolGenerator } from '../../src/generator/tool-generator';
import type { ActionData } from '../../src/ast-utils';

describe('ToolGenerator', () => {
  it('generates typed stub function for an action with target', () => {
    const action: ActionData = {
      name: 'Get_Current_Weather_Data',
      description: 'Retrieves current weather data',
      inputs: [
        { name: 'city', type: 'string', description: 'City name', isRequired: true },
        { name: 'country', type: 'string', description: 'Country', isRequired: true },
        { name: 'coordinates', type: 'object', description: 'Coordinates', isRequired: false },
      ],
      outputs: [
        { name: 'temperature_celsius', type: 'number', description: 'Temperature' },
        { name: 'conditions', type: 'string', description: 'Weather conditions' },
      ],
      target: 'flow://300WX000001WeatherCurrentAPI',
    };
    const gen = new ToolGenerator();
    const code = gen.generateStub(action);
    expect(code).toContain('async def get_current_weather_data');
    expect(code).toContain('city: str');
    expect(code).toContain('country: str');
    expect(code).toContain('coordinates: dict | None = None');
    expect(code).toContain('-> dict');
    expect(code).toContain('raise NotImplementedError');
  });

  it('generates mock implementation', () => {
    const action: ActionData = {
      name: 'Verify_Customer',
      description: 'Verifies customer',
      inputs: [{ name: 'email', type: 'string', isRequired: true }],
      outputs: [
        { name: 'customer_found', type: 'boolean' },
        { name: 'customer_name', type: 'string' },
      ],
      target: 'flow://VerifyCustomerIdentity',
    };
    const gen = new ToolGenerator();
    const code = gen.generateMock(action);
    expect(code).toContain('async def verify_customer');
    expect(code).toContain('"customer_found": False');
    expect(code).toContain('"customer_name": ""');
  });

  it('converts action name to snake_case', () => {
    const gen = new ToolGenerator();
    expect(gen.toSnakeCase('Get_Current_Weather_Data')).toBe('get_current_weather_data');
    expect(gen.toSnakeCase('Verify_Customer_Identity')).toBe('verify_customer_identity');
  });

  it('maps type hints', () => {
    const gen = new ToolGenerator();
    expect(gen.mapParamType('string')).toBe('str');
    expect(gen.mapParamType('number')).toBe('int');
    expect(gen.mapParamType('boolean')).toBe('bool');
    expect(gen.mapParamType('object')).toBe('dict');
  });
});
