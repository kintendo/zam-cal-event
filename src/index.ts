import { z } from "zod";

// <begin> CHANGE THESE VALUES TO MATCH YOUR SERVICE </begin> -----------------

const SERVICE_NAME = "Oh hello there!";
const SERVICE_DESCRIPTION = "A simple ZAM service that greets a name.";
const COST = 0;

const RUN_REQUEST_SCHEMA = z.object({
	name: z.string().min(1),
});

const RUN_RESPONSE_SCHEMA = z.object({
	message: z.string(),
});

const REQUEST_EXAMPLE: z.infer<typeof RUN_REQUEST_SCHEMA> = { name: "Alice" };
const RESPONSE_EXAMPLE: z.infer<typeof RUN_RESPONSE_SCHEMA> = { message: "Hello, Alice!" };

const businessLogic = async (input: z.infer<typeof RUN_REQUEST_SCHEMA>): Promise<z.infer<typeof RUN_RESPONSE_SCHEMA>> => {
	return { message: `Hello, ${input.name}!` };
};

// <end> CHANGE THESE VALUES TO MATCH YOUR SERVICE </end> ---------------------

const handleRun = async (request: Request): Promise<Response> => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = RUN_REQUEST_SCHEMA.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
	}

	return Response.json(await businessLogic(parsed.data));
};

const buildRunContract = (baseUrl: string) => ({
	method: "POST",
	endpointPath: `${baseUrl}/run`,
	inputSchema: z.toJSONSchema(RUN_REQUEST_SCHEMA),
	outputSchema: z.toJSONSchema(RUN_RESPONSE_SCHEMA),
	requestExampleJson: JSON.stringify(REQUEST_EXAMPLE),
	responseExampleJson: JSON.stringify(RESPONSE_EXAMPLE),
});

const handleContract = (request: Request): Response => {
	const baseUrl = new URL(request.url).origin;
	const runContract = buildRunContract(baseUrl);

	return Response.json({
		listing: {
			title: SERVICE_NAME,
			description: SERVICE_DESCRIPTION,
			listingState: "published",
			price: { currency: "USD", amountCents: COST, unit: "call" },
			runContract,
		},
		runContract,
	});
};

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/run" && request.method === "POST") {
			return handleRun(request);
		}

		if (url.pathname === "/contract" && request.method === "GET") {
			return handleContract(request);
		}

		if (url.pathname === "/" && request.method === "GET") {
			return Response.json({ service: SERVICE_NAME, description: SERVICE_DESCRIPTION });
		}

		return Response.json({ error: "Not found" }, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
