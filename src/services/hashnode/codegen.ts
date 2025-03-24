import type { CodegenConfig } from '@graphql-codegen/cli';
import { envConfig } from '../../utils/envConfig';

const hasuraUrl = envConfig.hashnodeEndpoint as string;
const token = envConfig.hashnodePersonalToken as string;

const config: CodegenConfig = {
  schema: [
    {
      [hasuraUrl]: {
        headers: {
          Authorization: token,
        },
      },
    },
  ],
  documents: ['src/services/hashnode/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    './src/services/hashnode/generated-graphql/': {
      preset: 'client',
      config: {
        documentMode: 'string',
      },
      presetConfig: {
        fragmentMasking: { unmaskFunctionName: 'getFragmentData' },
      },
    },
    './src/services/hashnode/schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
