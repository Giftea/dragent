import { BigInt }       from "@graphprotocol/graph-ts";
import { VaultCreated } from "../generated/AgentVaultFactory/AgentVaultFactory";
import { Vault, Agent } from "../generated/schema";

export function handleVaultCreated(event: VaultCreated): void {
  let agentId = event.params.agent.toHexString();

  // Ensure agent exists
  let agent = Agent.load(agentId);
  if (!agent) {
    agent             = new Agent(agentId);
    agent.address     = event.params.agent;
    agent.totalTrades = BigInt.fromI32(0);
    agent.createdAt   = event.block.timestamp;
    agent.save();
  }

  // Create vault
  let vaultId      = event.params.vault.toHexString();
  let vault        = new Vault(vaultId);
  vault.user        = event.params.user;
  vault.agent       = agentId;
  vault.vaultAddress = event.params.vault;
  vault.createdAt   = event.params.timestamp;
  vault.save();
}