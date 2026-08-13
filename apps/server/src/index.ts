import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { appRouter } from "./routes/index.js";
import { createContext } from "./lib/context.js";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./config/env.js";
import serverTiming from "@elysiajs/server-timing";



import { node } from "@elysiajs/node";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const port = Number(process.env.PORT) || 3000;

// Origins from CORS_ORIGIN env (stable domains), plus this project's
// per-deployment Vercel URLs and production URLs,
// which change on every deploy and cannot be listed in the env var.
const allowedOrigins: (string | RegExp)[] = [
  ...env.CORS_ORIGIN,
  /^https:\/\/beyond-syllabus.*\.vercel\.app$/,
];

const app = new Elysia({ adapter: node() })
  .use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(serverTiming())


  .options("/rpc*", () => new Response(null, { status: 204 }))

  .all("/rpc*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })

  .all("/api*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })

  .get("/", () => "OK")

  .get("/syllabus", async () => {
    const content = await fs.readFile(
      path.join(process.cwd(), "src/routes/syllabus/generated/university.json"),
      "utf-8"
    );
    return JSON.parse(content);
  })
  .listen(port, () => {
    console.log("🦊 Beyond Syllabus API is running !!");
  });