import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  headers: { "Content-Type": "application/json" },
});

// ── Strategy ──────────────────────────────────────────────
export async function parseStrategy(strategy: string) {
  const res = await api.post("/api/strategy/parse/internal", { strategy });
  return res.data.rules;
}

// ── Agents ────────────────────────────────────────────────
export async function createAgent(payload: {
  walletAddress: string;
  strategy: string;
  rules: unknown;
}) {
  const res = await api.post("/api/agents", payload);
  return res.data;
}

export async function getAgent(agentId: number) {
  const res = await api.get(`/api/agents/${agentId}`);
  return res.data;
}

export async function startAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/start`);
  return res.data;
}

export async function stopAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/stop`);
  return res.data;
}

export async function getAgentTrades(agentId: number) {
  const res = await api.get(`/api/agents/${agentId}/trades`);
  return res.data;
}

export async function getAgentByWallet(wallet: string) {
  const res = await api.get(`/api/agents/by-wallet/${wallet}`);
  return res.data;
}

export async function startArbAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/arb/start`);
  return res.data;
}

export async function stopArbAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/arb/stop`);
  return res.data;
}

export async function startAllocationAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/allocation/start`);
  return res.data;
}

export async function stopAllocationAgent(agentId: number) {
  const res = await api.post(`/api/agents/${agentId}/allocation/stop`);
  return res.data;
}

export async function updateStrategy(
  agentId: number,
  strategy: string,
  rules: unknown,
) {
  const res = await api.patch(`/api/agents/${agentId}/strategy`, {
    strategy,
    rules,
  });
  return res.data;
}
