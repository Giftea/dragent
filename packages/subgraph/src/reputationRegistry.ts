import { BigInt }        from "@graphprotocol/graph-ts";
import { TradeRecorded, TierUpgraded } from "../generated/ReputationRegistry/ReputationRegistry";
import { AgentReputation, Agent }      from "../generated/schema";

export function handleTradeRecorded(event: TradeRecorded): void {
  let agentId = event.params.agentId.toHexString();

  // Ensure agent exists
  let agent = Agent.load(agentId);
  if (!agent) {
    agent             = new Agent(agentId);
    agent.address     = event.params.agentId;
    agent.totalTrades = BigInt.fromI32(0);
    agent.createdAt   = event.block.timestamp;
    agent.save();
  }

  // Create or update reputation
  let rep = AgentReputation.load(agentId);
  if (!rep) {
    rep              = new AgentReputation(agentId);
    rep.agent        = agentId;
    rep.totalTrades  = BigInt.fromI32(0);
    rep.winCount     = BigInt.fromI32(0);
    rep.winRateBps   = BigInt.fromI32(0);
    rep.maxDrawdownBps = BigInt.fromI32(0);
    rep.tier         = 0;
  }

  rep.totalTrades  = rep.totalTrades.plus(BigInt.fromI32(1));
  if (event.params.won) {
    rep.winCount = rep.winCount.plus(BigInt.fromI32(1));
  }
  rep.winRateBps   = event.params.newWinRate;
  rep.tier         = event.params.newTier;
  rep.lastUpdated  = event.block.timestamp;

  // Track max drawdown
  if (event.params.pnlBps.lt(BigInt.fromI32(0))) {
    let drawdown = event.params.pnlBps.neg();
    if (drawdown.gt(rep.maxDrawdownBps)) {
      rep.maxDrawdownBps = drawdown;
    }
  }

  rep.save();
}

export function handleTierUpgraded(event: TierUpgraded): void {
  let agentId = event.params.agentId.toHexString();
  let rep     = AgentReputation.load(agentId);
  if (!rep) return;

  rep.tier        = event.params.newTier;
  rep.lastUpdated = event.block.timestamp;
  rep.save();
}