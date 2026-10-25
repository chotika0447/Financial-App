import {
  GraduationCap,
  Gamepad2,
  Car,
  Home,
  Utensils,
  ShoppingBag,
  Plane,
  Smartphone,
  Dumbbell,
  BookOpen,
  Pencil,
  Trash2,
  BellRing
} from "lucide-react";

const iconMap = {
  school: GraduationCap,
  game: Gamepad2,
  car: Car,
  home: Home,
  food: Utensils,
  shopping: ShoppingBag,
  travel: Plane,
  phone: Smartphone,
  fitness: Dumbbell,
  book: BookOpen,
};

const colorMap = {
  purple: "bg-purple-300",
  pink: "bg-pink-300",
  blue: "bg-blue-300",
  green: "bg-green-300",
  yellow: "bg-yellow-200",
  orange: "bg-orange-300",
  red: "bg-red-300",
  cyan: "bg-cyan-300",
  indigo: "bg-indigo-300",
  gray: "bg-gray-300",
};

function DebtCard({ debt, onPayment, onViewHistory, onCheckPayment, onEdit, onDelete, onSendReminder, sendingReminderId }) {

  const isBorrow = debt.type === "borrowed";

  // จำนวนเงินที่ชำระ/ได้รับคืนแล้ว
  const paidAmount = Number(debt.total_amount) - Number(debt.remaining_amount);

  // เปอร์เซ็นต์ความคืบหน้า
  const progress = Math.round((paidAmount / Number(debt.total_amount)) * 100);

  return (
    <div className="bg-white border border-gray-300 rounded-lg mb-3 px-4 pt-4 pb-2">

      <div className="flex gap-3">

        {/* icon */}
        <div
          className={`w-[48px] h-[48px] rounded-full border border-gray-300 flex items-center justify-center shrink-0 overflow-hidden
            ${colorMap[debt.color] || "bg-gray-300"} `}
        >
          {debt.image ? (
            <img
              src={debt.image}
              alt={debt.name}
              className="w-full h-full object-cover"
            />
          ) : (
            (() => {
              const Icon = iconMap[debt.icon] || GraduationCap;

              return <Icon size={27} color="black" />;
            })()
          )}
        </div>

        {/* Main information */}
        <div className="flex-1 min-w-0">

          {/* ข้อมูลส่วนหัวของหนี้สิน+แก้ไข */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1">
                <h3 className="font-bold text-[12px] text-gray-900">
                  {debt.name}
                </h3>

                <span className="text-[9px] text-gray-500">
                  | ครบกำหนด: {
                    debt.payment_type === "monthly"
                      ? (debt.current_due_date || debt.due_date)
                      : debt.due_date
                  }
                </span>
              </div>
              {/* หมวดหมู่หนี้สิน */}
              <span className="inline-block mt-1 mr-1 px-2 py-[1px] text-[9px] rounded-full border border-pink-300 text-pink-500">
                {debt.payment_type === "monthly" ? "รายเดือน" : "ทยอยจ่าย"}
              </span>
              {debt.counterparty && (
                <span className="inline-block mt-1 px-2 py-[1px] text-[9px] rounded-full border border-green-500 text-green-600">
                  ผูกบัญชีเพื่อน
                </span>
              )}
            </div>

            {/* ปุ่มแก้ไข */}
            <button onClick={() => onEdit(debt)} className="flex items-center gap-1 text-[10px] text-gray-600">
              <Pencil size={11} />
              แก้ไข
            </button>

          </div>

          {/* Counterparty */}
          <p className="text-[9px] text-gray-500 mt-1">
            {debt.type === "borrowed" ? "เจ้าหนี้:" : "ลูกหนี้:"} {debt.counterparty_name}
          </p>

          {debt.note?.trim() && (
            <p className="text-[9px] text-gray-500">
              หมายเหตุ: {debt.note}
            </p>
          )}

        </div>
      </div>

      {/* Amount */}
      <div className="mt-2">

        <div className="flex justify-between items-end">

          <span className="text-[10px] text-gray-600">
            {isBorrow ? `ชำระแล้ว (${progress}%)` : `ได้รับคืนแล้ว (${progress}%)`}
          </span>

          <span className="text-[10px] text-gray-600">
            THB {paidAmount.toLocaleString()} / {Number(debt.total_amount).toLocaleString()}
          </span>

        </div>

        {/* Progress bar */}
        <div className="w-full h-[5px] bg-gray-300 rounded-full mt-1 overflow-hidden">

          <div
            className={`h-full rounded-full ${isBorrow ? "bg-red-500" : "bg-blue-600"}`}
            style={{ width: `${progress}%` }}
          />

        </div>

      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-2">

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete?.(debt)}
          aria-label={`ลบรายการ ${debt.name}`}
          title="ลบรายการหนี้"
          className="
            w-[30px]
            h-[30px]
            border
            border-gray-300
            rounded-md
            flex
            items-center
            justify-center
            text-gray-500
          "
        >
          <Trash2 size={15} />
        </button>

        {/* ส่งแจ้งเตือนชำระหนี้ไปยัง LINE ของเพื่อน */}
        {!isBorrow && debt.counterparty && (
          <button
            type="button"
            onClick={() => onSendReminder?.(debt)}
            disabled={sendingReminderId === debt.id}
            aria-label={`ส่งแจ้งเตือนชำระหนี้ ${debt.name} ทาง LINE`}
            title="ส่งแจ้งเตือนชำระหนี้ทาง LINE"
            className="h-[30px] px-2 border border-green-500 rounded-md flex items-center justify-center gap-1 text-green-700 text-[10px] whitespace-nowrap disabled:opacity-50"
          >
            <BellRing size={13} />
            {sendingReminderId === debt.id ? "กำลังส่ง..." : "ส่งเตือน LINE"}
          </button>
        )}

        {/* Action */}
        {isBorrow ? (
          <div className="flex flex-1 h-[30px] gap-2">
            <button
              onClick={onViewHistory}
              className="flex-1 border border-gray-300 rounded-md text-[11px] text-gray-600 bg-white"
            >
              ดูประวัติการชำระหนี้
            </button>

            <button
              onClick={onPayment}
              className="flex-1 rounded-md bg-green-500 text-white text-[11px] font-medium"
            >
              ชำระหนี้
            </button>
          </div>
        ) : debt.counterparty ? (
          <button
            onClick={onCheckPayment}
            className="flex-1 rounded-md bg-[#202020] text-white text-[11px] font-medium"
          >
            ตรวจสอบการชำระหนี้
          </button>
        ) : (
          <div className="flex flex-1 h-[30px] gap-2">
            <button onClick={onViewHistory} className="flex-1 border border-gray-300 rounded-md text-[11px] text-gray-600 bg-white">
              ดูประวัติการได้รับเงินคืน
            </button>

            <button
              onClick={onPayment}
              className="flex-1 rounded-md bg-green-500 text-white text-[11px] font-medium"
            >
              บันทึกการได้รับเงินคืน
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default DebtCard;