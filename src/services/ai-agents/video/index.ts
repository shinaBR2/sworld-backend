import { Agent, run, webSearchTool } from '@openai/agents';

const movieAgent = new Agent({
  name: 'Movie Recommendation Agent',
  instructions: `
    You are a movie recommendation expert. When a user tells you about a movie they watched, 
    you help them find similar movies they might enjoy. 
    
    Use web search to find information about similar movies, ratings, and where to watch them.
    Provide thoughtful recommendations with brief explanations of why each movie is similar.
  `,
  tools: [webSearchTool()],
});

const getResult = async (input: string) => {
  const result = await run(movieAgent, input);
};

export { getResult };
