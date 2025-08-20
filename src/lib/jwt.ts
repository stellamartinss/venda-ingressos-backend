import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export type JwtPayload = { userId: string; role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER' };

export const signJwt = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

export const verifyJwt = (token: string): JwtPayload =>
  jwt.verify(token, config.jwtSecret) as JwtPayload;


