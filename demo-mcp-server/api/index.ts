// Vercel serverless entry — wraps Express app
import express from "express";
import type { Request, Response } from "express";

// ─── NFT Collection Data (inline for serverless) ───
interface NFTCollection {
  name: string;
  slug: string;
  description: string;
  floorPrice: string;
  totalSupply: string;
  owners: string;
  image: string;
  chain: string;
}

const COLLECTIONS: NFTCollection[] = [
  {
    name: "Azuki",
    slug: "azuki",
    description:
      "A brand for the metaverse. Built by the community. 10,000 anime-inspired avatars that give you membership access to The Garden.",
    floorPrice: "4.8 ETH",
    totalSupply: "10,000",
    owners: "5,201",
    image:
      "https://ipfs.io/ipfs/QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg/0.png",
    chain: "Ethereum",
  },
  {
    name: "Pudgy Penguins",
    slug: "pudgy-penguins",
    description:
      "Pudgy Penguins is a collection of 8,888 NFTs. Each penguin is unique and programmatically generated from over 150 attributes.",
    floorPrice: "9.2 ETH",
    totalSupply: "8,888",
    owners: "4,876",
    image:
      "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/1.png",
    chain: "Ethereum",
  },
  {
    name: "Milady Maker",
    slug: "milady",
    description:
      "Milady Maker is a collection of 10,000 generative pfp NFTs in a neochibi aesthetic inspired by Tokyo street style.",
    floorPrice: "3.1 ETH",
    totalSupply: "10,000",
    owners: "5,612",
    image: "https://www.miladymaker.net/milady/1.png",
    chain: "Ethereum",
  },
];

function nftCollectionInfo(args: {
  collection?: string;
  query?: string;
  task?: string;
}) {
  const search = (
    args.collection ??
    args.query ??
    args.task ??
    ""
  ).toLowerCase();

  // Detect generic "list all" type queries
  const isListAll =
    !search ||
    /\b(all|list|popular|collections?|floor prices?|every|show|stats|info)\b/.test(
      search,
    );

  if (isListAll) {
    const list = COLLECTIONS.map(
      (c, i) =>
        `${i + 1}. **${c.name}** — Floor: ${c.floorPrice} | Supply: ${c.totalSupply} | Chain: ${c.chain}\n   ![${c.name}](${c.image})`,
    ).join("\n\n");
    return {
      content: [
        { type: "text", text: `## 📊 Popular NFT Collections\n\n${list}` },
      ],
    };
  }

  const searchWords = search.split(/\s+/).filter((w) => w.length > 3);
  const match = COLLECTIONS.find(
    (c) =>
      c.name.toLowerCase().includes(search) ||
      c.slug.includes(search) ||
      searchWords.some(
        (w) => c.name.toLowerCase().includes(w) || c.slug.includes(w),
      ),
  );

  if (!match) {
    const names = COLLECTIONS.map((c) => c.name).join(", ");
    return {
      content: [
        {
          type: "text",
          text: `No collection found matching "${search}". Available: ${names}`,
        },
      ],
    };
  }

  const text = [
    `## ${match.name}`,
    ``,
    `![${match.name}](${match.image})`,
    ``,
    `${match.description}`,
    ``,
    `| Stat | Value |`,
    `|------|-------|`,
    `| Floor Price | ${match.floorPrice} |`,
    `| Total Supply | ${match.totalSupply} |`,
    `| Owners | ${match.owners} |`,
    `| Chain | ${match.chain} |`,
  ].join("\n");

  return { content: [{ type: "text", text }] };
}

// ─── MCP Tool Definitions ───
const MCP_TOOLS = [
  {
    name: "nft-collection-info",
    description:
      "Get NFT collection stats, floor price, supply, and images. Search by name (e.g. 'bored ape', 'azuki', 'pudgy penguins').",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description:
            "Collection name or keyword to search (e.g. 'bayc', 'azuki', 'punks'). Leave empty to see all.",
        },
      },
    },
    example: "Get stats and floor price for the Pudgy Penguins collection",
    keywords: "nft, collection, floor price, images, ethereum, metadata",
  },
];

// ─── Express App ───
const app = express();
app.use(express.json());

app.use((_req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    provider: "nft-collection-info",
    tools: 1,
    timestamp: Date.now(),
  });
});

app.get("/.well-known/x402.json", (_req: Request, res: Response) => {
  res.json({
    accepts: ["USDC"],
    network: "base-sepolia",
    price: "0.02",
    description: "NFT Collection Info MCP Provider — $0.02 USDC per tool call",
    payTo:
      process.env.PROVIDER_WALLET ??
      "0x0000000000000000000000000000000000000000",
  });
});

app.post("/mcp", async (req: Request, res: Response) => {
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
          serverInfo: { name: "nft-collection-info", version: "1.0.0" },
        },
      });
      break;

    case "tools/list":
      res.json({ jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
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
          error: { code: -32602, message: "Missing tool name" },
        });
        return;
      }

      if (toolName === "nft-collection-info") {
        const result = nftCollectionInfo(args);
        res.json({ jsonrpc: "2.0", id, result });
      } else {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        });
      }
      break;
    }

    default:
      res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${body.method}` },
      });
  }
});

export default app;
