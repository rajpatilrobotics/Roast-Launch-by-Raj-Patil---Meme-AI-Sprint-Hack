export const BSC_TESTNET = {
  chainIdHex: "0x61",
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
  faucetUrl: "https://www.bnbchain.org/en/testnet-faucet",
  explorerTx: (hash: string) => `https://testnet.bscscan.com/tx/${hash}`,
  label: "BNB Testnet",
};

export const CHAIN = BSC_TESTNET;
