import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định Server Action chỉ nhận body 1MB — upload giấy tờ sẽ hỏng.
      // Ứng dụng giới hạn file 10MB; để 12MB cho phần overhead của multipart
      // (ranh giới, header từng phần) như tài liệu Next khuyến cáo.
      bodySizeLimit: "12mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
