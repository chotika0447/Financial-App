import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';
import DebtCard from "./DebtCard";
import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("borrow");

  const [borrowDebts] = useState([
    {
      id: 1,
      name: "กยศ.",
      type: "borrowed",
      counterparty_name: "กยศ.",
      total_amount: 1000000,
      remaining_amount: 800000,
      payment_type: "monthly",
      payment_amount: 5000,
      due_date: "30 ก.ย. 69",
      status: "ongoing",
      icon: "school",
    },
    {
      id: 2,
      name: "ยืมค่าโทรศัพท์",
      type: "borrowed",
      counterparty_name: "เมย์",
      total_amount: 3000,
      remaining_amount: 1200,
      payment_type: "flexible",
      payment_amount: null,
      due_date: "15 ต.ค. 69",
      status: "ongoing",
      icon: "person",
    },
    {
      id: 3,
      name: "ยืมค่าที่พัก",
      type: "borrowed",
      counterparty_name: "พี่บีม",
      total_amount: 5000,
      remaining_amount: 2500,
      payment_type: "monthly",
      payment_amount: 1250,
      due_date: "30 พ.ย. 69",
      status: "ongoing",
      icon: "home",
    },
    {
      id: 4,
      name: "ยืมค่าอาหาร",
      type: "borrowed",
      counterparty_name: "นนท์",
      total_amount: 1500,
      remaining_amount: 300,
      payment_type: "flexible",
      payment_amount: null,
      due_date: "10 ต.ค. 69",
      status: "ongoing",
      icon: "person",
    },
  ]);

  const [lendDebts] = useState([
    {
      id: 5,
      name: "ให้เพื่อนยืมเงิน",
      type: "lent",
      counterparty_name: "พลอย",
      total_amount: 4000,
      remaining_amount: 2000,
      payment_type: "flexible",
      payment_amount: null,
      due_date: "12 ต.ค. 69",
      status: "ongoing",
      icon: "person",
    },
    {
      id: 6,
      name: "สำรองค่าทริป",
      type: "lent",
      counterparty_name: "ฟ้า",
      total_amount: 2500,
      remaining_amount: 1500,
      payment_type: "monthly",
      payment_amount: 500,
      due_date: "20 ต.ค. 69",
      status: "ongoing",
      icon: "person",
    },
    {
      id: 7,
      name: "ออกค่าอาหารให้เพื่อน",
      type: "lent",
      counterparty_name: "เจน",
      total_amount: 1000,
      remaining_amount: 200,
      payment_type: "flexible",
      payment_amount: null,
      due_date: "5 ต.ค. 69",
      status: "ongoing",
      icon: "person",
    },
  ]);

  const currentDebts = activeTab === "borrow" ? borrowDebts : lendDebts;
  const totalBorrow = borrowDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);
  const totalLend = lendDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);

  return (
    <div className="debts-page pb-20">
      <CustomHeader title="หนี้สินและการให้ยืม" color="var(--color-debts)" />

      <main className="content">
        {/* ส่วนหัว */}
        <div className="grid grid-cols-2 gap-2">

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
          {currentDebts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
            />
          ))}

        </div>

        {/* ปุ่มเพิ่มรายการ */}
        <button
          className="
          fixed
          right-5
          bottom-[78px]
          w-[43px]
          h-[43px]
          rounded-full
          bg-[#ffbd3d]
          flex
          items-center
          justify-center
          shadow-md
          mb-5
        "
        >
          <Plus size={27} strokeWidth={2.5} />

          <span
            className="
            absolute
            top-[45px]
            right-[-5px]
            text-[11px]
            whitespace-nowrap
            text-gray-700
          "
          >
            เพิ่มรายการ
          </span>
        </button>
      </main >

      <Navbar />
    </div >
  );
}

export default Debts;