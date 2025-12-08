import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { bills } from "./bills";
import cors from "@elysiajs/cors";

const ALLOWED_ORIGINS = [
	"http://localhost:8787",
	"http://localhost:5173",
	"http://localhost:3001",
];

export default new Elysia({
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
	.use(openapi())
	.use(bills)
	.compile();

// console.log(
// 	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
// );
