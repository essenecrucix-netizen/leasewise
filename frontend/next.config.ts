import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes was promoted out of experimental in Next 16 — top level now.
  typedRoutes: true,
  // The frontend talks to the FastAPI backend at NEXT_PUBLIC_API_BASE.
  // In dev that's http://localhost:8000; in prod, Nginx routes /api/* to
  // the backend on the same host and the public URL is the LeaseWise domain.
};

export default config;
