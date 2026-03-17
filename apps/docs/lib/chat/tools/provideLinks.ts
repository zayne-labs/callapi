import { tool } from "ai";
import { z } from "zod";

const RecordTypes = z.literal([
	"documentation",
	"site",
	"discourse_post",
	"github_issue",
	"github_discussion",
	"stackoverflow_question",
	"discord_forum_post",
	"discord_message",
	"custom_question_answer",
]);

const LinkType = z.union([RecordTypes, z.string()]);

const LinkSchema = z.looseObject({
	breadcrumbs: z.array(z.string()).nullish(),
	label: z.string().nullish(),
	title: z.string().nullish(),
	type: LinkType.nullish(),
	url: z.string(),
});

const LinksSchema = z.array(LinkSchema).nullish();

export const ProvideLinksToolSchema = z.object({
	links: LinksSchema,
});

export const provideLinksTool = tool({
	inputSchema: ProvideLinksToolSchema,
});
