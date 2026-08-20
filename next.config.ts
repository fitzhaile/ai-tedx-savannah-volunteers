import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IMAP/mail parsing stay as Node dependencies rather than being bundled.
  serverExternalPackages: ["imapflow", "mailparser"],
};

export default nextConfig;
