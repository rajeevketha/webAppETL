import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pg", "mysql2", "oracledb", "exceljs"],
};

export default nextConfig;
