import { tool } from '@openai/agents';

// @ts-ignore
const webSearchTool = tool({
  name: 'search_similar_movies',
  description: 'Search the web for movies similar to a given movie title',
  // parameters: {
  //   type: 'object',
  //   properties: {
  //     query: {
  //       type: 'string',
  //       description: 'Search query for finding similar movies',
  //     },
  //   },
  //   required: ['query'],
  //   additionalProperties:
  // },
  execute: async ({ query }) => {
    // Simple web search implementation
    // You can use Google Search API, or any search service
    console.log(`Searching for: ${query}`);

    // For now, return mock data to test the flow
    return {
      results: [
        'The Matrix - Similar themes of reality and perception',
        'Shutter Island - Psychological thriller with twists',
        'Memento - Non-linear narrative structure',
      ],
    };
  },
});

export { webSearchTool };
