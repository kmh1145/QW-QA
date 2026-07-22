"use client";

import { useId, useRef, useState } from "react";
import { Bold, Code, Eye, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Pencil, Quote, Strikethrough } from "lucide-react";
import { Markdown } from "@/lib/markdown";

type MarkdownEditorProps = {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  minHeightClass?: string;
};

export function MarkdownEditor({ name, label, value, defaultValue = "", onChange, minLength, maxLength = 30000, required, placeholder, minHeightClass = "min-h-56" }: MarkdownEditorProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const editorId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const content = value ?? internalValue;

  function update(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  function replaceSelection(before: string, after: string, fallback: string) {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const replacement = `${before}${selected}${after}`;
    update(`${content.slice(0, start)}${replacement}${content.slice(end)}`);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLines(prefix: string | ((index: number) => string), fallback: string) {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const replacement = selected.split("\n").map((line, index) => `${typeof prefix === "function" ? prefix(index) : prefix}${line}`).join("\n");
    update(`${content.slice(0, start)}${replacement}${content.slice(end)}`);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start, start + replacement.length); });
  }

  function runTool(action: () => void) {
    if (preview) {
      setPreview(false);
      requestAnimationFrame(action);
    } else {
      action();
    }
  }

  const tools = [
    { label: "粗体", icon: Bold, action: () => replaceSelection("**", "**", "粗体文字") },
    { label: "斜体", icon: Italic, action: () => replaceSelection("_", "_", "斜体文字") },
    { label: "删除线", icon: Strikethrough, action: () => replaceSelection("~~", "~~", "删除文字") },
    { label: "标题", icon: Heading2, action: () => prefixLines("## ", "小标题") },
    { label: "引用", icon: Quote, action: () => prefixLines("> ", "引用内容") },
    { label: "无序列表", icon: List, action: () => prefixLines("- ", "列表项目") },
    { label: "有序列表", icon: ListOrdered, action: () => prefixLines((index) => `${index + 1}. `, "列表项目") },
    { label: "链接", icon: LinkIcon, action: () => replaceSelection("[", "](https://)", "链接文字") },
    { label: "行内代码", icon: Code, action: () => replaceSelection("`", "`", "代码") }
  ];

  return <div>
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2"><label className="text-sm font-medium" htmlFor={editorId}>{label}</label><span className="text-xs text-slate-500">支持 Markdown · {content.length}/{maxLength}</span></div>
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-900">
      <div role="toolbar" aria-label="Markdown 快捷工具" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/60">
        {tools.map(({ label: toolLabel, icon: Icon, action }) => <button key={toolLabel} type="button" title={toolLabel} aria-label={toolLabel} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-slate-700 transition hover:bg-brand-100 hover:text-brand-800 dark:text-slate-200 dark:hover:bg-brand-950" onClick={() => runTool(action)}><Icon aria-hidden="true" size={15} /><span>{toolLabel}</span></button>)}
        <button type="button" className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg border border-brand-200 bg-white px-2 text-xs text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:bg-slate-900 dark:text-brand-200" aria-pressed={preview} onClick={() => setPreview((current) => !current)}>{preview ? <Pencil aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}{preview ? "继续编辑" : "预览"}</button>
      </div>
      <textarea
        ref={textarea}
        id={editorId}
        name={name}
        className={`${preview ? "hidden" : "block"} ${minHeightClass} w-full resize-y bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white`}
        value={content}
        onChange={(event) => update(event.target.value)}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        placeholder={placeholder}
      />
      {preview && <div className={`${minHeightClass} p-4`}>{content ? <Markdown>{content}</Markdown> : <p className="text-sm text-slate-400">暂无内容，切换回编辑后开始输入。</p>}</div>}
    </div>
  </div>;
}
