import { useEffect, useState } from "react";
import {
  X,
  GraduationCap,
  Gamepad2,
  Car,
  Home,
  CalendarDays,
  Utensils,
  ShoppingBag,
  Plane,
  Smartphone,
  Dumbbell,
  BookOpen,
  Image,
} from "lucide-react";

function AddDebt({ open, onClose, currentDebtType, setCurrentDebtType, editingDebt, onSubmit, friends = [], }) {

  const initialForm = {
    name: "",
    counterparty: "",
    counterpartyId: null,
    totalAmount: "",
    remainingAmount: "",
    paymentType: "monthly",
    paymentAmount: "",
    paymentDate: "",
    dueDate: "",
    description: "",
    icon: "school",
    color: "purple",
    image: null,
  };
  const [iconMode, setIconMode] = useState("icon");//สถานะการเลือกไอคอนหรืออัปโหลดรูป
  const [form, setForm] = useState(initialForm);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);//ข้อความแจ้งเตือนก่อนปิดหน้าต่าง
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);//สถานะแสดงหน้าต่างเลือกบัญชีเพื่อน
  const [counterpartyMode, setCounterpartyMode] = useState("manual"); //สถานะการเลือกบัญชีเพื่อนหรือใส่ชื่อเฉยๆ

  useEffect(() => {
    if (editingDebt) {
      setForm({
        name: editingDebt.name || "",
        counterparty: editingDebt.counterparty_name || "",
        counterpartyId: editingDebt.counterparty || null,
        totalAmount: editingDebt.total_amount || "",
        remainingAmount: editingDebt.remaining_amount || "",
        paymentType: editingDebt.payment_type || "monthly",
        paymentAmount: editingDebt.payment_amount || "",
        paymentDate: editingDebt.payment_date || "",
        dueDate: editingDebt.due_date || "",
        description: editingDebt.note || "",
        icon: editingDebt.icon || "school",
        color: editingDebt.color || "purple",
        image: editingDebt.image || null,
      });

      // แสดงรูปเดิมตอนเปิดแก้ไข
      setImagePreview(editingDebt.image || null);
      setIconMode(editingDebt.image ? "upload" : "icon");
      setCounterpartyMode(editingDebt.counterparty ? "friend" : "manual");

    } else {
      setForm(initialForm);// ล้างฟอร์มตอนเพิ่มรายการใหม่
      setImagePreview(null);// ล้าง preview ตอนเพิ่มรายการใหม่
      setIconMode("icon");
      setCounterpartyMode("manual");
    }
  }, [editingDebt]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleCloseWithoutSave = () => {
    setForm(initialForm);
    setIconMode("icon");
    setShowCloseConfirm(false);
    onClose();
  };

  const isFormDirty = () => {
    return (
      form.name ||
      form.counterparty ||
      form.totalAmount ||
      form.remainingAmount ||
      form.paymentAmount ||
      form.paymentDate ||
      form.dueDate ||
      form.description ||
      form.image
    );
  };
  const iconOptions = [
    { id: "school", icon: GraduationCap },
    { id: "game", icon: Gamepad2 },
    { id: "car", icon: Car },
    { id: "home", icon: Home },
    { id: "food", icon: Utensils },
    { id: "shopping", icon: ShoppingBag },
    { id: "travel", icon: Plane },
    { id: "phone", icon: Smartphone },
    { id: "fitness", icon: Dumbbell },
    { id: "book", icon: BookOpen },
  ];

  const colorOptions = [
    {
      id: "purple",
      className: "bg-purple-300",
    },
    {
      id: "pink",
      className: "bg-pink-300",
    },
    {
      id: "blue",
      className: "bg-blue-300",
    },
    {
      id: "green",
      className: "bg-green-300",
    },
    {
      id: "yellow",
      className: "bg-yellow-200",
    },
    {
      id: "orange",
      className: "bg-orange-300",
    },
    {
      id: "red",
      className: "bg-red-300",
    },
    {
      id: "cyan",
      className: "bg-cyan-300",
    },
    {
      id: "indigo",
      className: "bg-indigo-300",
    },
    {
      id: "gray",
      className: "bg-gray-300",
    },
  ];

  // ฟังก์ชันบันทึกข้อมูลหนี้สิน
  const handleSubmit = async () => {
    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("counterparty_name", form.counterparty)
      // ถ้ามีการเลือกบัญชีเพื่อน ให้ส่งค่า counterpartyId ไปด้วย
      if (form.counterpartyId) {
        formData.append("counterparty", form.counterpartyId);
      } else {
        formData.append("counterparty", "");
      }

      formData.append("type", currentDebtType === "borrow" ? "borrowed" : "lent");
      formData.append("total_amount", form.totalAmount);
      formData.append("payment_type", form.paymentType);
      formData.append("icon", form.icon);
      formData.append("color", form.color);
      // หนี้แบบรายเดือน
      if (
        form.paymentType === "monthly"
        && form.paymentAmount
      ) {
        formData.append(
          "payment_amount",
          form.paymentAmount
        );
      }

      if (
        form.paymentType === "monthly"
        && form.paymentDate
      ) {
        formData.append(
          "payment_date",
          form.paymentDate
        );
      }

      // วันสิ้นสุด
      if (form.dueDate) {
        formData.append(
          "due_date",
          form.dueDate
        );
      }

      formData.append(
        "note",
        form.description || ""
      );

      // ไอคอนและสี
      formData.append("icon", form.icon);
      formData.append("color", form.color);

      // รูปภาพ
      if (form.image instanceof File) {
        formData.append("image", form.image);
      } else if (form.image === null && editingDebt?.image) {
        formData.append("image", "");
      }

      await onSubmit(formData);

      setForm(initialForm);
      setIconMode("icon");
      onClose();

    } catch (error) {
      console.error("Save debt error:", error);
      alert(error.message || "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5">

      <div className="relative w-full max-w-[365px] max-h-[90vh] overflow-y-auto rounded-[18px] bg-white shadow-xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-5 pt-5 pb-3">

          <div className="flex items-center justify-between">

            <h2 className="text-[18px] font-semibold text-gray-800">
              {editingDebt ? "แก้ไขข้อมูล" : "เพิ่มข้อมูล"}
              {currentDebtType === "borrow"
                ? "หนี้สิน"
                : "การให้ยืม"}
            </h2>

            <button
              onClick={() => {
                if (isFormDirty()) {
                  setShowCloseConfirm(true);
                } else {
                  onClose();
                }
              }}
              className="flex h-8 w-8 items-center justify-center"
            >
              <X
                size={22}
                className="text-gray-500"
              />
            </button>

          </div>

        </div>


        <div className="px-5 pb-6">

          {/* เลือกประเภทรายการ*/}
          {!editingDebt && (
            <div className="mb-4">

              <p className="mb-2 text-[13px] font-medium">
                ประเภทรายการ
              </p>

              <div className="flex h-[34px] overflow-hidden rounded-full border border-gray-300">

                <button
                  type="button"
                  onClick={() => setCurrentDebtType("borrow")}
                  className={`
                  flex-1 text-[12px]
                  ${currentDebtType === "borrow"
                      ? "bg-white text-black"
                      : "bg-gray-300 text-gray-400"
                    }
                `}
                >
                  หนี้สิน
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentDebtType("lend")}
                  className={`
                  flex-1 text-[12px]
                  ${currentDebtType === "lend"
                      ? "bg-white text-black"
                      : "bg-gray-300 text-gray-400"
                    }
                `}
                >
                  ให้ยืม
                </button>

              </div>

            </div>
          )}



          {/* ไอคอนหนี้สิน*/}
          <div className="debt_icon mb-5">

            <p className="mb-2 text-[12px] font-medium">
              รูปภาพ / ไอคอน
            </p>

            {/* ตัวเลือก */}
            <div className="mb-3 flex h-[32px] overflow-hidden rounded-full border border-gray-300">

              <button
                type="button"
                onClick={() => {
                  setIconMode("icon");
                  if (form.image) {
                    handleChange("image", null);
                    setImagePreview(null);
                  }
                }}
                className={`flex-1 text-[11px] ${iconMode === "icon" ? "bg-gray-800 text-white" : "bg-white text-gray-500"}`}
              >
                เลือกไอคอน
              </button>

              <button
                type="button"
                onClick={() => setIconMode("upload")}
                className={`flex-1 text-[11px]
                  ${iconMode === "upload"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-500"
                  }`}
              >
                อัปโหลดรูป
              </button>

            </div>


            <div className="flex items-start gap-4">

              {/* Preview รูป */}
              <div
                className={`flex h-[82px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-full
                ${iconMode === "icon"
                    ? colorOptions.find(
                      (item) => item.id === form.color
                    )?.className || "bg-gray-200"
                    : "bg-gray-200"
                  }`}
              >

                {iconMode === "upload" ? (

                  imagePreview ? (

                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    <Image
                      size={32}
                      className="text-gray-400"
                    />

                  )

                ) : (

                  (() => {
                    const selectedIcon = iconOptions.find(
                      (item) => item.id === form.icon
                    );

                    const Icon =
                      selectedIcon?.icon || GraduationCap;

                    return (
                      <Icon
                        size={32}
                        className="text-gray-700"
                      />
                    );
                  })()

                )}

              </div>


              <div className="flex-1">

                {iconMode === "icon" ? (

                  <>
                    <p className="mb-2 text-[11px] text-gray-500">
                      เลือกไอคอน
                    </p>

                    <div className="grid grid-cols-5 gap-2">

                      {iconOptions.map((item) => {

                        const Icon = item.icon;
                        const selected = form.icon === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              handleChange("icon", item.id);
                              handleChange("image", null);
                              setImagePreview(null);// ถ้าผู้ใช้เคยเลือกรูปให้ล้าง preview รูปเดิมออก
                            }}
                            className={`
                            flex h-[30px] w-[30px]
                            items-center justify-center
                            rounded-full
                            bg-gray-100
                            ${selected
                                ? "ring-2 ring-gray-800 ring-offset-1"
                                : ""
                              }`}
                          >
                            <Icon size={15} />
                          </button>
                        );

                      })}

                    </div>

                    {/* เลือกสี */}
                    <div>
                      <p className="mb-1 text-[11px] text-gray-500">
                        สีพื้นหลัง
                      </p>

                      <div className="grid grid-cols-5 gap-2">
                        {colorOptions.map((item) => {
                          const selected = form.color === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                handleChange("color", item.id)
                              }
                              className={`flex h-[30px] w-[30px] items-center justify-center rounded-full
                                ${selected
                                  ? "ring-2 ring-gray-800 ring-offset-1"
                                  : ""
                                }`}
                            >
                              <span className={`h-[22px] w-[22px] rounded-full ${item.className}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>

                ) : (

                  <>
                    <p className="mb-2 text-[11px] text-gray-500">
                      เลือกรูปภาพจากเครื่อง
                    </p>

                    <label
                      htmlFor="debt-image"
                      className="flex h-[32px] cursor-pointer items-center justify-center rounded-[8px] border border-gray-300 bg-gray-100 px-3 text-[11px] text-gray-600">
                      เลือกรูปภาพ
                    </label>

                    <input id="debt-image" type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        handleChange("image", file);

                        const imageUrl = URL.createObjectURL(file);
                        setImagePreview(imageUrl);
                      }}
                    />

                  </>

                )}

              </div>

            </div>

          </div>


          {/* =========================
              ชื่อ
          ========================= */}
          <div className="mb-3">

            <label className="mb-1 block text-[12px]">
              {currentDebtType === "borrow"
                ? "ชื่อหนี้สิน"
                : "ชื่อการให้ยืม"}
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                handleChange(
                  "name",
                  e.target.value
                )
              }
              className="
                h-[30px]
                w-full
                rounded-[9px]
                border border-gray-300
                bg-gray-100
                px-2
                text-[12px]
                outline-none
              "
            />

          </div>


          {/* =========================
              เจ้าหนี้ / ลูกหนี้
          ========================= */}
          <div className="mb-3">

            <div className="mb-1 flex items-center justify-between">

              <label className="text-[12px]">
                {currentDebtType === "borrow"
                  ? "เจ้าหนี้"
                  : "ลูกหนี้"}
              </label>

              <button
                type="button"
                onClick={() => setShowFriendPicker(true)}
                className="rounded-full bg-green-500 px-2 py-[2px] text-[9px] text-white">
                + เลือกเพื่อน
              </button>

            </div>

            {/* แสดงว่าเลือกเพื่อนหรือกรอกเอง */}
            <div className="mb-2 flex h-[30px] overflow-hidden rounded-full border border-gray-300">

              <button
                type="button"
                onClick={() => {
                  setCounterpartyMode("friend");
                  setShowFriendPicker(true);
                }}
                className={`flex-1 text-[10px] ${counterpartyMode === "friend" ? "bg-gray-800 text-white" : "bg-white text-gray-500"}`}
              >
                เลือกเพื่อน
              </button>

              <button
                type="button"
                onClick={() => {
                  setCounterpartyMode("manual");

                  handleChange("counterpartyId", null);
                  handleChange("counterparty", "");
                }}
                className={`flex-1 text-[10px]
        ${counterpartyMode === "manual"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-500"
                  }`}
              >
                ระบุชื่อเอง
              </button>

            </div>

            <input
              type="text"
              value={form.counterparty}
              disabled={counterpartyMode === "friend"}
              placeholder={
                counterpartyMode === "friend"
                  ? "เลือกเพื่อนจากปุ่มด้านบน"
                  : "กรอกชื่อเจ้าหนี้ / ลูกหนี้"
              }
              onChange={(e) => {
                handleChange("counterparty", e.target.value);

                // ถ้าพิมพ์เอง ต้องยกเลิกการผูกบัญชีเพื่อน
                handleChange("counterpartyId", null);
              }}
              className="h-[30px] w-full rounded-[9px] border border-gray-300 bg-gray-100 px-2 text-[12px] outline-none disabled:text-gray-500" />

            {counterpartyMode === "friend" && form.counterparty && (
              <p className="mt-1 text-[9px] text-green-600">
                ✓ เชื่อมโยงกับบัญชีผู้ใช้แล้ว
              </p>
            )}

          </div>


          {/* =========================
              จำนวนเงิน
          ========================= */}
          <div className="mb-4 grid grid-cols-2 gap-3">

            <div>

              <label className="mb-1 block text-[12px]">
                ยอดทั้งหมด
              </label>

              <input
                type="number"
                value={form.totalAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange("totalAmount", value);
                  if (!editingDebt) {
                    handleChange("remainingAmount", value);
                  }
                }}
                className="
                  h-[30px]
                  w-full
                  rounded-[9px]
                  border border-gray-300
                  bg-gray-100
                  px-2
                  text-[12px]
                  outline-none
                "
              />

            </div>


            <div>

              <label className="mb-1 block text-[12px]">
                ยอดคงเหลือ
              </label>

              <input
                type="number"
                value={form.remainingAmount}
                onChange={(e) =>
                  handleChange("remainingAmount", e.target.value)
                }
                className="
                  h-[30px]
                  w-full
                  rounded-[9px]
                  border border-gray-300
                  bg-gray-100
                  px-2
                  text-[12px]
                  outline-none
                "
              />

            </div>

          </div>


          {/* =========================
              ประเภทชำระ
          ========================= */}
          <div className="mb-3">

            <label className="mb-1 block text-[12px]">
              ประเภทการชำระหนี้
            </label>

            <select
              value={form.paymentType}
              onChange={(e) =>
                handleChange(
                  "paymentType",
                  e.target.value
                )
              }
              className="
                h-[34px]
                w-full
                rounded-[9px]
                border border-gray-300
                bg-gray-100
                px-2
                text-[12px]
                outline-none
              "
            >
              <option value="flexible">
                ทยอยจ่าย
              </option>

              <option value="monthly">
                รายเดือน
              </option>
            </select>

          </div>


          {/* =========================
              เฉพาะรายเดือน
          ========================= */}
          {form.paymentType === "monthly" && (
            <div className="mb-3 rounded-[10px] bg-gray-100 p-3">

              <div className="mb-2">

                <label className="mb-1 block text-[11px]">
                  จำนวนเงินที่ต้องชำระรายงวด
                </label>

                <input
                  type="number"
                  value={form.paymentAmount}
                  onChange={(e) =>
                    handleChange(
                      "paymentAmount",
                      e.target.value
                    )
                  }
                  className="
                    h-[30px]
                    w-full
                    rounded-[8px]
                    border border-gray-300
                    bg-white
                    px-2
                    text-[12px]
                  "
                />

              </div>


              <div>

                <label className="mb-1 block text-[11px]">
                  งวดชำระทุกวันที่
                </label>

                <input type="number" min="1" max="31" value={form.paymentDate} onChange={(e) => handleChange("paymentDate", e.target.value)}
                       className="h-[30px] w-full rounded-[8px] border border-gray-300 bg-white px-2 text-[12px]"/>
              </div>

            </div>
          )}


          {/* =========================
              วันสิ้นสุด
          ========================= */}
          <div className="mb-3">

            <label className="mb-1 block text-[12px]">
              กำหนดสิ้นสุดการชำระหนี้
            </label>

            <div className="relative">

              <CalendarDays
                size={15}
                className="
                  pointer-events-none
                  absolute
                  left-2
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  handleChange(
                    "dueDate",
                    e.target.value
                  )
                }
                className="
                  h-[32px]
                  w-full
                  rounded-[9px]
                  border border-gray-300
                  bg-gray-100
                  pl-8
                  pr-2
                  text-[11px]
                "
              />

            </div>

          </div>


          {/* =========================
              คำอธิบาย
          ========================= */}
          <div className="mb-4">

            <label className="mb-1 block text-[12px]">
              คำอธิบาย
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              rows={3}
              className="
                w-full
                resize-none
                rounded-[9px]
                border border-gray-300
                bg-gray-100
                px-2
                py-2
                text-[12px]
                outline-none
              "
            />

          </div>


          {/* บันทึก */}
          <div className="flex justify-center gap-2">
            <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-[9px] bg-[#2D9CDB] px-7 py-2 text-[12px] text-white disabled:opacity-50">
              {saving ? "กำลังบันทึก..."
                : editingDebt
                  ? "บันทึกการแก้ไข"
                  : "บันทึก"}
            </button>
          </div>

        </div>

      </div>


      {showFriendPicker && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40">

          <div className="w-[300px] max-h-[70vh] overflow-y-auto rounded-[14px] bg-white p-4 shadow-xl">

            <div className="mb-3 flex items-center justify-between">

              <h3 className="text-[14px] font-semibold text-gray-800">
                เลือกเพื่อน
              </h3>

              <button
                type="button"
                onClick={() => setShowFriendPicker(false)}
                className="text-gray-500"
              >
                <X size={18} />
              </button>

            </div>

            {friends.length === 0 ? (

              <div className="py-8 text-center">

                <p className="text-[11px] text-gray-500">
                  ยังไม่มีรายชื่อเพื่อน
                </p>

              </div>

            ) : (

              <div className="space-y-2">

                {friends.map((friend) => (

                  <button
                    key={friend.uid || friend.id}
                    type="button"
                    onClick={() => {

                      handleChange(
                        "counterpartyId",
                        friend.uid || friend.id
                      );

                      handleChange(
                        "counterparty",
                        friend.username
                      );

                      setCounterpartyMode("friend");
                      setShowFriendPicker(false);

                    }}
                    className="
                flex
                w-full
                items-center
                justify-between
                rounded-[10px]
                border
                border-gray-200
                bg-gray-50
                px-3
                py-2
                text-left
                hover:bg-gray-100
              "
                  >

                    <div>

                      <p className="text-[11px] font-medium text-gray-800">
                        {friend.username}
                      </p>

                      <p className="text-[9px] text-gray-500">
                        UID: {friend.uid}
                      </p>

                    </div>

                    {form.counterpartyId === (friend.uid || friend.id) && (
                      <span className="text-[10px] text-green-500">
                        ✓
                      </span>
                    )}

                  </button>

                ))}

              </div>

            )}

          </div>

        </div>
      )}
      {showCloseConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[280px] rounded-[12px] bg-white p-5 shadow-lg">

            <p className="mb-2 text-[14px] font-medium text-gray-800">
              ต้องการออกจากหน้าต่างหรือไม่?
            </p>

            <p className="mb-5 text-[11px] leading-5 text-gray-500">
              หากปิดหน้าต่างนี้ ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก
            </p>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="
            flex-1
            h-[34px]
            rounded-[8px]
            border
            border-gray-300
            bg-white
            text-[11px]
            text-gray-600
          "
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleCloseWithoutSave}
                className="
            flex-1
            h-[34px]
            rounded-[8px]
            bg-gray-800
            text-[11px]
            text-white
          "
              >
                ออกจากหน้าต่าง
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default AddDebt;