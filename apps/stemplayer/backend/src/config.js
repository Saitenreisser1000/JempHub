import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "postgres://stemplayer:stemplayer@localhost:5432/stemplayer",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN || "",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:8080"
};
