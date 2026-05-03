// Orchestrator HTTP + WebSocket + MCP Server

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { ethers } from "ethers";
import type { OrchestratorAgent } from "./agent.js";
import { createEnsSubname } from "./ens-registrar.js";
import { chatStore } from "./chat-store.js";

/**
 * Full MCP tool definitions for tools/list.
 * These are the tools our MCP server exposes to external clients.
 */
const MCP_TOOLS = [
  {
    name: "scan-yields",
    description:
      "Scan DeFi protocols for the best yield opportunities on a given token",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "Token symbol (e.g. ETH, USDC)",
        },
        amount: {
          type: "string",
          description: "Amount to invest (optional)",
        },
      },
      required: ["token"],
    },
  },
  {
    name: "token-info",
    description:
      "Get real-time token price, market cap, and volume from CoinGecko",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Token symbol (e.g. ETH, BTC)" },
      },
      required: ["token"],
    },
  },
  {
    name: "protocol-stats",
    description: "Get protocol TVL, volume, and statistics from DeFi Llama",
    inputSchema: {
      type: "object",
      properties: {
        protocol: {
          type: "string",
          description: "Protocol slug (e.g. lido, aave-v3)",
        },
      },
      required: ["protocol"],
    },
  },
  {
    name: "risk-assess",
    description: "Assess the risk level of a DeFi protocol",
    inputSchema: {
      type: "object",
      properties: {
        protocol: { type: "string", description: "Protocol name" },
        apy: { type: "string", description: "Current APY (optional)" },
      },
      required: ["protocol"],
    },
  },
  {
    name: "contract-audit",
    description: "Check smart contract audit status for a protocol",
    inputSchema: {
      type: "object",
      properties: {
        protocol: { type: "string", description: "Protocol name" },
        chain: { type: "string", description: "Chain name (optional)" },
      },
      required: ["protocol"],
    },
  },
  {
    name: "execute-swap",
    description:
      "Get a live swap quote from Uniswap Trading API (real mainnet prices)",
    inputSchema: {
      type: "object",
      properties: {
        tokenIn: { type: "string", description: "Source token symbol" },
        tokenOut: { type: "string", description: "Destination token symbol" },
        amount: { type: "string", description: "Amount of tokenIn to swap" },
      },
      required: ["tokenIn", "tokenOut", "amount"],
    },
  },
  {
    name: "execute-deposit",
    description: "Deposit tokens into a DeFi protocol",
    inputSchema: {
      type: "object",
      properties: {
        protocol: { type: "string", description: "Protocol to deposit into" },
        token: { type: "string", description: "Token to deposit" },
        amount: { type: "string", description: "Amount to deposit" },
      },
      required: ["protocol", "token", "amount"],
    },
  },
  {
    name: "check-balance",
    description: "Check wallet ETH or ERC-20 token balance on-chain",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address to check" },
        token: {
          type: "string",
          description: "Token symbol (optional, defaults to ETH)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "pay-with-any-token",
    description: "Auto-swap any token to USDC via Uniswap before x402 payment",
    inputSchema: {
      type: "object",
      properties: {
        sourceToken: {
          type: "string",
          description: "Token to pay with (e.g. ETH)",
        },
        amount: { type: "string", description: "Amount in source token" },
        chain: {
          type: "string",
          description: "Chain for the swap (optional)",
        },
      },
      required: ["sourceToken", "amount"],
    },
  },
];

