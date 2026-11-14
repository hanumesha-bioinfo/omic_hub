import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const projectRoot = path.resolve(__dirname, '../..');
export const DIST_DIR = path.resolve(projectRoot, 'dist');
