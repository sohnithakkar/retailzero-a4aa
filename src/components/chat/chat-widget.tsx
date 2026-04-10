"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, ChevronLeft, ChevronRight, Plus, Star, Trash2 } from "lucide-react";
import { UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { useAuth } from "@/lib/auth/provider";
import { getGuestCart, addGuestCartItem } from "@/lib/cart/guest-cart";
import { mutate } from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CHAT_STORAGE_KEY = "retailzero-chat";

/** Neutralize redirect tool outputs so restored messages don't re-trigger redirects. */
function sanitizeRedirectResults(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    return {
      ...msg,
      parts: msg.parts.map((part) => {
        const p = part as any;
        const toolName = p.type?.startsWith("tool-")
          ? p.type.substring(5)
          : p.toolName;
        if (
          (toolName === "redirect_to_login" ||
            toolName === "redirect_to_google_connect") &&
          p.state === "output-available" &&
          p.output?.redirect
        ) {
          return {
            ...p,
            output: { ...p.output, redirect: false, message: "Login completed." },
          };
        }
        return part;
      }),
    };
  });
}

function loadMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const backup = localStorage.getItem(CHAT_STORAGE_KEY + '_backup');

    let parsed: UIMessage[];

    // If we have a backup, check if it's more recent or if main is empty
    if (backup) {
      const backupMessages = JSON.parse(backup);
      if (!raw) {
        // Main storage is empty, restore from backup
        localStorage.setItem(CHAT_STORAGE_KEY, backup);
        localStorage.removeItem(CHAT_STORAGE_KEY + '_backup');
        parsed = backupMessages;
      } else {
        const mainMessages = JSON.parse(raw);
        // If backup has more messages, use it (likely saved during redirect)
        if (backupMessages.length > mainMessages.length) {
          localStorage.setItem(CHAT_STORAGE_KEY, backup);
          localStorage.removeItem(CHAT_STORAGE_KEY + '_backup');
          parsed = backupMessages;
        } else {
          // Main is good, clean up backup
          localStorage.removeItem(CHAT_STORAGE_KEY + '_backup');
          parsed = mainMessages;
        }
      }
    } else {
      parsed = raw ? JSON.parse(raw) : [];
    }

    return sanitizeRedirectResults(parsed);
  } catch {
    return [];
  }
}

function saveMessages(messages: UIMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

export function clearChatHistory() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

/** Ensure markdown table rows are separated by newlines so react-markdown can parse them. */
function normalizeMarkdownTables(text: string): string {
  // Only process text that contains a table separator (|---|)
  if (!/\|[-:]+[-:|\s]*\|/.test(text)) return text;
  // At row boundaries the text has "| |" (end of row, start of next).
  // Within a row, pipes are separated by cell content, not just whitespace.
  return text.replace(/\|\s+\|/g, (match) => {
    // Preserve the boundary but add a newline
    return '|\n|';
  });
}

/** Render message text with full markdown support (tables, bold, italic, code, links, lists). */
function MessageContent({ text }: { text: string }) {
  const normalized = normalizeMarkdownTables(text);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <table className="my-2 w-full text-xs border-collapse border border-current/10 rounded">
            {children}
          </table>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 text-left font-semibold border border-current/10">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1.5 border border-current/10">{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("/") ? "_self" : "_blank"}
            rel="noopener noreferrer"
            className="underline text-[#B49BFC] hover:text-[#c9b5fd]"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
            {children}
          </code>
        ),
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
}

// ---------------------------------------------------------------------------
// Helpers to classify Auth0 AI interrupts by their `code` field
// ---------------------------------------------------------------------------

type InterruptType = "ciba_pending" | "ciba_expired" | "ciba_denied" | "fga_denied" | "token_vault" | "unknown";

