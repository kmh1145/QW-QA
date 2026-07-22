import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AIChat, type AISource } from "@/components/ai-chat";
import { AIConversationControls, AIMessageCard } from "@/components/ai-conversation-actions";

function parseSources(value: Prisma.JsonValue | null): AISource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, Prisma.JsonValue>;
    if (typeof source.title !== "string" || typeof source.type !== "string" || typeof source.url !== "string" || typeof source.content !== "string") return [];
    return [{ title: source.title, type: source.type, url: source.url, content: source.content, updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : "", score: typeof source.score === "number" ? source.score : 0, matchedTerms: Array.isArray(source.matchedTerms) ? source.matchedTerms.filter((term): term is string => typeof term === "string") : [] }];
  });
}

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const user = await requireUser();
  const { conversationId } = await params;
  const conversation = await db.aIConversation.findFirst({ where: { id: conversationId, userId: user.id, deletedAt: null }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!conversation) notFound();
  return <main className="container-page max-w-4xl py-10"><Link className="text-sm text-brand-700 hover:underline dark:text-brand-300" href="/ai">← 返回对话列表</Link><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{conversation.title}</h1><AIConversationControls id={conversation.id} initialTitle={conversation.title} /></div><div className="my-6 space-y-3">{conversation.messages.map((message) => message.role === "ASSISTANT" ? <AIMessageCard id={message.id} initialContent={message.content} initialSources={parseSources(message.sources)} initialFeedback={message.feedback} key={message.id} /> : message.role === "USER" ? <div className="card ml-0 sm:ml-10" key={message.id}><b className="text-sm">你</b><p className="mt-2 whitespace-pre-wrap">{message.content}</p></div> : null)}</div><AIChat conversationId={conversation.id} /></main>;
}
