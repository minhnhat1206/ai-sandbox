/** Fragments reused across catalog prompts. Keep them short and stable (prompt-cache friendly). */

export const OUTPUT_LANGUAGE = `Write the entire answer in {{language}} unless the user content clearly requires another language. Use clean Markdown: short headings, bullet lists and tables where they help. No preamble, no closing remarks.`;

export const COMPANY_CONTEXT = `You are working for {{company}} ({{industry}}). What they told us about their situation:
{{brief}}`;

export const KNOWLEDGE_BLOCK = `Company documents you may rely on (quote them when relevant, never invent policy that is not here):
{{knowledge}}`;
