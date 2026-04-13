import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { TradeLogged }   from "../generated/TradeJournal/TradeJournal";
import { Trade, Agent }  from "../generated/schema";

export function handleTradeLogged(event: TradeLogged): void {
  // Create or load agent
  let agentId = event.params.agentId.toHexString();
  let agent   = Agent.load(agentId);

  if (!agent) {
    agent             = new Agent(agentId);
    agent.address     = event.params.agentId;
    agent.totalTrades = BigInt.fromI32(0);
    agent.createdAt   = event.block.timestamp;
  }

  agent.totalTrades = agent.totalTrades.plus(BigInt.fromI32(1));
  agent.save();

  // Create trade
  let tradeId  = event.params.tradeId.toString();
  let trade    = new Trade(tradeId);

  trade.tradeId    = event.params.tradeId;
  trade.agentId    = event.params.agentId;
  trade.timestamp  = event.params.timestamp;
  trade.asset      = event.params.asset;
  trade.direction  = event.params.direction;
  trade.sizeUSDC   = event.params.sizUSDC;
  trade.priceUSD   = event.params.priceUSD;
  trade.reasonHash = event.params.reasonHash;
  trade.agent      = agentId;

  trade.save();
}