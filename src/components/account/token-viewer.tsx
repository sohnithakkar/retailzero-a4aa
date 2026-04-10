"use client";

import { useEffect, useState, useCallback } from "react";

interface TokenInfo {
  label: string;
  raw: string;
  decoded: Record<string, unknown> | null;
  type: "jwt" | "opaque";
}

/** Simple JSON syntax highlighter -- no dependencies. */
function highlightJson(json: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const rx =
    /("(?:\\.|[^"\\])*")\s*(?=:)|("(?:\\.|[^"\\])*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = rx.exec(json)) !== null) {
    if (match.index > last) {
      nodes.push(
        <span key={`t${last}`} className="text-neutral-500">
          {json.slice(last, match.index)}
        </span>
      );
    }

    if (match[1]) {
      nodes.push(
        <span key={`k${match.index}`} className="text-[#7aa2f7]">
          {match[1]}
        </span>
      );
    } else if (match[2]) {
      nodes.push(
        <span key={`s${match.index}`} className="text-[#9ece6a]">
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      nodes.push(
        <span key={`b${match.index}`} className="text-[#ff9e64]">
          {match[3]}
        </span>
      );
    } else if (match[4]) {
      nodes.push(
        <span key={`n${match.index}`} className="text-[#e0af68]">
          {match[4]}
        </span>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < json.length) {
    nodes.push(
      <span key={`t${last}`} className="text-neutral-500">
        {json.slice(last)}
      </span>
    );
  }

  return nodes;
}

export function TokenViewer() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"raw" | "decoded">("raw");
  const [copied, setCopied] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCopy = async () => {
    const token = tokens[activeIndex];
    if (!token) return;
    await navigator.clipboard.writeText(token.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="border-t border-input pt-6 mt-6">
        <h2 className="text-sm font-medium mb-3">Tokens</h2>
        <p className="text-xs text-muted-foreground">Loading tokens...</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return null;
  }

  const active = tokens[activeIndex];

  return (
    <div className="border-t border-input pt-6 mt-6">
      <h2 className="text-sm font-medium mb-3">Tokens</h2>
      <div className="rounded-md border border-input bg-background overflow-hidden">
        {/* Token tabs */}
        <div className="flex border-b border-input overflow-x-auto">
          {tokens.map((token, i) => (
            <button
              key={token.label}
              type="button"
              onClick={() => {
                setActiveIndex(i);
                setView("raw");
              }}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                i === activeIndex
                  ? "border-[#B49BFC] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {token.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-4 space-y-3">
          {/* Raw / Decoded toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setView("raw")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  view === "raw"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Raw
              </button>
              {active.decoded && (
                <button
                  type="button"
                  onClick={() => setView("decoded")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    view === "decoded"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Decoded
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-medium rounded bg-background border border-input hover:bg-muted transition-colors"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Token content */}
          {view === "raw" ? (
            <pre className="text-xs font-mono bg-[#1a1b26] rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
              <span className="text-neutral-300">{active.raw}</span>
            </pre>
          ) : (
            <pre className="text-xs font-mono bg-[#1a1b26] rounded-md p-3 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
              {highlightJson(JSON.stringify(active.decoded, null, 2))}
            </pre>
          )}

          {/* Expiry info */}
          {active.decoded?.exp && (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date((active.decoded.exp as number) * 1000).toLocaleString()}
            </p>
          )}
          {active.decoded?.expires_at && (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(active.decoded.expires_at as string).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
