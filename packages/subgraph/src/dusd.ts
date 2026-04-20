import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer, AuthorizationUsed } from "../generated/DUSD/DUSD";
import { GaslessTransfer }             from "../generated/schema";

export function handleDUSDTransfer(event: Transfer): void {
  const id       = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const transfer = new GaslessTransfer(id);

  transfer.from      = event.params.from;
  transfer.to        = event.params.to;
  transfer.amount    = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.txHash    = event.transaction.hash;

  transfer.save();
}

export function handleAuthorizationUsed(event: AuthorizationUsed): void {
  // Authorization events captured via Transfer handler
}
