import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function Markdown({ children }: { children: string }) { return <div className="prose prose-slate dark:prose-invert max-w-none break-words"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{children}</ReactMarkdown></div>; }
