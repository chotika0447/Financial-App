
import { useEffect, useState } from 'react'
import WalletCard from '../components/WalletCard'
import './Wallet.css'
import Navbar from '../components/Navbar'

function Wallet() {
  const [wallets, setWallets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [editingWalletId, setEditingWalletId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const accessToken = () => sessionStorage.getItem('accessToken')

  // แปลงชื่อ field จาก Django ให้ตรงกับ WalletCard เดิม
  const normalizeWallet = (item) => ({
    id: item.saving_id,
    name: item.saving_name,
    target: Number(item.target || 0),
    date: item.target_date || '',
    balance: Number(item.balance || 0),
    status: item.status || 'active',
  })

  // เรียก API และจัดการ error
  const apiRequest = async (url, options = {}) => {
    const token = accessToken()

    if (!token) {
      throw new Error('ไม่พบ Token กรุณาเข้าสู่ระบบใหม่')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (response.status === 204) {
      return null
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session หมดอายุหรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่')
      }

      throw new Error(
        data.detail ||
        data.error ||
        JSON.stringify(data) ||
        `เกิดข้อผิดพลาด (${response.status})`
      )
    }

    return data
  }

  // โหลดรายการจากฐานข้อมูลเมื่อเปิดหน้า
  const fetchWallets = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/savings/')
      setWallets(data.map(normalizeWallet))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallets()
  }, [])

  const fromTitle =
    editingWalletId !== null
      ? 'แก้ไขกระเป๋าเงินออม'
      : 'เพิ่มกระเป๋าเงินออม'

  // เพิ่มหรือแก้ไขกระเป๋าในฐานข้อมูล
  const addWallet = async () => {
    if (!name.trim()) {
      alert('กรุณากรอกชื่อกระเป๋า')
      return
    }

    if (target.trim() === '' || !Number.isFinite(Number(target)) || Number(target) < 0) {
      alert('กรุณากรอกเป้าหมายเงินออมตั้งแต่ 0 บาทขึ้นไป')
      return
    }

    if (targetDate && targetDate < today) {
      alert('วันที่เป้าหมายต้องไม่เป็นวันในอดีต')
      return
    }

    setSaving(true)
    setError('')

    const existingWallet = wallets.find(
      (wallet) => wallet.id === editingWalletId
    )

    const payload = {
      saving_name: name.trim(),
      target: Number(target),
      target_date: targetDate || null,
      status: existingWallet?.status || 'active',
      start_date: null,
      end_date: null,
    }

    try {
      if (editingWalletId !== null) {
        // Backend ปัจจุบันรองรับ PUT
        await apiRequest(`/savings/${editingWalletId}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiRequest('/savings/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      await fetchWallets()

      setName('')
      setTarget('')
      setTargetDate('')
      setEditingWalletId(null)
      setShowForm(false)
    } catch (err) {
      setError(err.message)
      alert(`บันทึกไม่สำเร็จ: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // เตรียมข้อมูลสำหรับแก้ไข
  const editWallet = (wallet) => {
    setEditingWalletId(wallet.id)
    setName(wallet.name)
    setTarget(String(wallet.target))
    setTargetDate(wallet.date)
    setShowForm(true)
  }

  // ลบกระเป๋าจากฐานข้อมูล
  const deleteWallet = async (id) => {
    const confirmDelete = window.confirm(
      'คุณแน่ใจหรือไม่ว่าต้องการลบกระเป๋าเงินนี้?'
    )

    if (!confirmDelete) return

    setError('')

    try {
      await apiRequest(`/savings/${id}/`, {
        method: 'DELETE',
      })

      await fetchWallets()
    } catch (err) {
      setError(err.message)
      alert(`ลบไม่สำเร็จ: ${err.message}`)
    }
  }

  // ฝาก–ถอนยังไม่เปิดใช้จนกว่า Backend จะมี API บันทึก balance
  const deposit = () => {
    alert('ระบบฝากเงินยังต้องเชื่อม API บันทึกยอดเงินใน Backend ก่อน')
  }

  const withdraw = () => {
    alert('ระบบถอนเงินยังต้องเชื่อม API บันทึกยอดเงินใน Backend ก่อน')
  }

  const totalSaving = wallets.reduce(
    (total, wallet) => total + wallet.balance,
    0
  )

  const totalTarget = wallets.reduce(
    (total, wallet) => total + wallet.target,
    0
  )

  return (
    <div className="wallet-page">
      <div className="wallet-header">
        <h1 className="wallet-title">กระเป๋าเงินออม</h1>
      </div>

      <div>
        <h2 className="wallet-total">
          <p>ยอดเงินออมทั้งหมด {totalSaving.toLocaleString()} บาท</p>
          <p>เป้าหมายเงินออมทั้งหมด {totalTarget.toLocaleString()} บาท</p>
        </h2>
      </div>

      {error && (
        <p role="alert" className="wallet-error">
          {error}
        </p>
      )}

      <button
        className="wallet-add-button"
        onClick={() => {
          setEditingWalletId(null)
          setName('')
          setTarget('')
          setTargetDate('')
          setShowForm(true)
        }}
      >
        + เพิ่มรายการ
      </button>

      {showForm && (
        <div className="modal-overlay">
          <div className="wallet-form-card">
            <h2>{fromTitle}</h2>

            <h1>ชื่อกระเป๋า</h1>
            <input
              type="text"
              placeholder="ชื่อกระเป๋า"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />

            <h1>เป้าหมายเงินออม (บาท)</h1>
            <input
              type="number"
              placeholder="0.00"
              value={target}
              min="0"
              onChange={(e) => setTarget(e.target.value)}
            />

            <h1>วันที่สิ้นสุดเป้าหมาย</h1>
            <input
              type="date"
              value={targetDate}
              min={today}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            <div className="form-buttons">
              <button
                className="cancel-button"
                disabled={saving}
                onClick={() => {
                  setShowForm(false)
                  setEditingWalletId(null)
                }}
              >
                ยกเลิก
              </button>

              <button
                className="save-button"
                disabled={saving}
                onClick={addWallet}
              >
                {saving ? 'กำลังบันทึก...' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="wallet-list">
        {loading ? (
          <p>กำลังโหลดกระเป๋าเงิน...</p>
        ) : wallets.length === 0 ? (
          <p>ยังไม่มีกระเป๋าเงินออม</p>
        ) : (
          wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              name={wallet.name}
              target={wallet.target}
              date={wallet.date}
              balance={wallet.balance}
              onDeposit={(amount) => deposit(wallet.id, amount)}
              onWithdraw={(amount) => withdraw(wallet.id, amount)}
              onEdit={() => editWallet(wallet)}
              onDelete={() => deleteWallet(wallet.id)}
            />
          ))
        )}
      </div>

      <Navbar />
    </div>
  )
}

export default Wallet
