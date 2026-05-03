const { KvClient } = require("@0gfoundation/0g-ts-sdk");

const KV_RPC = "http://178.238.236.119:6789";
const STREAM_ID =
  "0x35dd3e73dd3d8474f286fb6f5af5a1e953662d2d5d176994520390e14bad083d";

async function test() {
  const kv = new KvClient(KV_RPC);

  // Check if this node holds our stream
  console.log("Checking KV node streams...");
  try {
    const streams = await kv.getHoldingStreamIds();
    console.log("Holding streams:", streams.length);
    const hasOurs = streams.some(
      (s) => s.toLowerCase() === STREAM_ID.toLowerCase(),
    );
    console.log("Has our stream:", hasOurs);
    if (!hasOurs && streams.length > 0) {
      console.log("First few streams:", streams.slice(0, 5));
    }
  } catch (e) {
    console.log("getHoldingStreamIds error:", e.message);
  }

  // Try reading a key we know was written
  const key = Buffer.from(
    "agentmesh/chats/0x4f3cbe03724a12c334b4bc751f53aa3f546cd501/index",
    "utf8",
  );
  console.log("\nTrying to read index key...");
  try {
    const val = await kv.getValue(STREAM_ID, key);
    console.log("Result:", val ? "found data, size=" + val.size : "null");
    if (val && val.data) {
      const decoded = Buffer.from(val.data, "base64").toString("utf8");
      console.log("Data preview:", decoded.slice(0, 200));
    }
  } catch (e) {
    console.log("Read error:", e.message);
  }

  // Try getFirst to see if ANY data exists in this stream
  console.log("\nTrying getFirst on stream...");
  try {
    const first = await kv.getFirst(STREAM_ID, 0, 1024);
    console.log("First entry:", first ? "key=" + first.key : "null");
  } catch (e) {
    console.log("getFirst error:", e.message);
  }
}

test().catch(console.error);
