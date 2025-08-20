export type JwtPayload = {
    userId: string;
    role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
};
export declare const signJwt: (payload: JwtPayload) => string;
export declare const verifyJwt: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map