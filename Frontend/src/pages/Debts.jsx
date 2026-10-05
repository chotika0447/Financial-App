import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';
import AddDebt from "../components/AddDebt";
import PayDebt from "../components/PayDebt";
import DebtCard from "../components/DebtCard";
import DebtPayHistory from "./DebtPayHistory";

import { useEffect, useState } from "react";
import {
  Search,
  ArrowUpDown,
  Pencil,
  Trash2,
  Plus,
  GraduationCap,
  Bell,
  Home,
  FileText,
  WalletCards,
  HandCoins,
} from "lucide-react";

function Debts() {
  const [activeTab, setActiveTab] = useState("borrow");//แท็บหลักรวมรายการทั้งหมดที่ผู้ใช้เลือกดูอยู่ (ยืม/ให้ยืม)
  const [currentDebtType, setCurrentDebtType] = useState("borrow");//แท็บย่อยที่ผู้ใช้เลือกดูอยู่ (ยืม/ให้ยืม) หลังกดปุ่มเพิ่มรายการหนี้สิน
  const [showAddDebt, setShowAddDebt] = useState(false);//แสดง/ซ่อน ป็อปอัพ เพิ่มรายการหนี้สิน
  const [showDebtPay, setShowDebtPay] = useState(false);//แสดง/ซ่อน ป็อปอัพ หน้าชำระหนี้
  const [selectedDebt, setSelectedDebt] = useState(null);//สถานะของหนี้สินที่ผู้ใช้เลือก (สำหรับการชำระหนี้หรือดูประวัติการชำระ)
  const [showDebtHistory, setShowDebtHistory] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);//สถานะแก้ไขรายการหนี้สินที่เลือก

  const isPopupOpen = showAddDebt || showDebtPay || editingDebt;//สถานะการเปิดป็อปอัพทั้งหมด เพื่อซ่อน Navbar ไม่ให้บัง

  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDebts = async () => {
      const accessToken = sessionStorage.getItem("accessToken");

      if (!accessToken) {
        setError("ไม่พบข้อมูลการเข้าสู่ระบบ");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/debts/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "ไม่สามารถโหลดข้อมูลหนี้สินได้"
          );
        }

        setDebts(data);
      } catch (error) {
        console.error("Fetch debts error:", error);
        setError(error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  //จัดการปุ่มเพิ่มรายการหนี้สินและแก้ไขรายการ
  const handleSaveDebt = async (debtData) => {
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ");
    }

    const isEditing = Boolean(editingDebt);

    const url = isEditing
      ? `/debts/${editingDebt.id}/`
      : "/debts/";

    const response = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: debtData,
    });

    const data = await response.json();
    console.log("Saved debt data:", data);

    if (!response.ok) {
      console.error("Save debt error:", data);

      throw new Error(
        data.detail || "ไม่สามารถบันทึกข้อมูลหนี้สินได้"
      );
    }

    if (isEditing) {
      // แทนข้อมูลเดิมด้วยข้อมูลที่แก้ไขแล้ว
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === data.id ? data : debt
        )
      );
    } else {
      // เพิ่มรายการใหม่
      setDebts((prevDebts) => [
        ...prevDebts,
        data,
      ]);
    }

    // ล้างโหมดแก้ไข
    setEditingDebt(null);
  };

  // const [borrowDebts] = useState([
  //   {
  //     id: 1,
  //     name: "กยศ.",
  //     type: "borrowed",
  //     counterparty_name: "กยศ.",
  //     total_amount: 300000,
  //     remaining_amount: 50000,
  //     payment_type: "monthly",
  //     payment_amount: 5000,
  //     due_date: "30 ก.ย. 69",
  //     status: "ongoing",
  //     icon: "school",
  //   },
  //   {
  //     id: 2,
  //     name: "ยืมค่าโทรศัพท์",
  //     type: "borrowed",
  //     counterparty_name: "เมย์",
  //     total_amount: 3000,
  //     remaining_amount: 1200,
  //     payment_type: "flexible",
  //     payment_amount: null,
  //     due_date: "15 ต.ค. 69",
  //     status: "ongoing",
  //     icon: "person",
  //   },
  //   {
  //     id: 3,
  //     name: "ยืมค่าที่พัก",
  //     type: "borrowed",
  //     counterparty_name: "พี่บีม",
  //     total_amount: 5000,
  //     remaining_amount: 2500,
  //     payment_type: "monthly",
  //     payment_amount: 1250,
  //     due_date: "30 พ.ย. 69",
  //     status: "ongoing",
  //     icon: "home",
  //   },
  //   {
  //     id: 4,
  //     name: "ยืมค่าอาหาร",
  //     type: "borrowed",
  //     counterparty_name: "นนท์",
  //     total_amount: 1500,
  //     remaining_amount: 300,
  //     payment_type: "flexible",
  //     payment_amount: null,
  //     due_date: "10 ต.ค. 69",
  //     status: "ongoing",
  //     icon: "person",
  //   },
  // ]);

  // const [lendDebts] = useState([
  //   {
  //     id: 5,
  //     name: "ให้เพื่อนยืมเงิน",
  //     type: "lent",
  //     counterparty_name: "พลอย",
  //     total_amount: 4000,
  //     remaining_amount: 2000,
  //     payment_type: "flexible",
  //     payment_amount: null,
  //     due_date: "12 ต.ค. 69",
  //     status: "ongoing",
  //     icon: "person",
  //   },
  //   {
  //     id: 6,
  //     name: "สำรองค่าทริป",
  //     type: "lent",
  //     counterparty_name: "ฟ้า",
  //     total_amount: 2500,
  //     remaining_amount: 1500,
  //     payment_type: "monthly",
  //     payment_amount: 500,
  //     due_date: "20 ต.ค. 69",
  //     status: "ongoing",
  //     icon: "person",
  //   },
  //   {
  //     id: 7,
  //     name: "ออกค่าอาหารให้เพื่อน",
  //     type: "lent",
  //     counterparty_name: "เจน",
  //     total_amount: 1000,
  //     remaining_amount: 200,
  //     payment_type: "flexible",
  //     payment_amount: null,
  //     due_date: "5 ต.ค. 69",
  //     status: "ongoing",
  //     icon: "person",
  //   },
  // ]);

  const borrowDebts = debts.filter(
    (debt) => debt.type === "borrowed"
  );

  const lendDebts = debts.filter(
    (debt) => debt.type === "lent"
  );

  const currentDebtsList =
    activeTab === "borrow"
      ? borrowDebts
      : lendDebts;

  const totalBorrow = borrowDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount),
    0
  );

  const totalLend = lendDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount),
    0
  );

  //เช็คข้อมูลหนี้สินที่ผู้ใช้เลือกว่ามีอยู่จริงหรือไม่ 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">
          กำลังโหลดข้อมูลหนี้สิน...
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <p className="text-red-500 text-sm text-center">
          {error}
        </p>
      </div>
    );
  }
  if (showDebtHistory && selectedDebt) {
    return (
      <>
        <DebtPayHistory debt={selectedDebt} onBack={() => setShowDebtHistory(false)} />
        <Navbar />
      </>
    );
  }

  return (
    <div className="debts-page pb-20">
      <CustomHeader title="หนี้สินและการให้ยืม" color="var(--color-debts)" />

      <AddDebt
        open={showAddDebt || editingDebt !== null}
        onClose={() => {
          setShowAddDebt(false);
          setEditingDebt(null);
        }}
        currentDebtType={currentDebtType}
        setCurrentDebtType={setCurrentDebtType}
        editingDebt={editingDebt}
        onSubmit={handleSaveDebt}
      />

      <PayDebt
        open={showDebtPay}
        debt={selectedDebt}
        onSaved={async () => {
          const accessToken = sessionStorage.getItem("accessToken");

          const response = await fetch("/debts/", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const data = await response.json();

          if (response.ok) {
            setDebts(data);
          }
        }}
        onClose={() => {
          setShowDebtPay(false);
          setSelectedDebt(null);
        }}
      />
      <main className="content">
        {/* ส่วนหัว */}
        <div className="grid grid-cols-2 gap-2 px-5 py-5">

          {/* ต้องจ่ายคืน */}
          <div className="bg-white rounded-lg shadow-md px-4 py-4">
            <p className="text-center text-[13px] text-red-500 mb-3">
              ที่ต้องจ่ายคืน
            </p>

            <div className="flex items-center justify-between">
              <span className="text-red-500 text-[22px] font-bold">
                ฿
              </span>

              <span className="text-[22px] text-gray-700">
                {totalBorrow.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ต้องได้รับคืน */}
          <div className="bg-white rounded-lg shadow-md px-4 py-4">
            <p className="text-center text-[13px] text-green-600 mb-3">
              ที่ต้องได้รับคืน
            </p>

            <div className="flex items-center justify-between">
              <span className="text-red-500 text-[22px] font-bold">
                ฿
              </span>

              <span className="text-[22px] text-gray-700">
                {totalLend.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* แถบค้นหา */}
        <div className="bg-white px-5 py-3">

          <div className="flex items-center gap-2">

            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-700"
              />

              <input
                type="text"
                placeholder=""
                className="
                w-full
                h-[24px]
                rounded-full
                border
                border-gray-300
                pl-8
                pr-3
                text-sm
                outline-none
                focus:border-gray-500
              "
              />
            </div>

            <button
              className="
              w-[24px]
              h-[24px]
              rounded-md
              border
              border-gray-300
              flex
              items-center
              justify-center
              bg-white
            "
            >
              <ArrowUpDown size={14} />
            </button>

          </div>
        </div>

        {/* แท็บเลือกประเภทรายการ */}
        <div className="px-5 bg-white pb-3">

          <div className="flex w-full">

            <button
              onClick={() => setActiveTab("borrow")}
              className={`
              flex-1
              h-[30px]
              rounded-l-md
              border
              border-gray-300
              text-[12px]
              transition
              ${activeTab === "borrow"
                  ? "bg-white text-black font-medium"
                  : "bg-[#d5d5d5] text-gray-500"
                }
            `}
            >
              ยืมคนอื่น({borrowDebts.length})
            </button>

            <button
              onClick={() => setActiveTab("lend")}
              className={`
              flex-1
              h-[30px]
              rounded-r-md
              border
              border-gray-300
              text-[12px]
              transition
              ${activeTab === "lend"
                  ? "bg-white text-black font-medium"
                  : "bg-[#d5d5d5] text-gray-500"
                }
            `}
            >
              ให้คนอื่นยืม({lendDebts.length})
            </button>

          </div>
        </div>

        {/* พื้นที่แสดงรายการ */}
        <div className="px-5 pt-1">
          {/* เรียกใช้ component DebtCard ตามหนี้สินทั้งหมดของuser*/}
          {currentDebtsList.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onPayment={() => {
                setSelectedDebt(debt);
                setShowDebtPay(true);
              }}
              onViewHistory={() => {
                setSelectedDebt(debt);
                setShowDebtHistory(true);
              }}
              onCheckPayment={() => {
                setSelectedDebt(debt);
                setShowDebtHistory(true);
              }}
              onEdit={(debt) => {
                setEditingDebt(debt);
                setCurrentDebtType(
                  debt.type === "borrowed" ? "borrow" : "lend"
                );
              }}
            />
          ))}

        </div>

        {/* ปุ่มเพิ่มรายการ */}
        <button
          onClick={() => {
            setEditingDebt(null);
            setShowAddDebt(true);
            setCurrentDebtType(activeTab); //เซ็ตประเภทหนี้สินเริ่มต้นตามแท็บที่ผู้ใช้เลือกอยู่
          }}
          className="fixed right-5 bottom-[78px] w-[45px] h-[45px] rounded-full 
                bg-[#ffbd3d] flex items-center justify-center shadow-md mb-5">

          <Plus size={27} strokeWidth={2.5} />
          <span className="absolute top-[45px] text-[11px] w-[70px]">
            เพิ่มรายการ
          </span>

        </button>

      </main >

      {!isPopupOpen && <Navbar />}
    </div >
  );
}

export default Debts;