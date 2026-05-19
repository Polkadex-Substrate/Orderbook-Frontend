'use client'
import { useAccount, useBalance, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'

export default function WalletInfo() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { sendTransaction } = useSendTransaction()

  if (!isConnected) return <p>Not connected</p>

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance?.formatted} {balance?.symbol}</p>
    </div>
  )
}