export const TRADE_JOURNAL_ABI = [
  "function logTrade(string asset, string direction, uint256 sizeUSDC, uint256 priceUSD, bytes32 reasonHash) returns (uint256)",
  "function verifyReason(uint256 tradeId, string reason) view returns (bool)",
  "event TradeLogged(uint256 indexed tradeId, address indexed agentId, uint256 timestamp, string asset, string direction, uint256 sizUSDC, uint256 priceUSD, bytes32 reasonHash)",
];

export const REPUTATION_REGISTRY_ABI = [
  "function recordTrade(address agentId, bool won, int256 pnlBps) external",
  "function getStats(address agentId) view returns (uint256 totalTrades, uint256 winCount, uint256 winRateBps, uint256 maxDrawdownBps)",
  "function getTier(address agentId) view returns (uint8)",
  "function getBudgetLimit(address agentId) view returns (uint256)",
];

export const AGENT_VAULT_FACTORY_ABI = [
  "function createVault(address agent, uint256 maxDrawdownBps, uint256 maxPositionSizeBps, uint256 maxDailySpendUSDC, uint256 cooldownSeconds) returns (address)",
  "function agentVault(address agent) view returns (address)",
  "function userVault(address user) view returns (address)",
  "event VaultCreated(address indexed user, address indexed agent, address vault, uint256 timestamp)",
];
