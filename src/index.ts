import cors from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { dts } from "elysia-remote-dts";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { bills } from "./bills";

const ALLOWED_ORIGINS = ["http://localhost:8787", "http://localhost:5173"];

const app = new Elysia({
	adapter: CloudflareAdapter,
})
	.use(
		cors({
			origin: (request): boolean => {
				const origin = request.headers.get("origin");
				console.log("Incoming request from origin:", origin);

				// Allow requests with no origin (like mobile apps or curl)
				if (!origin) return true;

				return ALLOWED_ORIGINS.includes(origin);
			},
		}),
	)
	.use(
		openapi({
			references: fromTypes(
				process.env.NODE_ENV === "production"
					? "dist/index.d.ts"
					: "src/index.ts",
			),
		}),
	)
	.get("/health", () => `🦊 Elysia is running healthy`)
	.use(bills)
	.use(
		dts("./src/index.ts", {
			tsconfig: "./tsconfig.json",
			compilerOptions: {
				strict: true,
			},
			dtsPath: "/types.d.ts",
		}),
	)
	.compile();

export default app;
export type App = typeof app;
