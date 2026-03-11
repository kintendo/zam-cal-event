import { z } from "zod";
import { generateIcsCalendar } from "ts-ics";
import type { IcsCalendar } from "ts-ics";

// <begin> CHANGE THESE VALUES TO MATCH YOUR SERVICE </begin> -----------------

const SERVICE_NAME = "Calendar Event";
const SERVICE_DESCRIPTION =
	"Generates a downloadable .ics calendar event file from a date/time and event name.";
const COST = 0;
const TAGS = ["calendar", "ics", "events", "scheduling", "productivity"];

const RUN_REQUEST_SCHEMA = z.object({
	eventName: z.string().min(1),
	dateTime: z.string().min(1),
	durationHours: z.number().min(0.25).default(1),
});

const RUN_RESPONSE_SCHEMA = z.object({
	icsFile: z.string().describe("The .ics file content (text/calendar)"),
});

const REQUEST_EXAMPLE: z.infer<typeof RUN_REQUEST_SCHEMA> = {
	eventName: "Team Standup",
	dateTime: "2026-03-15T10:00:00Z",
	durationHours: 1,
};
const RESPONSE_EXAMPLE: z.infer<typeof RUN_RESPONSE_SCHEMA> = {
	icsFile: "BEGIN:VCALENDAR\\nVERSION:2.0\\n...",
};

const generateIcs = (input: z.infer<typeof RUN_REQUEST_SCHEMA>): string => {
	const startDate = new Date(input.dateTime);
	if (isNaN(startDate.getTime())) {
		throw new Error(
			"Invalid dateTime format. Use ISO 8601, e.g. 2026-03-15T10:00:00Z",
		);
	}

	const calendar: IcsCalendar = {
		version: "2.0",
		prodId: "-//ZAM//Calendar Event//EN",
		events: [
			{
				uid: crypto.randomUUID(),
				stamp: { date: new Date() },
				start: { date: startDate },
				duration: {
					hours: Math.floor(input.durationHours),
					minutes: Math.round((input.durationHours % 1) * 60),
				},
				summary: input.eventName,
			},
		],
	};

	return generateIcsCalendar(calendar);
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
		return Response.json(
			{ error: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	let icsContent: string;
	try {
		icsContent = generateIcs(parsed.data);
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Failed to generate ICS";
		return Response.json({ error: message }, { status: 400 });
	}

	const safeFilename =
		parsed.data.eventName
			.replace(/[^a-zA-Z0-9\-_ ]/g, "")
			.replace(/\s+/g, "-")
			.substring(0, 50) || "event";

	return new Response(icsContent, {
		status: 200,
		headers: {
			"Content-Type": "text/calendar; charset=utf-8",
			"Content-Disposition": `attachment; filename="${safeFilename}.ics"`,
		},
	});
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
			tags: TAGS,
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
