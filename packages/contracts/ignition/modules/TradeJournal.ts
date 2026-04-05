import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TradeJournal", (m) => {
  const tradeJournal = m.contract("TradeJournal");
  return { tradeJournal };
});