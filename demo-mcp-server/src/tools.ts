// Demo MCP Tool Provider for AgentMesh
// NFT Collection Info — returns collection stats + images
// No external API needed, instant responses

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

interface NFTCollection {
  name: string;
  slug: string;
  description: string;
  floorPrice: string;
  totalSupply: string;
  owners: string;
  image: string;
  banner: string;
  website: string;
  chain: string;
}

const COLLECTIONS: NFTCollection[] = [
  {
    name: "Bored Ape Yacht Club",
    slug: "bayc",
    description:
      "A collection of 10,000 unique Bored Ape NFTs living on the Ethereum blockchain. Ownership grants access to members-only benefits.",
    floorPrice: "12.5 ETH",
    totalSupply: "10,000",
    owners: "6,432",
    image:
      "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/0",
    banner:
      "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1",
    website: "https://boredapeyachtclub.com",
    chain: "Ethereum",
  },
  {
    name: "CryptoPunks",
    slug: "cryptopunks",
    description:
      "10,000 unique collectible characters with proof of ownership stored on the Ethereum blockchain. One of the earliest NFT projects.",
    floorPrice: "38.9 ETH",
    totalSupply: "10,000",
    owners: "3,780",
    image:
      "https://ipfs.io/ipfs/QmWkiRC3ZqF2WBp7nQfNLjPdqx7bRYvNUyAiTR6EzfGMj4",
    banner:
      "https://ipfs.io/ipfs/QmWkiRC3ZqF2WBp7nQfNLjPdqx7bRYvNUyAiTR6EzfGMj4",
    website: "https://www.larvalabs.com/cryptopunks",
    chain: "Ethereum",
  },
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
    banner:
      "https://ipfs.io/ipfs/QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg/1.png",
    website: "https://www.azuki.com",
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
    banner:
      "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/2.png",
    website: "https://www.pudgypenguins.com",
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
    banner: "https://www.miladymaker.net/milady/2.png",
    website: "https://miladymaker.net",
    chain: "Ethereum",
  },
  {
    name: "Base Onchain Summer",
    slug: "base-onchain-summer",
    description:
      "Commemorative NFTs from Base's Onchain Summer campaign. Free mints celebrating the launch of Base L2.",
    floorPrice: "0.002 ETH",
    totalSupply: "500,000+",
    owners: "200,000+",
    image: "https://basescan.org/images/svg/brands/main.svg",
    banner: "https://basescan.org/images/svg/brands/main.svg",
    website: "https://base.org",
    chain: "Base",
  },
];

// ─── Tool: nft-collection-info ───
export async function nftCollectionInfo(args: {
  collection?: string;
  query?: string;
  task?: string;
}): Promise<ToolResult> {
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
    // Return all collections summary
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

  // Find matching collection
  const searchWords = search.split(/\s+/).filter((w) => w.length > 3);
  const match = COLLECTIONS.find(
    (c) =>
      c.name.toLowerCase().includes(search) ||
      c.slug.includes(search) ||
      c.description.toLowerCase().includes(search) ||
      searchWords.some(
        (w) => c.name.toLowerCase().includes(w) || c.slug.includes(w),
      ),
  );

  if (!match) {
    // Fuzzy: return all with note
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
    `| Website | ${match.website} |`,
  ].join("\n");

  return { content: [{ type: "text", text }] };
}
