import { JsonRpcProvider } from '@ethersproject/providers'
import {
  SOR,
  SwapInfo,
  DisabledOptions,
  SubGraphPoolsBase,
  SubgraphPoolBase,
  SwapTypes,
  fetchSubgraphPools
} from '@balancer-labs/sor2'
import { AddressZero } from '@ethersproject/constants'
import BigNumber from 'bignumber.js'
import { Token } from '../types'

const ETHER = {
  id: 'ether',
  name: 'Ether',
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  symbol: 'ETH',
  decimals: 18,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
};

const CHAIN_ID = 1
const GAS_PRICE = '100000000000'
const MAX_POOLS = 4
const MIN_PRICE_IMPACT = 0.0001

const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI Address
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC Address

const providerUrl = 'https://eth-mainnet.alchemyapi.io/v2/JV91jHxxzPtDOyGPDe8BiHu376MK712n'
const poolsSourceV2 = 'https://storageapi.fleek.co/johngrantuk-team-bucket/poolsV2.json'
const subgraphUrl = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2'

const provider = new JsonRpcProvider(providerUrl)
const gasPrice = new BigNumber(GAS_PRICE)
const disabledOptions = {
  isOverRide: false,
  disabledTokens: []
}

const sor = new SOR(
  provider,
  gasPrice,
  MAX_POOLS,
  CHAIN_ID,
  poolsSourceV2,
  disabledOptions
)

const inputToken: Token = {
  address: DAI,
  decimals: 18,
  symbol: 'DAI',
  name: 'DAI'
}

const outputToken: Token = {
  address: USDC,
  decimals: 6,
  symbol: 'USDC',
  name: 'USDC'
}

const amountIn = new BigNumber('100')

async function main() {
  const { value: amountOut, paths } = await calcSwapTokenOutputAmount(sor, inputToken, amountIn, outputToken)
  console.log(amountOut.toString())
  console.log(paths)
}

main()



/**
 * FUNCTIONS
 */

// outputAmount is big unit
async function calcSwapTokenInputAmount(sor: SOR, outputToken: Token, outputAmount: BigNumber, inputToken: Token) {
  await fetchPools(sor)
  await setCostOutputToken(sor, inputToken.address, inputToken.decimals)
  const swapInfo = await getSwaps(sor, inputToken.address, outputToken.address, SwapTypes.SwapExactOut, outputAmount)
  const inputAmount = getTradeAmount(swapInfo)
  const paths = getSwapPaths(swapInfo)
  return {
    value: scale(inputAmount, -inputToken.decimals),
    paths,
  }
}

// inputAmount is big unit
async function calcSwapTokenOutputAmount(sor: SOR, inputToken: Token, inputAmount: BigNumber, outputToken: Token) {
  await fetchPools(sor)
  await setCostOutputToken(sor, outputToken.address, outputToken.decimals)
  const swapInfo = await getSwaps(sor, inputToken.address, outputToken.address, SwapTypes.SwapExactIn, inputAmount)
  const outputAmount = getTradeAmount(swapInfo)
  const paths = getSwapPaths(swapInfo)
  return {
    value: scale(outputAmount, -outputToken.decimals),
    paths
  }
}


// set CostOutputToken
async function setCostOutputToken(sor: SOR, tokenAddr: string, tokenDecimals: number) {
  const cost = await sor.setCostOutputToken(tokenAddr, tokenDecimals)
  return cost
}

// fetch pools
async function fetchPools(sor: SOR) {
  const subgraphPools = await fetchSubgraphPools(subgraphUrl)
  const result = await sor.fetchPools(true, subgraphPools)
  const selectedPools = sor.onChainBalanceCache.pools
  return result
}

async function getSwaps(
  sor: SOR,
  tokenIn: string,
  tokenOut: string,
  swapType: SwapTypes,
  amountNormalised: BigNumber,
): Promise<SwapInfo> {
  const tokenInAdjusted = tokenIn === ETHER.address ? AddressZero : tokenIn
  const TokenOutAdjusted = tokenOut === ETHER.address ? AddressZero : tokenOut

  const swapInfo: SwapInfo = await sor.getSwaps(
    tokenInAdjusted.toLowerCase(),
    TokenOutAdjusted.toLowerCase(),
    swapType,
    amountNormalised,
  )

  return swapInfo
}

function getTradeAmount(swapInfo: SwapInfo) {
  return swapInfo.returnAmount
}

function getSwapPaths(swapInfo: SwapInfo) {
  return swapInfo.swaps
}

function getSelectedPools(sor: SOR) {
  return sor.onChainBalanceCache.pools
}

function scale(input: BigNumber, decimalPlaces: number): BigNumber {
  const scalePow = new BigNumber(decimalPlaces.toString());
  const scaleMul = new BigNumber(10).pow(scalePow);
  return input.times(scaleMul);
}

