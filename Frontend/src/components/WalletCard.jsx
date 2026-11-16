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
    isCompleted = false,
    endDate,
}) {
    
    let progress = 0

    if (target > 0) {
    progress = Math.min((balance / target) * 100, 100)
    }
    const remaining = Math.max(target - balance,0)
    let status = 'กำลังออม'
    if (balance >= target) {
        status = 'ถึงเป้าหมายแล้ว'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDay = date ? new Date(`${date}T00:00:00`) : null
    const daysRemaining =
        targetDay && !Number.isNaN(targetDay.getTime())
            ? Math.ceil((targetDay.getTime() - today.getTime()) / 86400000)
            : null
    const [amount, setAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')

  return (
        <div className="wallet-card">
        <h2 className="wallet-name">{name}</h2>
        {!isCompleted && (
        <div className="wallet-action">
            <button
            className="edit-button"
            onClick={onEdit}
            >
                แก้ไข
            </button>

            <button
                className="delete-button"
                onClick={onDelete}
            >
                ลบ
            </button>
        </div>
        )}
        
        <p className="wallet-balance">
            {balance.toLocaleString()} บาท
        </p>

        <p className="wallet-info">
            เป้าหมาย: {target.toLocaleString()} บาท
        </p>

        <p className="wallet-info">
            วันที่เป้าหมาย: {date || '-'}
        </p>

        {isCompleted && (
            <p className="wallet-info">
                วันที่สำเร็จ: {endDate || '-'}
            </p>
        )}

        <p className="wallet-progress-text">
            ความคืบหน้า: {progress.toFixed(2)}%
        </p>

        <p className="wallet-info">
            คงเหลือ: {remaining.toLocaleString()} บาท
        </p>

        <p className="wallet-info">
            วันที่เหลือ: {isCompleted || daysRemaining === null ? '-' : `${daysRemaining} วัน`}
        </p>

        <p className="wallet-status">
            สถานะ: {isCompleted ? 'ถึงเป้าหมายแล้ว' : status}
        </p>

        <div className="progress-bar">
        <div
            className="progress-fill"
            style={{
            width: `${progress}%`
            }}
        />
        </div>

        {!isCompleted && (
            <>
        <input
            className="money-input"
            type="number"
            placeholder="จำนวนเงินที่ฝาก"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
        />

        <button
            className="deposit-button"
            onClick={() => {
            const depositAmount = Number(amount)

            if (depositAmount <= 0) {
                return
            }

            onDeposit(depositAmount)
            setAmount('')
        }}>
            ฝากเงิน
        </button>

        <input
            className="money-input"
            type="number"
            placeholder="จำนวนเงินที่ถอน"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
        />

        <button
            className="withdraw-button"
            onClick={() => {
            const amountToWithdraw = Number(withdrawAmount)

            if (amountToWithdraw <= 0) {
                return
            }

            onWithdraw(amountToWithdraw)
            setWithdrawAmount('')
        }}>
            ถอนเงิน
        </button>
            </>
        )}

    </div>
  )
}

export default WalletCard
