import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { frontendMarkdown, selectFrontendTopics } from "@/shared/guides";
import { getFrontendGuideTerms } from "@/shared/terms";

const frontendTopics = defineCollection({
  schema: z.object({ title: z.string().min(1), order: z.number().int() }),
  loader: {
    name: "frontend-guide",
    async load({ store, parseData, renderMarkdown }) {
      const { topics } = getFrontendGuideTerms();
      const excerpts = selectFrontendTopics(frontendMarkdown);

      store.clear();
      for (const [order, { id, markdown }] of excerpts.entries()) {
        store.set({
          id,
          data: await parseData({ id, data: { title: topics[id], order } }),
          rendered: await renderMarkdown(markdown),
        });
      }
    },
  },
});

export const collections = { frontendTopics };
