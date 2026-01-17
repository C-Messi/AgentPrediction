import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { CONTRACTS } from '../config/contracts'
import { PREDICTION_MARKET_ABI } from '../contracts/PredictionMarketABI'
import { parseUnits } from 'viem'
import { useAccount } from 'wagmi'

// Types
export type MarketStatus = 0 | 1 | 2 // 0=Active, 1=Resolved, 2=Cancelled

export interface MarketBasics {
  creator: `0x${string}`
  question: string
  endTime: bigint
  status: MarketStatus
  outcome: boolean
}

export interface MarketPools {
  yesPredReserve: bigint
  yesShareReserve: bigint
  noPredReserve: bigint
  noShareReserve: bigint
  totalYesShares: bigint
  totalNoShares: bigint
  winningPredPool: bigint
  totalWinningShares: bigint
}

export interface Position {
  yesShares: bigint
  noShares: bigint
  claimed: boolean
  refunded: boolean
}

// Hooks
export function useMarketCount() {
  const { data: count, refetch } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCount',
  })

  return {
    count: count ? Number(count) : 0,
    refetch,
  }
}

export function useMarketBasics(marketId: number | bigint) {
  const { data, refetch, isLoading, error } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarketBasics',
    args: [BigInt(marketId)],
  })

  return {
    basics: data
      ? {
          creator: data[0],
          question: data[1],
          endTime: data[2],
          status: data[3] as MarketStatus,
          outcome: data[4],
        }
      : null,
    refetch,
    isLoading,
    error,
  }
}

export function useMarketPools(marketId: number | bigint) {
  const { data, refetch, isLoading, error } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarketPools',
    args: [BigInt(marketId)],
  })

  return {
    pools: data
      ? {
          yesPredReserve: data[0],
          yesShareReserve: data[1],
          noPredReserve: data[2],
          noShareReserve: data[3],
          totalYesShares: data[4],
          totalNoShares: data[5],
          winningPredPool: data[6],
          totalWinningShares: data[7],
        }
      : null,
    refetch,
    isLoading,
    error,
  }
}

export function useUserPosition(marketId: number | bigint) {
  const { address } = useAccount()
  
  const { data, refetch, isLoading, error } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'positions',
    args: address && marketId !== undefined ? [BigInt(marketId), address] : undefined,
    query: {
      enabled: !!address && marketId !== undefined,
    },
  })

  return {
    position: data
      ? {
          yesShares: data[0],
          noShares: data[1],
          claimed: data[2],
          refunded: data[3],
        }
      : null,
    refetch,
    isLoading,
    error,
  }
}

// Trading hooks
export function useBuyYes() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const buyYes = async (marketId: number | bigint, predIn: string, minSharesOut: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyYes',
        args: [BigInt(marketId), parseUnits(predIn, 18), parseUnits(minSharesOut, 18)],
      })
    } catch (err) {
      console.error('BuyYes error:', err)
    }
  }

  return {
    buyYes,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useBuyNo() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const buyNo = async (marketId: number | bigint, predIn: string, minSharesOut: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyNo',
        args: [BigInt(marketId), parseUnits(predIn, 18), parseUnits(minSharesOut, 18)],
      })
    } catch (err) {
      console.error('BuyNo error:', err)
    }
  }

  return {
    buyNo,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useSellYes() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const sellYes = async (marketId: number | bigint, sharesIn: string, minPredOut: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sellYes',
        args: [BigInt(marketId), parseUnits(sharesIn, 18), parseUnits(minPredOut, 18)],
      })
    } catch (err) {
      console.error('SellYes error:', err)
    }
  }

  return {
    sellYes,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useSellNo() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const sellNo = async (marketId: number | bigint, sharesIn: string, minPredOut: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sellNo',
        args: [BigInt(marketId), parseUnits(sharesIn, 18), parseUnits(minPredOut, 18)],
      })
    } catch (err) {
      console.error('SellNo error:', err)
    }
  }

  return {
    sellNo,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useClaimWinnings() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const claimWinnings = async (marketId: number | bigint) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimWinnings',
        args: [BigInt(marketId)],
      })
    } catch (err) {
      console.error('ClaimWinnings error:', err)
    }
  }

  return {
    claimWinnings,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useRefund() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const refund = async (marketId: number | bigint) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'refund',
        args: [BigInt(marketId)],
      })
    } catch (err) {
      console.error('Refund error:', err)
    }
  }

  return {
    refund,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useSendDanmaku() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const sendDanmaku = async (marketId: number | bigint, content: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sendDanmaku',
        args: [BigInt(marketId), content],
      })
    } catch (err) {
      console.error('SendDanmaku error:', err)
    }
  }

  return {
    sendDanmaku,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useSendComment() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const sendComment = async (marketId: number | bigint, content: string) => {
    try {
      writeContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sendComment',
        args: [BigInt(marketId), content],
      })
    } catch (err) {
      console.error('SendComment error:', err)
    }
  }

  return {
    sendComment,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

// Event watchers
export function useWatchMarketCreated(onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'MarketCreated',
    onLogs: (logs) => {
      logs.forEach((log) => onEvent(log))
    },
  })
}

export function useWatchSharesBought(onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'SharesBought',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (log.args) {
          onEvent({
            marketId: Number(log.args.marketId),
            user: log.args.user as `0x${string}`,
            isYes: log.args.isYes as boolean,
            predIn: log.args.predIn as bigint,
            sharesOut: log.args.sharesOut as bigint,
            log: log,
          })
        }
      })
    },
  })
}

export function useWatchSharesSold(onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'SharesSold',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (log.args) {
          onEvent({
            marketId: Number(log.args.marketId),
            user: log.args.user as `0x${string}`,
            isYes: log.args.isYes as boolean,
            sharesIn: log.args.sharesIn as bigint,
            predOut: log.args.predOut as bigint,
            log: log,
          })
        }
      })
    },
  })
}

export function useWatchDanmaku(marketId: number | bigint, onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'Danmaku',
    onLogs: (logs) => {
      logs.forEach((log) => {
        // 根据 API: Danmaku(uint256 marketId, address user, string content)
        if (log.args) {
          const eventMarketId = Number(log.args.marketId)
          const eventUserId = log.args.user as `0x${string}`
          const eventContent = log.args.content as string
          
          // 只处理当前市场的弹幕
          if (eventMarketId === Number(marketId)) {
            onEvent({
              marketId: eventMarketId,
              user: eventUserId,
              content: eventContent,
              log: log
            })
          }
        }
      })
    },
  })
}

export function useWatchComment(marketId: number | bigint, onEvent: (data: any) => void) {
  useWatchContractEvent({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    eventName: 'Comment',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (log.args && log.args.marketId && Number(log.args.marketId) === Number(marketId)) {
          onEvent(log)
        }
      })
    },
  })
}
