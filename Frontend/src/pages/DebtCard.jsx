import {
  GraduationCap,
  Pencil,
  Trash2,
} from "lucide-react";

function DebtCard({ debt }) {

  const isBorrow = debt.type === "borrowed";

  // จำนวนเงินที่ชำระ/ได้รับคืนแล้ว
  const paidAmount =
    Number(debt.total_amount) - Number(debt.remaining_amount);

  // เปอร์เซ็นต์ความคืบหน้า
  const progress = Math.round(
    (paidAmount / Number(debt.total_amount)) * 100
  );

  return (
    <div className="bg-white border border-gray-300 rounded-lg mb-3 px-4 pt-4 pb-2">

      <div className="flex gap-3">

        {/* icon */}
        <div
          className="
            w-[48px]
            h-[48px]
            rounded-full
            bg-gray-100
            border
            border-gray-300
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          {debt.icon === "school" ? (
            <GraduationCap size={27} color="black" />
          ) : (
            <div className="w-[48px] h-[48px] rounded-full bg-gray-300" />
          )}
        </div>

        {/* Main information */}
        <div className="flex-1 min-w-0">

          {/* Name + Edit */}
          <div className="flex items-start justify-between">

            <div>

              <h3 className="font-bold text-[12px] text-gray-900">
                {debt.name}
              </h3>

              <span
                className="
                  inline-block
                  mt-1
                  px-2
                  py-[1px]
                  rounded-full
                  border
                  border-pink-300
                  text-[9px]
                  text-pink-500
                "
              >
                {isBorrow ? "ยืมเงิน" : "ให้ยืมเงิน"}
              </span>

            </div>

            <button
              className="
                flex
                items-center
                gap-1
                text-[10px]
                text-gray-600
              "
            >
              <Pencil size={11} />
              แก้ไข
            </button>

          </div>

          {/* Date */}
          <p className="text-[9px] text-gray-500 mt-1">
            ครบกำหนด: {debt.due_date}
          </p>

          {/* Counterparty */}
          <p className="text-[9px] text-gray-500">
            คู่สัญญา: {debt.counterparty_name}
          </p>

        </div>
      </div>

      {/* Amount */}
      <div className="mt-2">

        <div className="flex justify-between items-end">

          <span className="text-[10px] text-gray-600">
            {isBorrow ? "หนี้คงเหลือ" : "ได้รับคืนแล้ว"}
          </span>

          <span className="text-[10px] text-gray-600">
            THB{" "}
            {isBorrow
              ? Number(debt.remaining_amount).toLocaleString()
              : paidAmount.toLocaleString()
            }
            ({progress}%)
          </span>

        </div>

        {/* Progress */}
        <div className="w-full h-[5px] bg-gray-300 rounded-full mt-1 overflow-hidden">

          <div
            className={`
              h-full
              rounded-full
              ${isBorrow ? "bg-red-500" : "bg-blue-600"}
            `}
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-2">

        {/* Delete */}
        <button
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

        {/* History */}
        <button
          className="
            flex-1
            h-[30px]
            border
            border-gray-300
            rounded-md
            text-[11px]
            text-gray-600
            bg-white
          "
        >
          ดูประวัติการชำระหนี้
        </button>

        {/* Action */}
        {isBorrow ? (
          <button
            className="
              flex-1
              h-[30px]
              rounded-md
              bg-green-500
              text-white
              text-[11px]
              font-medium
            "
          >
            ชำระหนี้
          </button>
        ) : (
          <button
            className="
              flex-1
              h-[30px]
              rounded-md
              bg-[#202020]
              text-white
              text-[11px]
              font-medium
            "
          >
            ตรวจสอบการชำระหนี้
          </button>
        )}

      </div>

    </div>
  );
}

export default DebtCard;