import { Request, Response } from 'express';
import { getResult } from 'src/services/ai-agents/video';

const handler = async (req: Request, res: Response) => {
  let result;
  try {
    result = await getResult('I just watched Inception, recommend similar movies');
    res.send(result);
    return;
  } catch (e) {
    console.log(`DEBUG error`, e);
  }

  res.send('ok');
};

export { handler };