function classifyInterrupt(interrupt: any): InterruptType {
  const code: string = interrupt?.code ?? "";

  // CIBA / Async Authorization interrupts
  if (code.startsWith("ASYNC_AUTHORIZATION_")) {
    if (code === "ASYNC_AUTHORIZATION_AUTHORIZATION_PENDING" ||
        code === "ASYNC_AUTHORIZATION_AUTHORIZATION_POLLING_ERROR") {
      return "ciba_pending";
    }
    if (code === "ASYNC_AUTHORIZATION_AUTHORIZATION_REQUEST_EXPIRED" ||
        code === "ASYNC_AUTHORIZATION_INVALID_GRANT") {
      return "ciba_expired";
    }
    if (code === "ASYNC_AUTHORIZATION_ACCESS_DENIED") {
      return "ciba_denied";
    }
    // Any other ASYNC_AUTHORIZATION code — treat as pending
    return "ciba_pending";
  }

  // FGA interrupts
  if (code.startsWith("FGA_") || code === "UNAUTHORIZED") {
    return "fga_denied";
  }

  // Token Vault interrupts
  if (code.startsWith("TOKEN_VAULT_") || code.startsWith("FEDERATED_CONNECTION_")) {
    return "token_vault";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Extracted components to avoid conditional hook calls inside ToolResultDisplay
// ---------------------------------------------------------------------------

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  rating: number;
  stock?: number;
  image?: string;
  description?: string;
};

function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product;
  onClose: () => void;
  onAddToCart?: (productId: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-[32rem] max-h-[80vh] rounded-xl border bg-background shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-background/80 border flex items-center justify-center hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-72 object-cover"
            />
          ) : (
            <div className="w-full h-72 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}

          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border bg-muted">
                {product.category}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
              {product.rating > 0 && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {product.rating}
                </span>
              )}
              {product.stock !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </span>
              )}
            </div>

            {product.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={() => { onAddToCart?.(product.id); onClose(); }}
            disabled={product.stock === 0 || !onAddToCart}
            className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCarousel({
  products,
  onAddToCart,
}: {
  products: Product[];
  onAddToCart?: (productId: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 140;
    const newScrollLeft = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <div className="mt-2 -mx-1 relative group">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-background/90 border shadow-md flex items-center justify-center hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-background/90 border shadow-md flex items-center justify-center hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-thin"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="flex-shrink-0 w-28 rounded-md border bg-card shadow-sm overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/40 transition-shadow"
              onClick={() => setSelectedProduct(p)}
            >
              <div className="h-20 bg-muted flex items-center justify-center">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground text-[9px]">No image</span>
                )}
              </div>

              <div className="p-1.5">
                <h4 className="font-medium text-[10px] leading-tight line-clamp-1">{p.name}</h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] font-bold">${p.price.toFixed(2)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToCart?.(p.id); }}
                    disabled={p.stock === 0 || !onAddToCart}
                    className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Add ${p.name} to cart`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </>
  );
}

function RedirectHandler({ output }: { output: any }) {
  const [popupOpened, setPopupOpened] = useState(false);

  useEffect(() => {
    if (output.redirect && output.url && !popupOpened) {
      setPopupOpened(true);

      if (output.popup) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          output.url,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (popup) {
          let oauthConfirmed = false;
          console.log("[redirect] popup opened successfully", { url: output.url });

          const handleMessage = (event: MessageEvent) => {
            console.log("[redirect] received postMessage", {
              origin: event.origin,
              data: event.data,
              source: event.source === popup ? 'popup' : 'other',
            });
            if (event.data?.type === 'oauth-success') {
              console.log("[redirect] oauth-success confirmed via postMessage");
              oauthConfirmed = true;
              popup.close();
              window.removeEventListener('message', handleMessage);
              mutate('/api/auth/me');
              window.dispatchEvent(new Event('auth-updated'));
            }
          };
          window.addEventListener('message', handleMessage);

          // Polling fallback: if the popup closes without us receiving
          // a postMessage (Safari ITP can block it even with "*"),
          // optimistically refresh auth state. The user completed the
          // OAuth flow and closed the window, so the connection likely
          // succeeded -- the next chat request will pick up the new
          // token vault credential.
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', handleMessage);
              console.log("[redirect] popup closed", { oauthConfirmed });
              if (!oauthConfirmed) {
                console.log("[redirect] fallback: refreshing auth after popup closed without postMessage");
                mutate('/api/auth/me');
                window.dispatchEvent(new Event('auth-updated'));
              }
            }
          }, 500);
        } else {
          setTimeout(() => {
            window.location.href = output.url;
          }, 1000);
        }
      } else {
        setTimeout(() => {
          window.location.href = output.url;
        }, 1000);
      }
    }
  }, [output, popupOpened]);

  return (
    <div className="mt-1 text-xs">
      <p className="text-muted-foreground">{output.message || "Redirecting..."}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render completed tool results so the user always gets feedback,
// even when the model doesn't generate follow-up text.
// ---------------------------------------------------------------------------

function ToolResultDisplay({
  toolName,
  output,
  onAddToCart
}: {
  toolName: string;
  output: any;
  onAddToCart?: (productId: string) => void;
}) {
  if (!output || output.error) {
    return output?.error ? (
      <p className="text-xs text-red-500 mt-1">{output.error}</p>
    ) : null;
  }

  if (toolName === "add_to_cart" || toolName === "view_cart") {
    const items = output.items as {
      productName: string;
      quantity: number;
      subtotal: number;
    }[];
    if (!items?.length) {
      return <p className="text-xs text-muted-foreground mt-1">Your cart is empty.</p>;
    }
    return (
      <div className="mt-1 text-xs space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.productName} x{item.quantity}</span>
            <span>${item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold border-t border-current/10 pt-0.5 mt-1">
          <span>Total</span>
          <span>${(output.total as number).toFixed(2)}</span>
        </div>
      </div>
    );
  }

  if (toolName === "show_products") {
    const products = output as Product[];
    if (!products?.length) {
      return <p className="text-xs text-muted-foreground mt-1">No products found.</p>;
    }

    return <ProductCarousel products={products} onAddToCart={onAddToCart} />;
  }

  if (toolName === "redirect_to_login" || toolName === "redirect_to_google_connect") {
    return <RedirectHandler output={output} />;
  }

  if (toolName === "get_product_details") {
    return (
      <div className="mt-1 text-xs">
        <p className="font-semibold">{output.name} — ${output.price?.toFixed(2)}</p>
        <p className="text-muted-foreground">{output.description}</p>
      </div>
    );
  }

  if (toolName === "checkout_cart") {
    return (
      <div className="mt-1 text-xs">
        <p className="font-semibold text-green-600">Order confirmed!</p>
        <p>Order ID: {output.orderId}</p>
        <p>Total: ${output.total?.toFixed(2)}</p>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Chat panel — only mounted when the widget is open, so the heavy hooks
// (useChat, useInterruptions, SWR auth fetch) don't block the toggle button.
// ---------------------------------------------------------------------------

function ChatPanel({ onClose, onClear }: { onClose: () => void; onClear: () => void }) {
  const { user } = useAuth();
  const [input, setInput] = useState("");

  const initialMessages = useMemo(() => loadMessages(), []);

  const {
    messages,
    sendMessage,
    status,
    toolInterrupt,
  } = useInterruptions((errorHandler) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      messages: initialMessages,
      onError: errorHandler((err) => {
        console.error("Chat error:", err);
      }),
    })
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const syncedToolCalls = useRef<Set<string>>(new Set());
  const savedRedirectCalls = useRef<Set<string>>(new Set());
  const isLoading = status === "streaming" || status === "submitted";

  // Persist messages whenever they change and we're not mid-stream
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, status]);

  // Force-save messages when redirect tools are detected (even if streaming).
  // Guard with savedRedirectCalls so restored (sanitized) messages don't re-trigger.
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        const p = part as any;
        if (!("toolName" in p) || !p.toolCallId) continue;
        const toolName: string = p.toolName ?? "";

        if (
          (toolName === "redirect_to_login" ||
            toolName === "redirect_to_google_connect") &&
          p.state === "output-available" &&
          p.output?.redirect &&
          !savedRedirectCalls.current.has(p.toolCallId)
        ) {
          savedRedirectCalls.current.add(p.toolCallId);
          saveMessages(messages);
          try {
            localStorage.setItem(CHAT_STORAGE_KEY + '_backup', JSON.stringify(messages));
          } catch {
            // storage full or unavailable
          }
        }
      }
    }
  }, [messages]);

  // Sync tool results: when a cart-modifying tool call completes, update the UI.
  // For guests: write to localStorage. For all users: dispatch cart-updated
  // so the header badge refreshes.
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        const p = part as any;
        if (!("toolName" in p) || p.state !== "output-available" || !p.toolCallId) continue;
        if (syncedToolCalls.current.has(p.toolCallId)) continue;

        const toolName: string = p.toolName ?? "";

        // Guest cart sync: write add_to_cart results to localStorage
        if (!user?.id && toolName === "add_to_cart") {
          const input = p.input as { productId?: string; quantity?: number };
          if (input?.productId) {
            addGuestCartItem(input.productId, input.quantity ?? 1);
            syncedToolCalls.current.add(p.toolCallId);
            window.dispatchEvent(new Event("cart-updated"));
          }
        }

        // Authenticated cart changes: notify header to re-fetch badge count
        if (user?.id && (toolName === "add_to_cart" || toolName === "checkout_cart")) {
          syncedToolCalls.current.add(p.toolCallId);
          window.dispatchEvent(new Event("cart-updated"));
        }
      }
    }
  }, [messages, status, user?.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    // Pass fresh user info and guest cart at send time (not from stale hook config)
    const body: Record<string, unknown> = {
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userLocalTime: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
    };
    if (!user?.id) {
      body.guestCart = getGuestCart();
    }
    await sendMessage({ text }, { body });
  };

  const handleAddToCart = async (productId: string) => {
    if (isLoading) return;
    const text = `Add product ${productId} to my cart`;
    const body: Record<string, unknown> = {
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userLocalTime: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
    };
    if (!user?.id) {
      body.guestCart = getGuestCart();
    }
    await sendMessage({ text }, { body });
  };

  const interruptType: InterruptType | null = toolInterrupt
    ? classifyInterrupt(toolInterrupt)
    : null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[48rem] h-[650px] rounded-lg border bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b">
        <h3 className="font-semibold">Zero</h3>
        <div className="flex items-center gap-3">
          {/* Authentication Status */}
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${user?.id ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-muted-foreground">
              {user?.id ? user.name || 'Authenticated' : 'Guest'}
            </span>
          </div>
          {!user?.id && messages.length > 0 && (
            <button
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col-reverse overflow-y-auto px-6 py-6">
       <div className="space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Hi! How can I help you today?
          </p>
        )}
        {messages.map((msg) => {
          return (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {/* Render text parts first */}
                {msg.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <MessageContent key={`text-${i}`} text={part.text} />;
                  }
                  return null;
                })}

                {/* Then render tool results */}
                {msg.parts.map((part, i) => {
                  if (part.type === "text") return null;

                  const p = part as any;
                  // Extract tool name from type (e.g., "tool-show_products" -> "show_products")
                  const toolName = p.type?.startsWith('tool-')
                    ? p.type.substring(5)
                    : p.toolName;

                  // Show a waiting message while checkout_cart is executing (CIBA polling)
                  if (
                    msg.role === "assistant" &&
                    toolName === "checkout_cart" &&
                    (p.state === "input-available" || p.state === "input-streaming")
                  ) {
                    return (
                      <div key={`tool-${i}`} className="mt-1 text-xs space-y-1">
                        <p className="font-medium">A push notification has been sent to your device.</p>
                        <p className="text-muted-foreground">Please approve it to complete your purchase.</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-muted-foreground">Waiting for approval…</span>
                        </div>
                      </div>
                    );
                  }
                  // Render completed tool results
                  if (
                    msg.role === "assistant" &&
                    toolName &&
                    "state" in part &&
                    p.state === "output-available" &&
                    p.output
                  ) {
                    return (
                      <ToolResultDisplay
                        key={`tool-${i}`}
                        toolName={toolName}
                        output={p.output}
                        onAddToCart={handleAddToCart}
                      />
                    );
                  }
                  return null;
                })}
              {msg.parts.every(
                (p) =>
                  p.type !== "text" &&
                  !("state" in p && (p as any).state === "output-available")
              ) &&
                isLoading &&
                msg.role === "assistant" && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                  </span>
                )}
            </div>
          </div>
          );
        })}

        {/* Auth0 AI interruption — CIBA (pending device approval) */}
        {toolInterrupt && interruptType === "ciba_pending" && (
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-800">
              Purchase approval required
            </p>
            <p className="mt-1 text-blue-700">
              A purchase approval request has been sent to your device.
              Please approve to continue.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-xs text-blue-600">
                Waiting for approval...
              </span>
            </div>
          </div>
        )}

        {/* Auth0 AI interruption — CIBA (expired) */}
        {toolInterrupt && interruptType === "ciba_expired" && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
            <p className="font-medium text-red-800">
              Approval expired
            </p>
            <p className="mt-1 text-red-700">
              The purchase approval request was not completed in time.
              Please try checking out again.
            </p>
            <button
              onClick={() => toolInterrupt.resume()}
              className="mt-2 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Auth0 AI interruption — CIBA (denied) */}
        {toolInterrupt && interruptType === "ciba_denied" && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
            <p className="font-medium text-red-800">
              Purchase denied
            </p>
            <p className="mt-1 text-red-700">
              The purchase was denied on your device.
            </p>
          </div>
        )}

        {/* Auth0 AI interruption — FGA (unauthorized) */}
        {toolInterrupt && interruptType === "fga_denied" && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
            <p className="font-medium text-red-800">
              Access denied
            </p>
            <p className="mt-1 text-red-700">
              You do not have permission to perform this action. Profile
              edits are only allowed for your own profile.
            </p>
          </div>
        )}

        {/* Auth0 AI interruption — Token Vault (account connection) */}
        {toolInterrupt && interruptType === "token_vault" && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm">
            <p className="font-medium text-yellow-800">
              Authorization required
            </p>
            <p className="mt-1 text-yellow-700">
              This action requires you to connect your account.
            </p>
            <button
              onClick={() => toolInterrupt.resume()}
              className="mt-2 inline-flex items-center rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
            >
              Connect &amp; Continue
            </button>
          </div>
        )}

        {/* Auth0 AI interruption — unknown / fallback */}
        {toolInterrupt && interruptType === "unknown" && (
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-800">
              Action required
            </p>
            <p className="mt-1 text-gray-700">
              {toolInterrupt.message || "Additional authorization is needed to complete this action."}
            </p>
            <button
              onClick={() => toolInterrupt.resume()}
              className="mt-2 inline-flex items-center rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              Continue
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
       </div>
      </div>

      <div className="px-6 py-5 border-t">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 h-12 rounded-md border border-input bg-background px-4 py-3 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle button — no hooks other than useState, renders immediately.
// ---------------------------------------------------------------------------

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const handleClear = useCallback(() => {
    clearChatHistory();
    // Bump key to remount ChatPanel with a fresh useChat / useInterruptions state
    setChatKey((k) => k + 1);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {isOpen && <ChatPanel key={chatKey} onClose={() => setIsOpen(false)} onClear={handleClear} />}
    </>
  );
}
