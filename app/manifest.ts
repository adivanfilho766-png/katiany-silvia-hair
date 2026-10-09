import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Katiany Silvia Hair",
    short_name: "Katiany Hair",
    description:
      "Painel e sistema de agendamento do espaço Katiany Silvia Hair.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#fffafc",
    theme_color: "#c5787e",
    orientation: "portrait-primary",
    categories: ["beauty", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}