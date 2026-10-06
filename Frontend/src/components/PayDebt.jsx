import { useEffect, useState } from "react";
import {
  X,
  Upload,
  CalendarDays,
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
  Trash2
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

function PayDebt({ open, debt, onClose, onSaved }) {

  const [form, setForm] = useState({
    amount: "",
    paymentDate: "",
    proof: null,
    description: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      alert("ไม่พบข้อมูลการเข้าสู่ระบบ");
      return;
    }

    if (!form.amount) {
      alert("กรุณาระบุจำนวนเงินที่ชำระ");
      return;
    }

    if (!form.paymentDate) {
      alert("กรุณาระบุวันที่ชำระ");
      return;
    }

    const formData = new FormData();

    formData.append("paid_amount", form.amount);
    formData.append("paid_date", form.paymentDate);
    formData.append("note", form.description);

    if (form.proof) {
      formData.append("proof_image", form.proof);
    }

    try {
      const response = await fetch(
        `/debts/${debt.id}/payments/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      console.log("Payment response:", data);

      if (!response.ok) {
        console.error("Payment error:", data);

        throw new Error(
          data.detail || "ไม่สามารถบันทึกการชำระหนี้ได้"
        );
      }

      // แจ้ง Debts.jsx ว่าบันทึกสำเร็จ
      if (onSaved) {
        onSaved(data);
      }

      // ล้างฟอร์ม
      setForm({
        amount: "",
        paymentDate: "",
        proof: null,
        description: "",
      });

      setShowProofPreview(false);

      onClose();

    } catch (error) {
      console.error("Save payment error:", error);

      alert(
        error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
      );
    }
  };

  const [proofPreview, setProofPreview] = useState(null);
  const [showProofPreview, setShowProofPreview] = useState(false);

  useEffect(() => {
    if (!form.proof) {
      setProofPreview(null);
      return;
    }

    const imageUrl = URL.createObjectURL(form.proof);
    setProofPreview(imageUrl);

    return () => URL.revokeObjectURL(imageUrl);
  }, [form.proof]);

  if (!open || !debt) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-5">

      <div className="flex w-full max-w-[365px] max-h-[90vh] flex-col overflow-hidden rounded-[18px] bg-white shadow-xl">

        {/* Header - FIX*/}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-4">

          <h2 className="text-[17px] font-semibold">
            เพิ่มข้อมูลการชำระหนี้สิน
          </h2>

          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center">
            <X size={22} className="text-gray-500" />
          </button>

        </div>

        {/* Content - scrollable*/}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">

          {/* ไอคอน */}
          <div className={`mx-auto w-[48px] h-[48px] rounded-full flex items-center justify-center overflow-hidden
              ${colorMap[debt?.color] || "bg-gray-300"} `}
          >
            {debt?.image ? (
              <img src={debt.image} alt={debt.name} className="w-full h-full object-cover"/>
            ) : (
              (() => {
                const Icon = iconMap[debt?.icon] || GraduationCap;

                return <Icon size={27} color="black" />;
              })()
            )}
          </div>


          {/* ชื่อหนี้ */}
          <p className="mb-4 text-center text-[13px] font-medium text-gray-700">
            {debt.name}
          </p>

          {/* ช่องใส่จำนวนเงินที่ชำระ */}
          <div className="mb-3">
            <label className="mb-1 block text-[12px]">
              จำนวนเงินที่ชำระ
            </label>

            <input
              type="number"
              min="0"
              max={debt.remaining_amount}
              value={form.amount}
              onChange={(e) =>
                handleChange(
                  "amount",
                  e.target.value
                )
              }
              placeholder="0.00"
              className="h-[34px] w-full rounded-[9px] border border-gray-300 bg-gray-100 px-3 text-[12px] outline-none" />
          </div>


          {/* เลือกวันที่ชำระหนี้ */}
          <div className="mb-3">

            <label className="mb-1 block text-[12px]">
              วันที่ชำระหนี้
            </label>

            <div className="relative">

              <CalendarDays size={15} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) =>
                  handleChange(
                    "paymentDate",
                    e.target.value
                  )
                }
                className="h-[34px] w-full rounded-[9px] border border-gray-300 bg-gray-100 pl-8 pr-2 text-[11px]" />
            </div>
          </div>


          {/* แนบรูป */}
          <div className="mb-3">
            <label className="mb-1 block text-[12px]">
              หลักฐานการชำระ
            </label>

            <label className="relative flex h-[120px] w-[90px] cursor-pointer items-center justify-center overflow-hidden rounded-[9px] border border-gray-300 bg-gray-100">
              {proofPreview ? (
                <>
                  {/* รูปหลักฐาน */}
                  <img
                    src={proofPreview}
                    alt="หลักฐานการชำระ"
                    className="h-full w-full object-cover"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowProofPreview(true);
                    }}
                  />

                  {/* ปุ่มลบ */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChange("proof", null);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Upload size={22} className="mb-1 text-gray-500" />
                  <span className="text-[9px] text-gray-500">
                    อัพโหลดรูปภาพ
                  </span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];

                  if (file) {
                    handleChange("proof", file);
                  }
                }}
              />
            </label>
          </div>


          {/* คำอธิบาย*/}
          <div className="mb-4">

            <label className="mb-1 block text-[12px]">
              คำอธิบาย
            </label>

            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              className="
                w-full
                resize-none
                rounded-[9px]
                border border-gray-300
                bg-gray-100
                px-2
                py-2
                text-[12px]
              "
            />

          </div>

          {/* ปุ่มบันทึก */}
          <div className="flex justify-center">
            <button onClick={handleSubmit} className="rounded-[9px] bg-[#2D9CDB] px-7 py-2 text-[12px] text-white">
              บันทึก
            </button>
          </div>

        </div>

      </div>

      {showProofPreview && proofPreview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-5"
          onClick={() => setShowProofPreview(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ปุ่มปิด */}
            <button
              type="button"
              onClick={() => setShowProofPreview(false)}
              className="absolute right-[-10px] top-[-10px] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md"
            >
              <X size={18} className="text-gray-600" />
            </button>

            {/* รูปขยาย */}
            <img
              src={proofPreview}
              alt="หลักฐานการชำระ"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default PayDebt;