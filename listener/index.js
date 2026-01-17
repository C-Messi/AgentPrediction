/* eslint-disable no-console */
const { ethers } = require("ethers");

const ABI = [
  "event MarketCreated(uint256 indexed marketId,address indexed creator,string question,uint256 endTime,uint256 initialYesPred,uint256 initialNoPred)",
  "event Comment(uint256 indexed marketId,address indexed user,string content)",
  "event Danmaku(uint256 indexed marketId,address indexed user,string content)",
  "event SharesBought(uint256 indexed marketId,address indexed user,bool isYes,uint256 predIn,uint256 sharesOut)"
];

function getProvider() {
  const RPC_URL = process.env.RPC_URL || "https://testnet-rpc.monad.xyz";
  return new ethers.JsonRpcProvider(RPC_URL);
}

async function backfill(contract, startBlock, chunkSize) {
  const endBlock = await contract.runner.getBlockNumber();
  const events = [
    { name: "MarketCreated", filter: contract.filters.MarketCreated() },
    { name: "Comment", filter: contract.filters.Comment() },
    { name: "Danmaku", filter: contract.filters.Danmaku() },
    { name: "SharesBought", filter: contract.filters.SharesBought() }
  ];

  for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += chunkSize) {
    const toBlock = Math.min(fromBlock + chunkSize - 1, endBlock);
    for (const item of events) {
      const logs = await contract.queryFilter(item.filter, fromBlock, toBlock);
      logs.forEach((log) => logEvent(item.name, log.args));
    }
  }
}

function logEvent(name, args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${name}`, args);
}

async function main() {
  const MARKET_ADDR =
    process.env.MARKET_ADDR || "0xb88ae24564251ec870bf8e4c144b8c501dd403f3";
  const START_BLOCK = process.env.START_BLOCK || "6728078";
  const CHUNK_SIZE = Number(process.env.BLOCK_RANGE || "100");
  if (!MARKET_ADDR) {
    throw new Error("MARKET_ADDR is required");
  }

  const provider = getProvider();
  const contract = new ethers.Contract(MARKET_ADDR, ABI, provider);

  if (START_BLOCK) {
    const start = Number(START_BLOCK);
    if (!Number.isNaN(start)) {
      await backfill(contract, start, CHUNK_SIZE);
    }
  }

  contract.on("MarketCreated", (...args) => logEvent("MarketCreated", args));
  contract.on("Comment", (...args) => logEvent("Comment", args));
  contract.on("Danmaku", (...args) => logEvent("Danmaku", args));
  contract.on("SharesBought", (...args) => {
    const [marketId, user, isYes, predIn, sharesOut] = args;
    logEvent("SharesBought", { marketId, user, isYes, predIn, sharesOut });
  });

  console.log("Listener started:", MARKET_ADDR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
