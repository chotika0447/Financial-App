import { useState } from 'react'
import WalletCard from '../components/WalletCard'
import './Wallet.css'

function Wallet() {

  const [wallets, setWallets] = useState([])

  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const [editingWalletId, setEditingWalletId] = useState(null)

  let fromTitle = ''
    if (editingWalletId !== null) {
      fromTitle = 'แก้ไขกระเป๋าเงินออม'
    }
    else{
      fromTitle = 'เพิ่มกระเป๋าเงินออม'
    }

  //เพิ่ม/แก้ไขกระเป๋า
  const addWallet = () => {

    //ถ้ามี editingWalletId แปลว่ากำลังแก้ไข
    if (editingWalletId !== null) {

      setWallets(
        wallets.map((wallet) => {

          if (wallet.id === editingWalletId) {

            return {
              ...wallet,
              name: name,
              target: Number(target),
              date: targetDate
            }

          }

          return wallet
        })
      )

    } else {

      //ถ้าไม่มี editingWalletId แปลว่ากำลังเพิ่มใหม่
      const newWallet = {
        id: Date.now(),
        name: name,
        target: Number(target),
        date: targetDate,
        balance: 0
      }

      setWallets([...wallets, newWallet])
    }

    //ล้างข้อมูลในฟอร์ม
    setName('')
    setTarget('')
    setTargetDate('')

    //กลับไปเป็นโหมดเพิ่ม
    setEditingWalletId(null)

    //ปิด Popup
    setShowForm(false)
  }

  //ฝาก
  const deposit = (id, amount) => {

    setWallets(
      wallets.map((wallet) => {

        if (wallet.id === id) {

          return {
            ...wallet,
            balance: wallet.balance + amount
          }

        }

        return wallet
      })
    )
  }

  //ถอน
  const withdraw = (id, amount) => {

    setWallets(
      wallets.map((wallet) => {

        if (wallet.id === id) {

          if (wallet.balance < amount) {
            alert('ยอดเงินไม่เพียงพอ')
            return wallet
          }

          return {
            ...wallet,
            balance: wallet.balance - amount
          }
        }

        return wallet
      })
    )
  }


  //แก้ไข
  const editWallet = (wallet) => {

    setEditingWalletId(wallet.id)

    setName(wallet.name)
    setTarget(wallet.target.toString())
    setTargetDate(wallet.date)

    setShowForm(true)
  }


  //ลบ
  const deleteWallet = (id) => {

    const confirmDelete = window.confirm(
      'คุณแน่ใจหรือไม่ว่าต้องการลบกระเป๋าเงินนี้?'
    )

    if (!confirmDelete) {
      return
    }

    setWallets(
      wallets.filter((wallet) => wallet.id !== id)
    )
  }


  return (
    <div className="wallet-page">

      <h1 className="wallet-title">
        กระเป๋าเงินออม
      </h1>


      {/*ปุ่มเพิ่มกระเป๋า*/}
      <button
        className="floating-add-button"
        onClick={() => {
          setEditingWalletId(null)
          setName('')
          setTarget('')
          setTargetDate('')
          setShowForm(true)
        }}
      >
        +
      </button>


      {/*เด้งหน้าเพิ่ม/แก้ไข*/}
      {showForm && (

        <div className="modal-overlay">

          <div className="wallet-form-card">

            <h2>
              <>{fromTitle}</>
            </h2>

            {/*ชื่อกระเป๋า*/}
            <input
              type="text"
              placeholder="ชื่อกระเป๋า"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/*เป้าหมาย*/}
            <input
              type="number"
              placeholder="เป้าหมายเงินออม"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />

            {/*วันที่เป้าหมาย*/}
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            {/*ปุ่ม*/}
            <div className="form-buttons">

              <button
                className="cancel-button"
                onClick={() => {
                  setShowForm(false)
                  setEditingWalletId(null)
                }}
              >
                ยกเลิก
              </button>


              <button
                className="save-button"
                onClick={addWallet}
              >
                ตกลง
              </button>

            </div>

          </div>

        </div>
      )}


      {/*แสดง Wallet ทั้งหมด*/}
      <div className="wallet-list">

        {wallets.map((wallet) => (

          <WalletCard
            key={wallet.id}

            name={wallet.name}
            target={wallet.target}
            date={wallet.date}
            balance={wallet.balance}

            //ฝาก
            onDeposit={(amount) => {
              deposit(wallet.id, amount)
            }}

            //ถอน
            onWithdraw={(amount) => {
              withdraw(wallet.id, amount)
            }}

            //แก้ไข
            onEdit={() => {
              editWallet(wallet)
            }}

            //ลบ
            onDelete={() => {
              deleteWallet(wallet.id)
            }}

          />

        ))}

      </div>

    </div>
  )
}

export default Wallet