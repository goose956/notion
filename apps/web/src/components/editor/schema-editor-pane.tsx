"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Code2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NichePackSchema, type NichePack } from "@niche-factory/schema";

interface SchemaEditorPaneProps {
  pack: NichePack;
  onPackUpdate: (updated: NichePack) => void;
}

export function SchemaEditorPane({ pack, onPackUpdate }: SchemaEditorPaneProps) {
  const [text, setText] = useState(() => JSON.stringify(pack, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep text in sync when pack changes externally (AI update)
  useEffect(() => {
    setText(JSON.stringify(pack, null, 2));
    setIsDirty(false);
    setParseError(null);
  }, [pack]);

  function handleChange(value: string) {
    setText(value);
    setIsDirty(true);

    // Live parse validation
    try {
      const parsed: unknown = JSON.parse(value);
      const result = NichePackSchema.safeParse(parsed);
      if (result.success) {
        setParseError(null);
      } else {
        const first = result.error.issues[0];
        setParseError(
          first
            ? `${first.path.join(".")} — ${first.message}`
            : "Validation error",
        );
      }
    } catch {
      setParseError("Invalid JSON");
    }
  }

  function handleApply() {
    try {
      const parsed: unknown = JSON.parse(text);
      const result = NichePackSchema.safeParse(parsed);
      if (!result.success) {
        const first = result.error.issues[0];
        setParseError(
          first
            ? `${first.path.join(".")} — ${first.message}`
            : "Validation error",
        );
        return;
      }
      onPackUpdate(result.data);
      setIsDirty(false);
    } catch {
      setParseError("Invalid JSON — cannot apply");
    }
  }

  function handleFormat() {
    try {
      const parsed: unknown = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch {
      // leave as-is
    }
  }

  const isValid = parseError === null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Code2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">schema.json</span>
        {isDirty && (
          <Badge variant="outline" className="ml-1 text-xs">
            edited
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {isValid ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span
            className={cn(
              "text-xs",
              isValid ? "text-green-600" : "text-destructive",
            )}
          >
            {isValid ? "valid" : "invalid"}
          </span>
        </div>
      </div>

      {/* Error bar */}
      {parseError !== null && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-mono truncate shrink-0">
          {parseError}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          className="absolute inset-0 w-full h-full resize-none font-mono text-xs p-4 bg-background text-foreground focus:outline-none"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleFormat}
          className="text-xs"
        >
          Format
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!isDirty || !isValid}
          className="text-xs ml-auto"
        >
          Apply changes
        </Button>
      </div>
    </div>
  );
}
