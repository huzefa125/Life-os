import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const env = {
    PORT: PORT,
    JWT_SECRET: JWT_SECRET,
    JWT_EXPIRES_IN: JWT_EXPIRES_IN,
};

