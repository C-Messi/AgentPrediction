import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS } from '../config/contracts'
import { PRED_TOKEN_ABI } from '../contracts/PredTokenABI'
import { formatUnits, parseUnits } from 'viem'
import { useAccount } from 'wagmi'

export function usePredTokenBalance() {
  const { address } = useAccount()
  
  const { data: balance, refetch } = useReadContract({
    address: CONTRACTS.PRED_TOKEN,
    abi: PRED_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  return {
    balance: balance ? formatUnits(balance, 18) : '0',
    balanceRaw: balance,
    refetch,
  }
}

export function usePredTokenAllowance(spender: `0x${string}`) {
  const { address } = useAccount()
  
  const { data: allowance, refetch } = useReadContract({
    address: CONTRACTS.PRED_TOKEN,
    abi: PRED_TOKEN_ABI,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: {
      enabled: !!address && !!spender,
    },
  })

  return {
    allowance: allowance ? formatUnits(allowance, 18) : '0',
    allowanceRaw: allowance,
    refetch,
  }
}

export function useApprovePredToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (spender: `0x${string}`, amount: string) => {
    try {
      writeContract({
        address: CONTRACTS.PRED_TOKEN,
        abi: PRED_TOKEN_ABI,
        functionName: 'approve',
        args: [spender, parseUnits(amount, 18)],
      })
    } catch (err) {
      console.error('Approve error:', err)
    }
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}
