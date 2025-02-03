import { vi } from 'vitest';

vi.mock('sequelize', async importOriginal => {
  const actual = await importOriginal();

  const mockSequelize = vi.fn().mockImplementation(() => ({
    define: vi.fn().mockImplementation((modelName, attributes, options) => {
      return {
        name: modelName,
        rawAttributes: attributes,
        options,
        build: (data: any) => ({ ...data }),
      };
    }),
  }));

  return {
    ...(typeof actual === 'object' ? actual : {}),
    default: mockSequelize,
    DataTypes: (actual as any).DataTypes,
  };
});
