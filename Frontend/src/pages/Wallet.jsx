import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WalletCard from '../components/WalletCard'
import './Wallet.css'
import Navbar from '../components/Navbar'
import CustomHeader from '../components/CustomHeader';
import {Calculator,Plus}from "lucide-react";

function Wallet() {
    const navigate = useNavigate()

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

    //แปลงชื่อ field จาก Django ให้ตรงกับ WalletCard เดิม
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
    const token = sessionStorage.getItem('accessToken')

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

    //โหลดรายการจากฐานข้อมูลเมื่อเปิดหน้า
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

    //ตรวจสอบชื่อกระเป๋าซ้ำและเพิ่มเลขเลย
    const getUniqueWalletName = (walletName) => {
    const baseName = walletName.trim()

    //ดึงชื่อกระเป๋าที่มีอยู่ โดยไม่รวมกระเป๋าที่กำลังแก้ไข
    const existingNames = wallets
        .filter((wallet) => wallet.id !== editingWalletId)
        .map((wallet) => wallet.name.trim().toLowerCase())

    //ถ้าชื่อไม่ซ้ำให้ใช้ชื่อเดิม
    if (!existingNames.includes(baseName.toLowerCase())) {
        return baseName
    }

    //ถ้าชื่อซ้ำเพิ่มเลขต่อท้าย
    let number = 1
    let newName = `${baseName} (${number})`

    while (existingNames.includes(newName.toLowerCase())) {
        number++
        newName = `${baseName} (${number})`
    }

    return newName
    }

    //เพิ่มหรือแก้ไขกระเป๋าในฐานข้อมูล
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

    //ตรวจชื่อซ้ำก่อนบันทึก
    const uniqueName = getUniqueWalletName(name)

    const payload = {
        saving_name: uniqueName,
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

    //เตรียมข้อมูลสำหรับแก้ไข
    const editWallet = (wallet) => {
        setEditingWalletId(wallet.id)
        setName(wallet.name)
        setTarget(String(wallet.target))
        setTargetDate(wallet.date)
        setShowForm(true)
    }

    //ลบกระเป๋าจากฐานข้อมูล
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
    }catch (err) {
        setError(err.message)
        alert(`ลบไม่สำเร็จ: ${err.message}`)
    }
    }

    //ฝากเงินและอัปเดต state จากข้อมูลที่ backend ส่งกลับ
    const deposit = async (id, amount) => {
        setError('')

    try {
        const updated = await apiRequest(`/savings/${id}/deposit/`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })

        const updatedWallet = normalizeWallet(updated)

        setWallets((current) =>
            current.map((wallet) =>
            wallet.id === updatedWallet.id ? updatedWallet : wallet
            )
        )

    return true
    }catch (err) {
        setError(err.message)
        alert(`ฝากเงินไม่สำเร็จ: ${err.message}`)
        return false
    }
    }

    //ถอนเงินและรับยอดล่าสุดจาก backend
    const withdraw = async (id, amount) => {
        setError('')

    try {
        const updated = await apiRequest(`/savings/${id}/withdraw/`, {
            method: 'POST',
            body: JSON.stringify({ amount }),
        })

        const updatedWallet = normalizeWallet(updated)

        setWallets((current) =>
            current.map((wallet) =>
            wallet.id === updatedWallet.id ? updatedWallet : wallet
            )
        )

    return true
    }catch (err) {
        setError(err.message)
        alert(`ถอนเงินไม่สำเร็จ: ${err.message}`)
        return false
    }
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
        {/* Header */}
        <CustomHeader title="กระเป๋าเงินออม" color="#e66f6f" />
        <main className="wallet-content">
            {/* Summary */}
            <section className="wallet-summary">
            <div className="wallet-summary-icon">
                🐷
            </div>

            <div className="wallet-summary-info">
                <p className="wallet-summary-caption">ยอดเงินออมทั้งหมด</p>

                <h2 className="wallet-summary-balance">
                {totalSaving.toLocaleString()} บาท
                </h2>

                <p className="wallet-summary-target">
                จากเป้าหมายทั้งหมด {totalTarget.toLocaleString()} บาท
                </p>

                <div className="wallet-summary-progress">
                <div
                    className="wallet-summary-progress-fill"
                    style={{
                    width: `${totalTarget > 0
                        ? Math.min((totalSaving / totalTarget) * 100, 100)
                        : 0
                        }%`,
                    }}
                />
                </div>

                <p className="wallet-summary-percent">
                {totalTarget > 0
                    ? Math.round((totalSaving / totalTarget) * 100)
                    : 0}
                % ของเป้าหมายทั้งหมด
                </p>
            </div>
            </section>

            {error && (
            <p role="alert" className="wallet-error">
                {error}
            </p>
            )}

            {/* ปุ่มลอยด้านขวา */}
            <div className="wallet-calculator-control">
            <span className="wallet-calculator-label">
                เครื่องมือคำนวณ
            </span>

            <button
                type="button"
                className="wallet-calculator-button"
                onClick={() => navigate('/calculator')}
                aria-label="เครื่องมือคำนวณ"
                title="เครื่องมือคำนวณ"
            >
                <Calculator size={27} strokeWidth={2.3} />
            </button>
            </div>

            <div className="wallet-add-control">
            <span className="wallet-add-label">เพิ่มรายการ</span>

            <button
                type="button"
                className="wallet-add-button"
                onClick={() => {
                setEditingWalletId(null)
                setName('')
                setTarget('')
                setTargetDate('')
                setShowForm(true)
                }}
                aria-label="เพิ่มรายการ"
                title="เพิ่มรายการ"
            >
                <Plus size={27} strokeWidth={2.5} />
            </button>
            </div>

            {/* Wallet Form */}
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

            {/* Wallet Cards */}
            <section className="wallet-section">
            <h2 className="wallet-section-title">กระเป๋าเงินออมของฉัน</h2>

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
            </section>
        </main>

        <Navbar />
        </div>
    )
}
export default Wallet