export function createServer(agent: OrchestratorAgent, port: number): Server {
  const app = express();
  app.use(express.json());

  // CORS for frontend
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    next();
  });

  // SIWE nonce generation
  const activeNonces = new Map<string, { nonce: string; expiresAt: number }>();
  app.get("/auth/nonce", (_req, res) => {
    const nonce = ethers.hexlify(ethers.randomBytes(16)).slice(2);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    activeNonces.set(nonce, { nonce, expiresAt });
    // Cleanup expired nonces
    for (const [key, val] of activeNonces) {
      if (val.expiresAt < Date.now()) activeNonces.delete(key);
    }
    res.json({ nonce });
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "orchestrator", timestamp: Date.now() });
  });

  // Tool registry
  app.get("/registry", (_req, res) => {
    res.json(agent.getRegistry());
  });

  // Discovered tools catalog (individual tools from all providers via tools/list)
  app.get("/catalog", (_req, res) => {
    res.json(agent.getCatalog());
  });

  // ============================================================
  // MCP Server Endpoint (JSON-RPC 2.0 over HTTP)
  // This makes the orchestrator a standards-compliant MCP server.
  // External clients call POST /mcp with tools/list or tools/call.
  // ============================================================
  app.post("/mcp", async (req, res) => {
    const body = req.body as {
      jsonrpc?: string;
      method?: string;
      id?: number | string;
      params?: Record<string, unknown>;
    };

    if (body.jsonrpc !== "2.0" || !body.method) {
      res.status(400).json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: { code: -32600, message: "Invalid JSON-RPC request" },
      });
      return;
    }

    const id = body.id ?? 1;

    switch (body.method) {
      case "initialize":
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: { listChanged: false } },
            serverInfo: {
              name: "agent-mesh",
              version: "1.0.0",
            },
          },
        });
        break;

      case "tools/list":
        res.json({
          jsonrpc: "2.0",
          id,
          result: { tools: MCP_TOOLS },
        });
        break;

      case "tools/call": {
        const params = body.params as
          | { name?: string; arguments?: Record<string, string> }
          | undefined;
        const toolName = params?.name;
        const args = params?.arguments ?? {};

        if (!toolName) {
          res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name in params" },
          });
          return;
        }

        // Route to local tool execution
        const router = agent.getLocalRouter();
        if (!router) {
          res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32603, message: "Tool router not available" },
          });
          return;
        }

        try {
          const result = await router.call(toolName, args);
          if (result.error) {
            res.json({ jsonrpc: "2.0", id, error: result.error });
          } else {
            res.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  { type: "text", text: JSON.stringify(result.result) },
                ],
              },
            });
          }
        } catch (error) {
          res.json({
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: String(error) },
          });
        }
        break;
      }

      case "notifications/initialized":
        // No response needed for notifications
        res.status(204).send();
        break;

      default:
        res.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${body.method}`,
          },
        });
    }
  });

  // Submit a goal (requires walletAddress for auth)
  app.post("/goal", async (req, res) => {
    const { goal, walletAddress, chatId } = req.body as {
      goal?: string;
      walletAddress?: string;
      chatId?: string;
    };
    if (!goal || typeof goal !== "string") {
      res.status(400).json({ error: "Missing 'goal' in request body" });
      return;
    }
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(401).json({ error: "Connect wallet to use AgentMesh" });
      return;
    }

    // Create or reuse chat
    let chat = chatId ? chatStore.getChat(walletAddress, chatId) : undefined;
    if (!chat) {
      chat = chatStore.createChat(walletAddress, goal.slice(0, 80));
    }

    // Store user message
    chatStore.addMessage(walletAddress, chat.id, "user", goal);

    try {
      const task = await agent.processGoal(goal);

      // Store result messages
      if (task.subtasks) {
        for (const sub of task.subtasks) {
          const icon = sub.status === "completed" ? "✓" : "✗";
          const content = `${icon} ${sub.description}\n${sub.result ? JSON.stringify(sub.result) : ""}`;
          chatStore.addMessage(
            walletAddress,
            chat.id,
            "mesh",
            content,
            sub.status === "completed" ? "success" : "error",
          );
        }
      }
      chatStore.addMessage(
        walletAddress,
        chat.id,
        "mesh",
        "━━━ Task complete ━━━",
        "done",
      );

      res.json({ task, chatId: chat.id });
    } catch (error) {
      chatStore.addMessage(
        walletAddress,
        chat.id,
        "mesh",
        `⚠ ${String(error)}`,
        "error",
      );
      res.status(500).json({ error: String(error) });
    }
  });

  // --- Chat API (wallet-authenticated) ---

  // List chats for a wallet
  app.get("/chats/:walletAddress", async (req, res) => {
    const { walletAddress } = req.params;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    // Rehydrate from 0G if first access
    await chatStore.loadWalletChats(walletAddress);
    const chats = chatStore.listChats(walletAddress);
    res.json({
      chats: chats.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        storageHash: c.storageHash,
      })),
    });
  });

  // Get a specific chat with messages
  app.get("/chats/:walletAddress/:chatId", async (req, res) => {
    const { walletAddress, chatId } = req.params;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    // Rehydrate from 0G if first access
    await chatStore.loadWalletChats(walletAddress);
    const chat = chatStore.getChat(walletAddress, chatId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json(chat);
  });

  // Delete a chat
  app.delete("/chats/:walletAddress/:chatId", (req, res) => {
    const { walletAddress, chatId } = req.params;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    const deleted = chatStore.deleteChat(walletAddress, chatId);
    res.json({ deleted });
  });

  // ENS subname registration — creates subname under agent-mesh.eth
  app.post("/ens/register", async (req, res) => {
    const { label, ownerAddress, endpoint, description, price } = req.body as {
      label?: string;
      ownerAddress?: string;
      endpoint?: string;
      description?: string;
      price?: string;
    };

    if (!label || !ownerAddress) {
      res.status(400).json({ error: "Missing 'label' or 'ownerAddress'" });
      return;
    }

    // Validate label: lowercase alphanumeric + hyphens only
    if (!/^[a-z0-9-]{3,}$/.test(label)) {
      res.status(400).json({
        error:
          "Invalid label: must be lowercase alphanumeric with hyphens, min 3 chars",
      });
      return;
    }

    // Validate ownerAddress is a valid Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      res.status(400).json({ error: "Invalid ownerAddress" });
      return;
    }

    try {
      const result = await createEnsSubname({
        label,
        ownerAddress,
        endpoint,
        description,
        price,
      });
      res.json(result);
    } catch (error) {
      console.error("ENS registration failed:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // SSE event stream
  app.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const unsubscribe = agent.onEvent((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
    });
  });

  const server = app.listen(port);

  // WebSocket for real-time bidirectional communication
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("📡 Dashboard connected via WebSocket");
    let wsWallet: string | null = null;
    let wsChatId: string | null = null;
    let pendingPaymentResolve:
      | ((response: { approved: boolean; signature?: string }) => void)
      | null = null;

    const unsubscribe = agent.onEvent((event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));

        // Persist mesh events to chat if wallet is authenticated
        if (wsWallet && wsChatId) {
          if (event.type === "tool_called") {
            chatStore.addMessage(
              wsWallet,
              wsChatId,
              "mesh",
              `⚡ Calling ${event.tool} → ${event.method}`,
              "tool",
            );
          } else if (event.type === "payment_sent") {
            const p = event.payment as
              | { amount?: string; to?: string; txHash?: string }
              | undefined;
            chatStore.addMessage(
              wsWallet,
              wsChatId,
              "mesh",
              `💰 Payment: ${p?.amount} USDC → ${p?.to}`,
              "payment",
            );
          } else if (event.type === "task_completed") {
            const result = event.result;
            if (typeof result === "string") {
              // Conversational reply (no subtasks)
              chatStore.addMessage(
                wsWallet,
                wsChatId,
                "mesh",
                result,
                "success",
              );
            } else {
              const task = result as
                | {
                    subtasks?: Array<{
                      description?: string;
                      status?: string;
                      result?: unknown;
                    }>;
                  }
                | undefined;
              if (task?.subtasks) {
                for (const sub of task.subtasks) {
                  const icon = sub.status === "completed" ? "✓" : "✗";
                  chatStore.addMessage(
                    wsWallet,
                    wsChatId,
                    "mesh",
                    `${icon} ${sub.description}\n${sub.result ? JSON.stringify(sub.result) : ""}`,
                    sub.status === "completed" ? "success" : "error",
                  );
                }
              }
            }
            chatStore.addMessage(
              wsWallet,
              wsChatId,
              "mesh",
              "━━━ Task complete ━━━",
              "done",
            );
          }
        }
      }
    });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as {
          type: string;
          goal?: string;
          walletAddress?: string;
          chatId?: string;
          approved?: boolean;
          signature?: string;
          signedMessage?: string;
          nonce?: string;
        };

        // Authenticate: verify wallet ownership via signed message
        if (message.type === "auth" && message.walletAddress) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(message.walletAddress)) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid wallet address",
              }),
            );
            return;
          }

          // If signature provided, verify it (SIWE)
          if (message.signature && message.signedMessage) {
            try {
              const recoveredAddress = ethers.verifyMessage(
                message.signedMessage,
                message.signature,
              );
              if (
                recoveredAddress.toLowerCase() !==
                message.walletAddress.toLowerCase()
              ) {
                ws.send(
                  JSON.stringify({
                    type: "auth_failed",
                    message: "Signature does not match wallet",
                  }),
                );
                return;
              }
              wsWallet = message.walletAddress.toLowerCase();
              ws.send(
                JSON.stringify({
                  type: "auth_success",
                  walletAddress: wsWallet,
                  verified: true,
                }),
              );
              console.log(`  🔐 WS SIWE verified: ${wsWallet.slice(0, 10)}...`);
            } catch {
              ws.send(
                JSON.stringify({
                  type: "auth_failed",
                  message: "Invalid signature",
                }),
              );
            }
          } else {
            // Legacy: allow unverified connection (will be read-only until signed)
            wsWallet = message.walletAddress.toLowerCase();
            ws.send(
              JSON.stringify({
                type: "auth_success",
                walletAddress: wsWallet,
                verified: false,
              }),
            );
            console.log(
              `  🔐 WS connected (unverified): ${wsWallet.slice(0, 10)}...`,
            );
          }
          return;
        }

        // Handle payment approval from client
        if (message.type === "payment_approval") {
          if (pendingPaymentResolve) {
            pendingPaymentResolve({
              approved: message.approved ?? false,
              signature: message.signature,
            });
            pendingPaymentResolve = null;
          }
          return;
        }

        if (message.type === "goal" && message.goal) {
          if (!wsWallet) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Connect wallet first",
              }),
            );
            return;
          }

          // Set up payment approval callback for this session
          agent.setPaymentApproval(async (request) => {
            // Send payment request to client
            ws.send(
              JSON.stringify({
                type: "payment_request",
                toolName: request.toolName,
                amount: request.amount,
                recipient: request.recipient,
                eip712: request.eip712,
              }),
            );

            // Wait for client response
            return new Promise((resolve) => {
              pendingPaymentResolve = resolve;
              // Timeout after 60 seconds
              setTimeout(() => {
                if (pendingPaymentResolve === resolve) {
                  pendingPaymentResolve = null;
                  resolve({ approved: false });
                }
              }, 60000);
            });
          }, wsWallet);

          // Create or reuse chat
          let chat = message.chatId
            ? chatStore.getChat(wsWallet, message.chatId)
            : undefined;
          if (!chat) {
            chat = chatStore.createChat(wsWallet, message.goal.slice(0, 80));
            ws.send(
              JSON.stringify({
                type: "chat_created",
                chatId: chat.id,
                title: chat.title,
              }),
            );
          }
          wsChatId = chat.id;

          // Store user message
          chatStore.addMessage(wsWallet, chat.id, "user", message.goal);

          await agent.processGoal(message.goal);

          // Clear payment callback after goal is done
          agent.setPaymentApproval(undefined);
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: String(error) }));
      }
    });

    ws.on("close", () => {
      unsubscribe();
      console.log("📡 Dashboard disconnected");
    });
  });

  return server;
}
