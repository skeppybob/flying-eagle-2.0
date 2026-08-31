import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const MODERATION_EMAIL = "Wilkeskbarrett@gmail.com";
const MAX_PER_RUN = 30;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.AirsoftPost.list("-created_date", 100);
    const pending = posts.filter(p => !p.moderated).slice(0, MAX_PER_RUN);
    const flagged = [];

    for (const post of pending) {
      const fileUrls = post.media_type === "image" ? [post.media_url] : [];
      const prompt = "You are a content moderator for an airsoft community app called TheFlyingEagle. Review this post for policy violations: profanity, cussing, bad words, hate speech, threats, harassment, illegal activity, suspicious or unsafe content, or anything inappropriate for a sports community."
        + "\n\nPost title: " + post.title
        + "\nDescription: " + (post.description || "(none)")
        + "\nCreator callsign: @" + post.creator_name
        + (post.media_type === "image"
            ? "\nAn image is attached. Examine it for inappropriate text, signs, symbols, gestures, or behavior."
            : "\nThis post is a video and cannot be analyzed frame-by-frame. Moderate based on the title and description text only.")
        + '\n\nRespond ONLY with JSON: {"flagged": boolean, "reason": "short explanation or \"none\""}';

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: { flagged: { type: "boolean" }, reason: { type: "string" } },
          required: ["flagged", "reason"],
        },
      });

      const isFlagged = !!(result && (result.flagged === true || result.flagged === "true"));
      const reason = (result && result.reason) || (isFlagged ? "Flagged by moderator" : "none");

      await base44.asServiceRole.entities.AirsoftPost.update(post.id, {
        moderated: true,
        flagged: isFlagged,
        moderation_note: reason,
      });

      if (isFlagged) flagged.push({ post, reason });
    }

    if (flagged.length) {
      const lines = flagged.map(f =>
        "• \"" + f.post.title + "\" by @" + f.post.creator_name
        + " — " + f.reason
        + "\n  Type: " + f.post.media_type
        + "\n  Media: " + f.post.media_url
        + "\n  View: https://eagle-battle-feed.base44.app/watch/" + f.post.id
      ).join("\n\n");

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: MODERATION_EMAIL,
        subject: "🚩 Flying Eagle moderation alert: " + flagged.length + " flagged post" + (flagged.length === 1 ? "" : "s"),
        body: "The automated content moderator flagged the following post(s) for review:\n\n" + lines + "\n\nReview and remove them from the app dashboard if they violate policy.",
      });
    }

    return Response.json({ scanned: pending.length, flagged: flagged.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
