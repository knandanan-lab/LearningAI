import { useState } from "react";
import { Copy, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/api";
import AIPanel from "@/components/AIPanel";

export default function PromptBox({ id, original, favourite, onToggleFavourite }) {
  const [text, setText] = useState(original);
  const copy = async () => {
    (await copyText(text)) ? toast.success("Prompt copied. Paste it into your AI tool.") : toast.error("Could not copy. Please select and copy the text.");
  };
  return (
    <div className="space-y-3">
      <label className="label" htmlFor={`prompt-${id}`}>Edit the prompt to fit your work (replace the [brackets])</label>
      <textarea
        id={`prompt-${id}`}
        className="field font-mono text-sm"
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid={`prompt-text-${id}`}
      />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" onClick={copy} data-testid={`copy-prompt-${id}`}>
          <Copy size={16} /> Copy prompt
        </button>
        {text !== original && (
          <button className="btn btn-ghost btn-sm" onClick={() => setText(original)} data-testid={`reset-prompt-${id}`}>
            <RotateCcw size={16} /> Reset
          </button>
        )}
        {onToggleFavourite && (
          <button className="btn btn-ghost btn-sm" onClick={onToggleFavourite} data-testid={`favourite-prompt-${id}`} aria-pressed={favourite}>
            <Star size={16} fill={favourite ? "var(--orange)" : "none"} color={favourite ? "var(--orange)" : "currentColor"} />
            {favourite ? "Saved" : "Save to favourites"}
          </button>
        )}
      </div>
      <AIPanel id={id} prompt={text} />
    </div>
  );
}
