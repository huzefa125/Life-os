import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const MAX_UPLOAD_MB = process.env.MAX_UPLOAD_MB ? Number(process.env.MAX_UPLOAD_MB) : 20;

export const env = {
    PORT: PORT,
    DATABASE_URL: DATABASE_URL,
    JWT_SECRET: JWT_SECRET,
    JWT_EXPIRES_IN: JWT_EXPIRES_IN,
    UPLOAD_DIR: UPLOAD_DIR,
    MAX_UPLOAD_MB: MAX_UPLOAD_MB,
};

