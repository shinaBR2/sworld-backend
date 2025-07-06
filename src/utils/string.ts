import { randomBytes } from 'crypto';

const generateSecureCode = (length: number) => {
  return randomBytes(length).toString('base64url');
};

const generateHumanCode = () => {
  const words = ['BIRD', 'TREE', 'BLUE', 'MOON', 'STAR', 'WIND'];
  const numbers = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, '0');
  return `${words[Math.floor(Math.random() * words.length)]}-${numbers}`;
};

export { generateSecureCode, generateHumanCode };
