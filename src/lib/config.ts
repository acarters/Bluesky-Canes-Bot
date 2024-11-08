import { env } from "node:process";
import { z } from "zod";
import type { AtpAgentLoginOpts } from "@atproto/api";

const envSchema = z.object({
  BSKY_HANDLE: z.string().nonempty(),
  BSKY_PASSWORD: z.string().nonempty(),
  BSKY_SERVICE: z.string().nonempty().default("https://bsky.social"),
  MASTODON_HANDLE: z.string().nonempty(),
  MASTODON_ACCOUNT_ID: z.string().nonempty(),
  ALTERNATE_CARD_IMAGE: z.string().nonempty(),
  GIVEAWAY_STRINGS: z.string().nonempty().default("retweet"),
});

const parsed = envSchema.parse(env);

export const bskyAccount: AtpAgentLoginOpts = {
  identifier: parsed.BSKY_HANDLE,
  password: parsed.BSKY_PASSWORD,
};
export const bskyService = parsed.BSKY_SERVICE;

export const sourceMastodonAccount = parsed.MASTODON_HANDLE;
// todo: look this up automatically
export const sourceMastodonId = parsed.MASTODON_ACCOUNT_ID
export const giveawayStrings = parsed.GIVEAWAY_STRINGS.split(",");

export const alternateCardImage = parsed.ALTERNATE_CARD_IMAGE;
