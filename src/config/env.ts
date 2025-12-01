import dotenv from 'dotenv';

dotenv.config();

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: required(process.env.JWT_SECRET, 'JWT_SECRET'),
  platformFee: Number(process.env.PLATFORM_FEE || 2.0),
  databaseUrl: required(process.env.NETLIFY_DATABASE_URL, 'NETLIFY_DATABASE_URL'),
};


