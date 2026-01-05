export class MarketInput {
  slug: string;
  title: string;
}

export class RankMarketsDto {
  walletAddress: string;
  markets: MarketInput[];
}
