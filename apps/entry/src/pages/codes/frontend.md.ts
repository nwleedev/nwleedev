import type { APIRoute } from "astro";
import { frontendMarkdown } from "@/shared/guides";

export const GET: APIRoute = () =>
  new Response(frontendMarkdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
