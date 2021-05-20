export interface TokenInfo {
  symbol: string;
  decimals: number;
  name: string;
}

export interface Token extends TokenInfo {
  address: string;
}
