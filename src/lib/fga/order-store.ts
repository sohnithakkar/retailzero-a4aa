/**
 * In-memory order document store with OpenFGA integration.
 *
 * Simulates a vector database where every order is stored as a document.
 * When a document is added, an FGA tuple is written granting the owner
 * `owner` access to that order.  Retrieval is filtered through FGAFilter
 * so only documents the requesting user is authorized to view are returned.
 */

import { FGAFilter, buildOpenFgaClient } from "@auth0/ai";
import type { Order } from "@/lib/auth0/user-cache";

// ---------------------------------------------------------------------------
// Order document shape
// ---------------------------------------------------------------------------

export interface OrderDocument {
  id: string; // orderId
  userId: string; // owner's Auth0 user ID
  items: Order["items"];
  total: number;
  placedAt: string;
  summary: string; // human-readable summary for text search
}

// ---------------------------------------------------------------------------
// In-memory store (simulates a vector DB)
// ---------------------------------------------------------------------------

const store = new Map<string, OrderDocument>();

function buildSummary(order: Order): string {
  const parts = order.items.map(
    (i) => `${i.productName} x${i.quantity}`
  );
  return `${parts.join(", ")} — $${order.total.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Write path — store document + write FGA tuple
// ---------------------------------------------------------------------------

export async function addOrderDocument(
  order: Order,
  userId: string
): Promise<void> {
  const alreadyInStore = store.has(order.orderId);

  // Always add/update the document in the in-memory store
  if (!alreadyInStore) {
    const doc: OrderDocument = {
      id: order.orderId,
      userId,
      items: order.items,
      total: order.total,
      placedAt: order.placedAt,
      summary: buildSummary(order),
    };
    store.set(order.orderId, doc);
  }

  // Always attempt to write FGA tuple (idempotent on FGA side)
  // user:{userId} is owner of order:{orderId}
  try {
    const fgaClient = buildOpenFgaClient();
    console.log(
      `[order-store] Writing FGA tuple: user:${userId} -> owner -> order:${order.orderId}`
    );
    await fgaClient.write({
      writes: [
        {
          user: `user:${userId}`,
          relation: "owner",
          object: `order:${order.orderId}`,
        },
      ],
    });
    console.log(
      `[order-store] Successfully wrote FGA tuple for order ${order.orderId}`
    );
  } catch (e: unknown) {
    const error = e as Error & { body?: string; statusCode?: number };
    // FGA returns a 400 with "tuple already exists" if the tuple is already present
    // This is expected and not an error condition
    const errorBody = error.body || error.message || "";
    if (
      error.statusCode === 400 &&
      errorBody.includes("cannot write a tuple which already exists")
    ) {
      console.log(
        `[order-store] FGA tuple already exists for order ${order.orderId} (this is OK)`
      );
    } else {
      // Log the actual error for debugging
      console.error(
        `[order-store] Failed to write FGA tuple for order ${order.orderId}:`,
        {
          message: error.message,
          statusCode: error.statusCode,
          body: error.body,
        }
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Read path — unfiltered retrieval (for FGAFilter to process)
// ---------------------------------------------------------------------------

export function getAllOrderDocuments(): OrderDocument[] {
  return Array.from(store.values());
}

/**
 * Basic text search on the summary field (simulates vector similarity).
 * Returns all documents if no query is provided.
 */
export function searchOrderDocuments(query?: string): OrderDocument[] {
  const docs = getAllOrderDocuments();
  if (!query) return docs;

  const lower = query.toLowerCase();
  return docs.filter((d) => d.summary.toLowerCase().includes(lower));
}

// ---------------------------------------------------------------------------
// Self-healing — retry FGA tuple writes for orders missing authorization
// ---------------------------------------------------------------------------

/**
 * For orders that exist in user_metadata but were denied by FGA (missing
 * tuples), ensure the documents are in the store and batch-write tuples.
 * Returns the order IDs that were successfully repaired.
 *
 * This is intentionally separate from `addOrderDocument` (which is
 * idempotent on the store key) so it doesn't change `hydrateUser` behavior.
 */
export async function repairMissingTuples(
  orders: Order[],
  userId: string
): Promise<string[]> {
  if (orders.length === 0) return [];

  // Ensure every order has a document in the store
  for (const order of orders) {
    if (!store.has(order.orderId)) {
      store.set(order.orderId, {
        id: order.orderId,
        userId,
        items: order.items,
        total: order.total,
        placedAt: order.placedAt,
        summary: buildSummary(order),
      });
    }
  }

  // Batch-write all missing tuples in a single request
  try {
    const fgaClient = buildOpenFgaClient();
    await fgaClient.write({
      writes: orders.map((order) => ({
        user: `user:${userId}`,
        relation: "owner",
        object: `order:${order.orderId}`,
      })),
    });
    return orders.map((o) => o.orderId);
  } catch (e) {
    console.warn(
      `[order-store] Failed to repair FGA tuples:`,
      (e as Error).message
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// FGAFilter factory — returns a filter scoped to a specific user
// ---------------------------------------------------------------------------

export function getOrderFilter(userId: string) {
  return FGAFilter.create<OrderDocument>({
    buildQuery: (doc) => ({
      user: `user:${userId}`,
      object: `order:${doc.id}`,
      relation: "owner", // Must match the relation written in addOrderDocument
    }),
  });
}
