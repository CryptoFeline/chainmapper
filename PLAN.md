# Project Plan

- We are building a mobile first webapp for Crypto holder mapping via bubblemap, toplist and PnL data. 

## Features
- Interactive Bubble Map designed for mobile users
- Bubble graph for wallets as nodes and transactions as links
- Toplist of Crypto Holders from API data
- Profit and Loss Data Visualization from API data
- Mobile first Design

## Data source:

- OKX API: `https://web3.okx.com/priapi/v1/holder-intelligence/cluster/info?chainId=1&chainIndex=1&tokenAddress=0x10ea9e5303670331bdddfa66a4cea47dae4fcf3b&t=1764233300852`

- Tags:
    - `chainId`: Blockchain ID - `1` for Ethereum, `56` for BSC, `501` for Solana, and `8453` for Base.
    - `chainIndex`: Network Index - `1`, `56`, `501`, `8453`.
    - `tokenAddress`: Contract address of the token.
    - `t`: Timestamp in milliseconds.

- Response fields:
```json
{
  "code": 0,
  "msg": "success",
  "error_code": "0",
  "error_message": "",
  "detailMsg": "",
  "data": {
    "chain": "1",
    "tokenAddress": "0x10ea9e5303670331bdddfa66a4cea47dae4fcf3b",
    "tokenName": "Session Token",
    "clusterConcentration": "High",
    "top100Holding": "0.99798",
    "rugpullProbability": "--",
    "freshWallets": "0.01100",
    "sameRecentFundingSource": "--",
    "sameCreationTime": "1.00000",
    "links": [
        {
        "source": "0x9008d19f58aabd9ed0d60971565aa8510560ab41",
        "target": "0x000000000004444c5dc75cb358380d2e3de08a90",
        "solid": true
        },
        { ... } // more link objects
    ],
    "clusterList": [
      {
        "clusterName": "Rank-1",
        "clusterId": 31184492,
        "rank": 1,
        "followed": false,
        "createdAt": 1756914776,
        "addressCount": 1,
        "holdingAmount": "229566978.9",
        "holdingValue": "50195918.9",
        "holdingPct": "0.95653",
        "holdingAvgTime": "1756881347",
        "tokenPnl": "0",
        "tokenPnlPct": "0.0",
        "boughtValue": "0",
        "avgCost": "0.0",
        "soldValue": "0",
        "avgSell": "0.0",
        "lastActive": 0,
        "children": [
            {
            "address": "0xcee284f754e854890e311e3280b767f80797180d",
            "rank": 1,
            "holdingPct": "0.95653",
            "holdingAmount": "2.2956697891777226E8",
            "holdingValue": "50195918.9",
            "holdingAvgTime": 1756881347,
            "lastActive": 0,
            "tagList": [
              [
                "whales"
              ],
              [
                "topHolder"
              ]
            ],
            "contract": false,
            "exchange": false,
            "kol": false
          }
        ]
      },
      {
        "clusterName": "Rank-2",
        "clusterId": 31184473,
        "rank": 2,
        "followed": false,
        "createdAt": 1756914776,
        "addressCount": 4,
        "holdingAmount": "1695722.6",
        "holdingValue": "370777.9",
        "holdingPct": "0.00707",
        "holdingAvgTime": "1756880268",
        "tokenPnl": "129589.940454343810004161101662585",
        "tokenPnlPct": "1.07497",
        "boughtValue": "120552.198687687166964207851458212",
        "avgCost": "1.0000000000",
        "soldValue": "8411.941266986627672303862199018",
        "avgSell": "0.1063667031",
        "lastActive": 1764231659,
        "children": [
          {
            "address": "0x000000000004444c5dc75cb358380d2e3de08a90",
            "rank": 2,
            "holdingPct": "0.00697",
            "holdingAmount": "1673859.924453676",
            "holdingValue": "365997.5",
            "holdingAvgTime": 1756881611,
            "tokenPnl": "128717.000627403118397260087483133",
            "tokenPnlPct": "1.07351",
            "boughtValue": "119902.574691560095414494771458212",
            "avgCost": "0.101814725431865153",
            "soldValue": "8411.941266986627672303862199018",
            "avgSell": "0.106366703097116953",
            "lastActive": 1764231659,
            "tagList": [
              [
                "whales"
              ],
              [
                "topHolder"
              ]
            ],
            "contract": false,
            "exchange": false,
            "kol": false
          },
          {
            "address": "0xe19733ccde0d0bb770d4c59cf36d2d9edb8f8484",
            "rank": 107,
            "holdingPct": "0.00003",
            "holdingAmount": "6955.895110954",
            "holdingValue": "1520.9",
            "holdingAvgTime": 1756941323,
            "tokenPnl": "872.939826940691606901014179452",
            "tokenPnlPct": "1.34376",
            "boughtValue": "649.62399612707154971308",
            "avgCost": "0.093158382321837746",
            "soldValue": "0",
            "avgSell": "0",
            "lastActive": 1762633463,
            "tagList": [],
            "trend": [
              "buy"
            ],
            "contract": false,
            "exchange": false,
            "kol": false
          },
          {
            "address": "0x9008d19f58aabd9ed0d60971565aa8510560ab41",
            "rank": 173,
            "holdingPct": "0.00001",
            "holdingAmount": "2066.654672828",
            "holdingValue": "451.9",
            "holdingAvgTime": 1755690023,
            "lastActive": 0,
            "tagList": [],
            "contract": false,
            "exchange": false,
            "kol": false
          }
        ],
        "trend": [
          "buy",
          "transferIn"
        ]
      },
      { ... } // more cluster objects
    ],
    "createdAt": 1764232624
  }
}
```

