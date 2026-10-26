
import { useState } from 'react'

function WalletCard({
  name,
  target,
  date,
  balance,
  onDeposit,
  onWithdraw,
  onDelete,
  onEdit,
}) {
  const [amount, setAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const progress =
    target > 0 ? Math.min((balance / target) * 100, 100) : 0

  const remaining = Math.max(target - balance, 0)
  const status = balance >= target ? 'ถึงเป้าหมายแล้ว' : 'กำลังออม'

  const targetDay = date ? new Date(`${date}T00:00:00`) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysRemaining =
    targetDay && !Number.isNaN(targetDay.getTime())
      ? Math.ceil((targetDay.getTime() - today.getTime()) / 86400000)
      : null

  const handleDeposit = async () => {
    const depositAmount = Number(amount)

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      alert('กรุณากรอกจำนวนเงินฝากที่มากกว่า 0 บาท')
      return
    }

    setProcessing(true)
    try {
      const success = await onDeposit(depositAmount)
      if (success) setAmount('')
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    const amountToWithdraw = Number(withdrawAmount)

    if (!Number.isFinite(amountToWithdraw) || amountToWithdraw <= 0) {
      alert('กรุณากรอกจำนวนเงินถอนที่มากกว่า 0 บาท')
      return
    }

    setProcessing(true)
    try {
      const success = await onWithdraw(amountToWithdraw)
      if (success) setWithdrawAmount('')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="wallet-card">
      <h2 className="wallet-name">{name}</h2>

      <div className="wallet-action">
        <button
          type="button"
          className="edit-button"
          onClick={onEdit}
          disabled={processing}
        >
          แก้ไข
        </button>

        <button
          type="button"
          className="delete-button"
          onClick={onDelete}
          disabled={processing}
        >
          ลบ
        </button>
      </div>

      <p className="wallet-balance">
        {balance.toLocaleString()} บาท
      </p>

      <p className="wallet-info">
        เป้าหมาย: {target.toLocaleString()} บาท
      </p>

      <p className="wallet-info">
        วันที่เป้าหมาย: {date || '-'}
      </p>

      <p className="wallet-progress-text">
        ความคืบหน้า: {progress.toFixed(2)}%
      </p>

      <div
        className="progress-bar"
        role="progressbar"
        aria-label={`ความคืบหน้า ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="wallet-info">
        คงเหลือ: {remaining.toLocaleString()} บาท
      </p>

      <p className="wallet-info">
        วันที่เหลือ: {daysRemaining === null ? '-' : `${daysRemaining} วัน`}
      </p>

      <p className="wallet-status">สถานะ: {status}</p>

      <div className="money-action-row">
        <input
          className="money-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="จำนวนเงินฝาก"
          aria-label={`จำนวนเงินฝาก ${name}`}
          value={amount}
          disabled={processing}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleDeposit()
          }}
        />

        <button
          type="button"
          className="deposit-button"
          onClick={handleDeposit}
          disabled={processing}
        >
          ฝากเงิน
        </button>
      </div>

      <div className="money-action-row">
        <input
          className="money-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="จำนวนเงินถอน"
          aria-label={`จำนวนเงินถอน ${name}`}
          value={withdrawAmount}
          disabled={processing}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleWithdraw()
          }}
        />

        <button
          type="button"
          className="withdraw-button"
          onClick={handleWithdraw}
          disabled={processing}
        >
          ถอนเงิน
        </button>
      </div>
    </div>
  )
}

export default WalletCard
