import dotenv from 'dotenv';
dotenv.config();
const required = ['MONGODB_URI', 'JWT_SECRET'];
required.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
    }
});
export const env = {
    port: Number(process.env.PORT ?? 4000),
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
};