- Here is the response field map with all possible non-repeating fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | Response code (0 = success) |
| `msg` | string | Response message |
| `error_code` | string | Error code if applicable |
| `error_message` | string | Error message details |
| `detailMsg` | string | Additional detail message |
| **`data`** | **object** | **Main response payload** |
| `data.chain` | string | Blockchain ID (1=Ethereum, 56=BSC, 501=Solana, 8453=Base) |
| `data.tokenAddress` | string | Token contract address |
| `data.tokenName` | string | Token name |
| `data.clusterConcentration` | string | Concentration level (e.g., "High") |
| `data.top100Holding` | string | Percentage held by top 100 addresses |
| `data.rugpullProbability` | string | Probability of rugpull risk |
| `data.freshWallets` | string | Percentage of fresh wallets |
| `data.sameRecentFundingSource` | string | Addresses with same recent funding source |
| `data.sameCreationTime` | string | Addresses created at same time |
| **`data.links[]`** | **array** | **Transaction links between wallets** |
| `data.links[].source` | string | Source wallet address |
| `data.links[].target` | string | Target wallet address |
| `data.links[].solid` | boolean | Link validity flag |
| **`data.clusterList[]`** | **array** | **Holder clusters ranked by holdings** |
| `data.clusterList[].clusterName` | string | Cluster identifier (e.g., "Rank-1") |
| `data.clusterList[].clusterId` | number | Unique cluster ID |
| `data.clusterList[].rank` | number | Rank position |
| `data.clusterList[].followed` | boolean | Followed status |
| `data.clusterList[].createdAt` | number | Creation timestamp |
| `data.clusterList[].addressCount` | number | Number of addresses in cluster |
| `data.clusterList[].holdingAmount` | string | Total tokens held |
| `data.clusterList[].holdingValue` | string | USD value of holdings |
| `data.clusterList[].holdingPct` | string | Percentage of total supply |
| `data.clusterList[].holdingAvgTime` | string | Average holding duration |
| `data.clusterList[].tokenPnl` | string | Profit/Loss in USD |
| `data.clusterList[].tokenPnlPct` | string | Profit/Loss percentage |
| `data.clusterList[].boughtValue` | string | Total purchase value |
| `data.clusterList[].avgCost` | string | Average purchase price |
| `data.clusterList[].soldValue` | string | Total sale proceeds |
| `data.clusterList[].avgSell` | string | Average sale price |
| `data.clusterList[].lastActive` | number | Last activity timestamp |
| `data.clusterList[].trend[]` | array | Activity trends (e.g., "buy", "transferIn") |
| **`data.clusterList[].children[]`** | **array** | **Individual addresses in cluster** |
| `data.clusterList[].children[].address` | string | Wallet address |
| `data.clusterList[].children[].rank` | number | Individual rank within cluster |
| `data.clusterList[].children[].holdingPct` | string | Address holding percentage |
| `data.clusterList[].children[].holdingAmount` | string | Tokens held by address |
| `data.clusterList[].children[].holdingValue` | string | USD value of holdings |
| `data.clusterList[].children[].holdingAvgTime` | number | Average holding duration |
| `data.clusterList[].children[].lastActive` | number | Last activity timestamp |
| `data.clusterList[].children[].tagList[][]` | array | Tags (e.g., "whales", "topHolder") |
| `data.clusterList[].children[].trend[]` | array | Activity trends |
| `data.clusterList[].children[].contract` | boolean | Is contract address |
| `data.clusterList[].children[].exchange[]` | boolean | Is exchange address |
| `data.clusterList[].children[].exchange[].name` | string | Exchange name if applicable (e.g., Bybit) |
| `data.clusterList[].children[].exchange[].attr` | string | Exchange attribute if applicable (e.g. Cold Wallet) |
| `data.clusterList[].children[].exchange[].logoUrl` | string | Exchange logo URL if applicable (e.g., https://static.coinall.ltd/cdn/web3/tag_library/logo/1763723062205.png/type=png_350_0) |
| `data.clusterList[].children[].kol` | boolean | Is KOL/influencer |
| `data.clusterList[].children[].tokenPnl` | string | Address Profit/Loss in USD |
| `data.clusterList[].children[].tokenPnlPct` | string | Address Profit/Loss percentage |
| `data.clusterList[].children[].boughtValue` | string | Address total purchases |
| `data.clusterList[].children[].avgCost` | string | Address average purchase price |
| `data.clusterList[].children[].soldValue` | string | Address total sales |
| `data.clusterList[].children[].avgSell` | string | Address average sale price |
| `data.createdAt` | number | API response creation timestamp |

### Data usage from fields

#### Bubble Map Node Graph
- **Nodes**: `data.clusterList[].children[].address` (individual wallets)
- **Node Size**: `data.clusterList[].children[].holdingPct` (percentage of total supply for proportional sizing)
- **Node Color**: `data.clusterList[].rank` (color-coded by cluster rank for visual grouping)
- **Node Tags**: `data.clusterList[].children[].tagList[][]`, `contract`, `exchange`, `kol` flags
- **Node Icon**: Use exchange logo from `data.clusterList[].children[].exchange[].logoUrl` if available - if tags are contract without logo, use a generic contract icon (we will design a set of icons for tags)
- **Links**: `data.links[]` with `source`, `target`, `solid` (transaction relationships)

#### Clustering & Hierarchy
- **Cluster Groups**: `data.clusterList[]` ranked by `rank` and `holdingPct`
- **Cluster Name**: `data.clusterList[].clusterName`
- **Member Count**: `data.clusterList[].addressCount`
- **Concentration**: `data.clusterConcentration`, `data.top100Holding` for risk overview

#### Total Overview Panel
- **Token Info**: `tokenName`, `tokenAddress`, `chain`
- **Risk Metrics**: `rugpullProbability`, `freshWallets`, `sameCreationTime`, `sameRecentFundingSource`
- **Supply Distribution**: `top100Holding` percentage
- **Cluster Summary**: Count of clusters from `clusterList[]` length

#### Per Cluster Detail
- **Cluster Metrics**: `holdingAmount`, `holdingValue`, `holdingPct`, `addressCount`
- **Performance**: `tokenPnl`, `tokenPnlPct`, `boughtValue`, `avgCost`, `soldValue`, `avgSell`
- **Activity**: `lastActive`, `trend[]`, `holdingAvgTime`
- **Member List**: `children[]` array with individual address details

### Per Wallet Detail
- **Identity**: `address`, `tagList[][]` (whales, topHolder, bundle etc.)
- **Holdings**: `holdingAmount`, `holdingValue`, `holdingPct`, `holdingAvgTime`
- **P&L Data**: `tokenPnl`, `tokenPnlPct`, `boughtValue`, `avgCost`, `soldValue`, `avgSell`
- **Type Flags**: `contract`, `exchange`, `kol` booleans
- **Exchange Info**: `exchange[].name`, `exchange[].attr`, `exchange[].logoUrl` if applicable
- **Activity**: `lastActive`, `trend[]`
- **Network**: Connected via `links[]` (source/target matching `address`)

#### Unused Fields
- `code`, `msg`, `error_code`, `error_message`, `detailMsg` (metadata only)
- `data.clusterList[].followed` (if wallet is followed by account this boolean is true - not relevant for public data)
- `data.clusterList[].createdAt` (timestamp, display as a stamp)
- `data.clusterList[].clusterId` (internal ID, optional for tracking)

#### Missing/Needed Datapoints ⚠️
- **Link metadata**: Consider adding transaction amount/value to `data.links[]` - currently only source/target, we need an enrichment process here
- **Cluster trend[]**: Add trend data at cluster level (currently only in children and top-level) - we create a summary trend for clusters
- **Price data**: Current token price for PnL context - we integrate a token API for real-time pricing
- **Timestamp localization**: Consider display format for Unix timestamps - we convert to human-readable dates in UI - for stamp we show full date-time, for lastActive we show relative time (e.g., "2d" or "5h")

## API for Token Info
- URL: `https://web3.okx.com/priapi/v1/dx/market/v2/latest/info?tokenContractAddress=0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c&chainId=1&t=176423669408`
- Tags:
    - `tokenContractAddress`: Contract address of the token.
    - `chainId`: Blockchain ID - `1` for Ethereum, `56` for BSC, `501` for Solana, and `8453` for Base.
    - `t`: Timestamp in milliseconds.
- Response fields:
```json
{
  "code": 0,
  "data": {
    "bundleHoldingRatio": "0",
    "chainBWLogoUrl": "https://static.coinall.ltd/cdn/assets/imgs/227/21F7EC00BF87A4DF.png",
    "chainLogoUrl": "https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png",
    "chainName": "Ethereum",
    "change": "12.59",
    "change1H": "-0.25",
    "change4H": "1.36",
    "change5M": "-0.15",
    "changeUtc0": "2.93",
    "changeUtc8": "11.49",
    "circulatingSupply": "1000000000.0000000000",
    "dappList": [],
    "devHoldingRatio": "0",
    "earlyBuyerStatisticsInfo": {
      "chainId": 1,
      "earlyBuyerHoldAmount": "0",
      "tokenContractAddress": "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c",
      "totalEarlyBuyerAmount": "0"
    },
    "holders": "48915",
    "isCollected": "",
    "isNotSupportTxNativeToken": "0",
    "isSubscribe": "0",
    "isSupportBlinksShareUrl": "0",
    "isSupportHolder": "1",
    "isSupportHolderExpandData": "0",
    "isSupportMarketCapKline": "1",
    "isTxPrice": "1",
    "liquidity": "16834836.6246256765875286039151172980764",
    "marketCap": "732749577.590612615",
    "maxPrice": "0.752517096911949866",
    "minPrice": "0.042302190715775194",
    "moduleType": "0",
    "nativeTokenSymbol": "ETH",
    "price": "0.732749577590612615",
    "riskControlLevel": "1",
    "riskLevel": "2",
    "snipersClear": "",
    "snipersTotal": "",
    "supportLimitOrder": "0",
    "supportMemeMode": "0",
    "supportSingleChainSwap": "1",
    "supportSwap": "1",
    "supportTrader": "1",
    "suspiciousHoldingRatio": "",
    "t": [
      {
        "e": {

        },
        "k": "communityRecognized",
        "m": 1
      }
    ],
    "tagList": [
      [
        "communityRecognized"
      ],
      [
        "devHoldingRatio_0"
      ]
    ],
    "tokenContractAddress": "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c",
    "tokenFee": "",
    "tokenLargeLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/8453-0x50da645f148798f68ef2d7db7c1cb22a6819bb2c-106/type=default_350_0?v=1764172821415",
    "tokenLogoUrl": "https://static.oklink.com/cdn/web3/currency/token/large/8453-0x50da645f148798f68ef2d7db7c1cb22a6819bb2c-106/type=default_90_0?v=1764172821415",
    "tokenName": "SPX6900",
    "tokenSymbol": "SPX",
    "tokenThirdPartInfo": {
      "okxDarkDefaultLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okxmaps-dark-default.png",
      "okxDarkHoverLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okmaps-dark-hover.png",
      "okxLightDefaultLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okmaps-light-default.png",
      "okxLightHoverLogo": "https://static.coinall.ltd/cdn/web3/dex/market/okxmaps-light-hover.png",
      "okxWebSiteName": "Holder maps",
      "okxWebSiteUrl": "https://web3.okx.com/holder-intelligence/ethereum/0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c",
      "thirdPartyWebSiteColorLogo": "https://static.coinall.ltd/cdn/web3/dex/market/bubblemaps-color.png",
      "thirdPartyWebSiteGreyLogo": "https://static.coinall.ltd/cdn/web3/dex/market/bubblemaps-grey.png",
      "thirdPartyWebSiteName": "BubbleMaps",
      "thirdPartyWebSiteUrl": "https://app.bubblemaps.io/eth/token/0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c"
    },
    "top10HoldAmountPercentage": "27.677251190591082",
    "tradeNum": "10464382.44223511",
    "transactionNum": "3628",
    "volume": "7284407.80449777733936270928",
    "wrapperTokenContractAddress": ""
  },
  "detailMsg": "",
  "error_code": "0",
  "error_message": "",
  "msg": ""
}
```
- Here is the response field map with all possible non-repeating fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | Response code (0 = success) |
| `msg` | string | Response message |
| `error_code` | string | Error code if applicable |
| `error_message` | string | Error message details |
| `detailMsg` | string | Additional detail message |
| **`data`** | **object** | **Main response payload** |
| `data.bundleHoldingRatio` | string | Bundle holding ratio |
| `data.chainBWLogoUrl` | string | Blockchain BW logo URL |
| `data.chainLogoUrl` | string | Blockchain logo URL |
| `data.chainName` | string | Blockchain name |
| `data.change` | string | Price change percentage (24h) |
| `data.change1H` | string | 1-hour price change percentage |
| `data.change4H` | string | 4-hour price change percentage |
| `data.change5M` | string | 5-minute price change percentage |
| `data.changeUtc0` | string | UTC+0 price change percentage |
| `data.changeUtc8` | string | UTC+8 price change percentage |
| `data.circulatingSupply` | string | Circulating supply of the token |
| `data.dappList[]` | array | List of associated DApps |
| `data.devHoldingRatio` | string | Developer holding ratio |
| `data.earlyBuyerStatisticsInfo[]` | object | Early buyer statistics information |
| `data.earlyBuyerStatisticsInfo[].chainId` | number | Blockchain ID |
| `data.earlyBuyerStatisticsInfo[].earlyBuyerHoldAmount` | string | Early buyer holding amount |
| `data.earlyBuyerStatisticsInfo[].tokenContractAddress` | string | Token contract address |
| `data.earlyBuyerStatisticsInfo[].totalEarlyBuyerAmount` | string | Total early buyer amount |
| `data.holders` | string | Number of token holders |
| `data.isCollected` | string | Collection status |
| `data.isNotSupportTxNativeToken` | string | Support status for native token transactions |
| `data.isSubscribe` | string | Subscription status |
| `data.isSupportBlinksShareUrl` | string | Support status for Blinks share URL |
| `data.isSupportHolder` | string | Support status for holder information |
| `data.isSupportHolderExpandData` | string | Support status for expanded holder data |
| `data.isSupportMarketCapKline` | string | Support status for market cap K-line |
| `data.isTxPrice` | string | Transaction price support status |
| `data.liquidity` | string | Token liquidity in USD |
| `data.marketCap` | string | Market capitalization in USD |
| `data.maxPrice` | string | Maximum recorded price |
| `data.minPrice` | string | Minimum recorded price |
| `data.moduleType` | string | Module type identifier |
| `data.nativeTokenSymbol` | string | Native token symbol of the blockchain |
| `data.price` | string | Current token price in USD |
| `data.riskControlLevel` | string | Risk control level |
| `data.riskLevel` | string | Risk level of the token |
| `data.snipersClear` | string | Snipers clear status |
| `data.snipersTotal` | string | Total number of snipers |
| `data.supportLimitOrder` | string | Support status for limit orders |
| `data.supportMemeMode` | string | Support status for meme mode |
| `data.supportSingleChainSwap` | string | Support status for single-chain swaps |
| `data.supportSwap` | string | Support status for swaps |
| `data.supportTrader` | string | Support status for traders |
| `data.suspiciousHoldingRatio` | string | Suspicious holding ratio |
| `data.t[]` | array | Additional token attributes (e.g., `e{}`, `k`, `m`)|
| `data.tagList[][]` | array | List of token tags |
| `data.tokenContractAddress` | string | Token contract address |
| `data.tokenFee` | string | Token fee information |
| `data.tokenLargeLogoUrl` | string | URL for the large token logo |
| `data.tokenLogoUrl` | string | URL for the token logo |
| `data.tokenName` | string | Name of the token |
| `data.tokenSymbol` | string | Symbol of the token |
| `data.tokenThirdPartInfo` | object | Third-party token information |
| `data.top10HoldAmountPercentage` | string | Percentage held by top 10 holders |
| `data.tradeNum` | string | Number of trades |
| `data.transactionNum` | string | Number of transactions |
| `data.volume` | string | Trading volume of the token |
| `data.wrapperTokenContractAddress` | string | Wrapper token contract address |

### Data usage from fields
- **Token Image**: `data.tokenLogoUrl`, `data.tokenLargeLogoUrl`
- **Token Name & Symbol**: `data.tokenName`, `data.tokenSymbol`
- **Market Cap & Liquidity**: `data.marketCap`, `data.liquidity`
- **Price & Change**: `data.price`, `data.change`, `data.change1H`, `data.change4H`
- **Holders and Trades Count**: `data.holders`, `data.tradeNum`, `data.transactionNum`
- **Chain Info**: `data.chainName`, `data.chainLogoUrl`, `data.nativeTokenSymbol`
- **Supply Info**: `data.circulatingSupply`, `data.top10HoldAmountPercentage`
- **Risk Assessment**: `data.riskLevel`, `data.riskControlLevel`, `data.snipersClear` and `data.snipersTotal` (display in overview panel)
- **Token Tags**: `data.tagList[][]` (e.g., "communityRecognized")
- **Third-party Links**: `data.tokenThirdPartInfo` (BubbleMaps, OKX Holder maps links)
- **Price Range**: `data.maxPrice`, `data.minPrice` (show historical price context in price chart)
- **Swap & Trading Support**: `data.supportSwap`, `data.supportTrader` (display trading availability badges)
- **Dev & Bundle Risk**: `data.devHoldingRatio`, `data.bundleHoldingRatio`, `data.suspiciousHoldingRatio` (include in risk assessment section)
- **Early Buyer Stats**: `data.earlyBuyerStatisticsInfo` (highlight potential insider holdings in risk overview)
- **Integration Status**: `data.isSubscribe`, `data.isSupportHolder` (determine feature availability and data reliability)

### Data Not Used

| Field | Type | Notes |
|-------|------|-------|
| `data.isCollected` | string | Indicates if token is in user's collection |
| `data.isNotSupportTxNativeToken` | string | Support status for native token transactions |
| `data.isSupportBlinksShareUrl` | string | Support for Blinks share URL feature |
| `data.isSupportHolderExpandData` | string | Support for expanded holder data retrieval |
| `data.isSupportMarketCapKline` | string | Support for market cap K-line charts |
| `data.isTxPrice` | string | Transaction price data availability |
| `data.moduleType` | string | Internal module type classification |
| `data.supportLimitOrder` | string | Support for limit order trading |
| `data.supportMemeMode` | string | Support for meme token mode |
| `data.supportSingleChainSwap` | string | Support for single-chain swap operations |
| `data.tokenFee` | string | Token transaction fee information |
| `data.wrapperTokenContractAddress` | string | Wrapped version of token contract address |
| `data.dappList[]` | array | Associated DApps (currently empty) |
| `data.t[]` | array | Additional token attributes metadata |

## API for P2P Wallet Relations
- This is a POST endpoint, the cURL request is as follows:
```bash
curl -X POST 'https://web3.okx.com/priapi/v1/wallet/tx/order/list' \
  -H 'content-type: application/json' \
  --data-raw '{"addressList":["0x3eaa52e32268ccd2322418fdb1dde03fbb5d66c4"],"chainId":1,"startTime":1748296800000,"endTime":1764284399000,"limit":20,"lastRowId":"","hideValuelessNft":true}'
```
- Tags:
    - `addressList`: Array of wallet addresses to query - I think we can use more than one address at a time (TEST IT!)
    - `chainId`: Blockchain ID - `1` for Ethereum, `56` for BSC, `501` for Solana, and `8453` for Base.
    - `startTime`: Start timestamp in milliseconds.
    - `endTime`: End timestamp in milliseconds.
    - `limit`: Maximum number of results to return (max is `100`).
    - `lastRowId`: Pagination parameter for fetching subsequent results.
    - `hideValuelessNft`: Boolean to hide valueless NFTs.
    - Can we add more tags based on the response? (e.g., filter transfers by `tokenAddress`?)
- Response fields: 
```json
{
  "code" : 0,
  "msg" : "",
  "error_code" : "0",
  "error_message" : "",
  "detailMsg" : "",
  "data" : {
    "content" : [ {
      "txhash" : "0x913cbd857ffb1429d9002cfe17d16b7b4273933e54bcc9e024c89e8cf3643442",
      "address" : "0x3eaa52e32268ccd2322418fdb1dde03fbb5d66c4",
      "from" : "0x3eaa52e32268ccd2322418fdb1dde03fbb5d66c4",
      "to" : "0x9008d19f58aabd9ed0d60971565aa8510560ab41",
      "txType" : 2,
      "coinAmount" : "2000",
      "coinSymbol" : "USDS",
      "txTime" : 1764064775000,
      "txStatus" : 4,
      "rowId" : "1763453123",
      "direction" : 2,
      "network" : "Ethereum",
      "assetChange" : [ {
        "brc20Coin" : false,
        "brc20sCoin" : false,
        "direction" : 2,
        "coinAmount" : "2000",
        "coinSymbol" : "USDS",
        "coinImgUrl" : "https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png",
        "chainId" : 1,
        "tokenAddress" : "0xdc035d45d973e3ec169d2276ddab16f1e407384f"
      } ],
      "chainId" : 1,
      "chainSymbol" : "ETH",
      "isShowPending" : false,
      "isShowSpeedUp" : false,
      "isShowCancel" : false,
      "isShowSpeedupCancel" : false,
      "serviceCharge" : "0",
      "orderType" : 1,
      "showCancel" : false,
      "showSpeedupCancel" : false,
      "showSpeedUp" : false,
      "showPending" : false
    }, {
      "txhash" : "0x913cbd857ffb1429d9002cfe17d16b7b4273933e54bcc9e024c89e8cf3643442",
      "address" : "0x3eaa52e32268ccd2322418fdb1dde03fbb5d66c4",
      "from" : "0x9008d19f58aabd9ed0d60971565aa8510560ab41",
      "to" : "0x3eaa52e32268ccd2322418fdb1dde03fbb5d66c4",
      "txType" : 1,
      "coinAmount" : "3690.53233658",
      "coinSymbol" : "SPX",
      "txTime" : 1764064775000,
      "txStatus" : 4,
      "rowId" : "1763453123",
      "direction" : 1,
      "network" : "Ethereum",
      "assetChange" : [ {
        "brc20Coin" : false,
        "brc20sCoin" : false,
        "direction" : 1,
        "coinAmount" : "3690.53233658",
        "coinSymbol" : "SPX",
        "coinImgUrl" : "https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png",
        "chainId" : 1,
        "tokenAddress" : "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c"
      } ],
      "chainId" : 1,
      "chainSymbol" : "ETH",
      "isShowPending" : false,
      "isShowSpeedUp" : false,
      "isShowCancel" : false,
      "isShowSpeedupCancel" : false,
      "serviceCharge" : "0",
      "orderType" : 1,
      "showCancel" : false,
      "showSpeedupCancel" : false,
      "showSpeedUp" : false,
      "showPending" : false
    },
    { ... } // more transaction objects
    ],
    "hasViewMore" : true,
    "explorerUrl" : {
      "19200" : "https://evm.confluxscan.io/address/",
      "25600" : "/explorer/bitlayer/address/",
      "32000" : "https://bnb.xterscan.io/address/",
      "1" : "/explorer/bitcoin/address/",
      "2" : "/explorer/litecoin/address/",
      "3" : "/explorer/ethereum/address/",
      ... // more chainId to explorer URL mappings
    }
  }
}
```    
- Here is the response field map with all possible non-repeating fields:
| Field | Type | Description |
|-------|------|-------------|
| `code` | number | Response code (0 = success) |
| `msg` | string | Response message |
| `error_code` | string | Error code if applicable |
| `error_message` | string | Error message details |
| `detailMsg` | string | Additional detail message |
| **`data`** | **object** | **Main response payload** |
| `data.content[]` | array | Array of transaction objects |
| `data.content[].txhash` | string | Transaction hash |
| `data.content[].address` | string | Wallet address involved in the transaction |
| `data.content[].from` | string | Sender address |
| `data.content[].to` | string | Recipient address |
| `data.content[].txType` | number | Transaction type (1=receive, 2=send) |
| `data.content[].coinAmount` | string | Amount of coins transferred |
| `data.content[].coinSymbol` | string | Symbol of the coin transferred |
| `data.content[].txTime` | number | Transaction timestamp in milliseconds |
| `data.content[].txStatus` | number | Transaction status code |
| `data.content[].rowId` | string | Row ID for pagination |
| `data.content[].direction` | number | Direction of transaction (1=receive, 2=send) |
| `data.content[].network` | string | Blockchain network name |
| `data.content[].assetChange[]` | array | Array of asset change objects |
| `data.content[].assetChange[].brc20Coin` | boolean | Is BRC20 coin |
| `data.content[].assetChange[].brc20sCoin` | boolean | | Is BRC20s coin |
| `data.content[].assetChange[].direction` | number | Direction of asset change (1=receive, 2=send) |
| `data.content[].assetChange[].coinAmount` | string | Amount of coins changed |
| `data.content[].assetChange[].coinSymbol` | string | Symbol of the coin changed |
| `data.content[].assetChange[].coinImgUrl` | string | Coin image URL |
| `data.content[].assetChange[].chainId` | number | Blockchain ID |
| `data.content[].assetChange[].tokenAddress` | string | Token contract address |
| `data.content[].chainId` | number | | Blockchain ID |
| `data.content[].chainSymbol` | string | Blockchain symbol |
| `data.content[].isShowPending` | boolean | Show pending status |
| `data.content[].isShowSpeedUp` | boolean | Show speed up option |
| `data.content[].isShowCancel` | boolean | Show cancel option |
| `data.content[].isShowSpeedupCancel` | boolean | Show speedup cancel option |
| `data.content[].serviceCharge` | string | Service charge amount |
| `data.content[].orderType` | number | Order type |
| `data.content[].showCancel` | boolean | Show cancel option |
| `data.content[].showSpeedupCancel` | boolean | Show speedup cancel option |
| `data.content[].showSpeedUp` | boolean | Show speed up option |
| `data.content[].showPending` | boolean | Show pending status |
| `data.hasViewMore` | boolean | Indicates if more data is available |
| `data.explorerUrl` | object | Mapping of chain IDs to explorer URLs |

### Data usage from fields
- **Wallet Relationships**: Use `data.content[]` to identify transactions between wallets.
- **Transaction Direction**: Use `data.content[].direction` to determine if the wallet is sending or receiving funds.
- **Token Filtering**: Filter transactions by `data.content[].assetChange[].tokenAddress` to focus on specific token transfers.
- **Transaction Amounts**: Use `data.content[].assetChange[].coinAmount` for displaying transfer amounts.
- **Timestamps**: Use `data.content[].txTime` for transaction timing and activity tracking.
- **Explorer Links**: Use `data.explorerUrl` to generate links to view transactions on blockchain explorers.

### How to map P2P data to wallet links
- We need to see if we can get multiple addresses in one request using the array tag to reduce API calls.
- We need to see if we can filter for specific token transfers by adding a `tokenAddress` filter to the request body.
- For each wallet address in our main token holder data (`data.clusterList[].children[].address`), we make a request to this P2P API to get recent transactions.
- We then filter the returned transactions to only include those where the `assetChange[].tokenAddress` matches our target token address.
- With max limit of `100` per request, we need to paginate in the time range. The time range is determined by the token's creation date (if available - else we need to fetch via API) and today.
- For each fetched transaction, we map the links between the source and target addresses in our main data set. And append the transaction data (amount, value, token, timestamp, etc.) to the link representation.
- This will enrich our wallet relationship graph with actual transaction data specific to the token being analyzed.

## Next Steps
- Design mobile first UI/UX wireframes for bubble map, wallet list with sorting by top-holder/cluster/pnl/tags, and PnL data visualization, a total sum overview panel for metrics.
- Implement main API integration to fetch and parse data from OKX endpoint. Create an initial state that displays a search bar to input token address, design a pre-validation process to determine if the token address is which chain (Ethereum, BSC, Solana, Base) and set the correct chainId and chainIndex parameters before making the API call.
- Plan and integrate the API for token info (image, market cap, supply, etc.) - research and integrate a token metadata API.
- Plan and integrate the API for P2P wallet relation to enrich wallet relationships beyond basic links.
- Build data models to represent wallets, clusters, links, and overall token metrics. Ensure you use the schema defined above for consistency.
- Create reusable components for wallet cards, cluster summaries, and link representations - make sure these are optimized for mobile viewing and are reuseable in multiple contexts (map popup, wallet list, cluster detail).
- Implement state management to handle fetched data, user interactions (e.g., selecting a wallet or cluster), and UI updates. Store data in local storage cache for performance, if a user searches the same token again within a session, load from cache instead of re-fetching. 
- Create a recently viewed tokens list to allow users to quickly access previously searched tokens without re-entering the address.
- Token data fetch will provide more token info, lke token images, market cap, supply, etc. Integrate a token info API to enrich the display with additional token metadata.
- Develop interactive bubble map using D3.js or similar library optimized for mobile, the graph needs to be zoomable and pannable with touch gestures. On node tap, show wallet details in a popup - the same popup is used in the wallet list.
- Create wallet toplist with sorting and filtering options.
- Per wallet and per cluster PnL data sectioning to show profit/loss over time - display in wallet popup or cluster detail view.
- Design for simplistic and condensed data display, shorten wallet addresses, abbreviate large numbers (values, percentages, prices, etc.), use icons for tags, and color-code key metrics for quick insights on mobile screens.

## TODO:
- Design icons for wallet tags (whales, topHolder, contract, exchange, kol, etc.) - create a consistent icon set for visual representation.
- Implement error handling and loading states for API calls.
- Ensure API calls are user-side to avoid backend complexity and keep the app lightweight, consider CORS issues and use a proxy if necessary (if necessary first try proxy urls, then an edge function proxy) - We want to avoid building a backend for this project.
- Prepare for deployment on a static site hosting platform (e.g., Vercel, Netlify) with proper build configurations.