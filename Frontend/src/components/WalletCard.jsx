import { useState } from 'react'

function WalletCard({ name, target, date, balance, onDeposit, onWithdraw, onDelete, onEdit }) {
    
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
    const targetDay = new Date(date)
    const timeDiff = targetDay.getTime() - today.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    const [amount, setAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')

  return (
        <div className="wallet-card">
        <h2 className="wallet-name">{name}</h2>
        <div className ="wallet-action">
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
        
        <p className="wallet-balance">
            ฿ {balance}
        </p>

        <p className="wallet-info">
            เป้าหมาย: {target} ฿
        </p>

        <p className="wallet-info">
            วันที่เป้าหมาย: {date}
        </p>

        <p className="wallet-progress-text">
            ความคืบหน้า: {progress.toFixed(2)}%
        </p>

        <p className="wallet-info">
            คงเหลือ: {remaining} ฿
        </p>

        <p className="wallet-info">
            วันที่เหลือ: {daysRemaining} วัน
        </p>

        <p className="wallet-status">
            สถานะ: {status}
        </p>

        <div className="progress-bar">
        <div
            className="progress-fill"
            style={{
            width: `${progress}%`
            }}
        />
        </div>

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


    </div>
  )
}

export default WalletCard