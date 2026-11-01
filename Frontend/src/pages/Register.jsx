
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initializeLineLiff,
  liff,
  readLineIdentity
} from '../lineAuth';

function Register() {
  const [lineProfile, setLineProfile] = useState(null);
  const [idToken, setIdToken] = useState('');

  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [email, setEmail] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  const [liffReady, setLiffReady] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const liffId = import.meta.env.VITE_LINE_LIFF_ID;

  const reloginLine = () => {
    liff.logout();

    liff.login({
      redirectUri: `${window.location.origin}/register/`,
    });
  };

  // ตรวจสอบว่ามีบัญชีอยู่แล้วหรือไม่
  const loginExistingUser = async (idToken) => {
    try {
      const response = await fetch('/users/line-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('accessToken', data.access);
        sessionStorage.setItem('refreshToken', data.refresh);

        navigate('/home/');
        return true;
      }

      if (response.status === 404) {
        setCheckingAccount(false);
        return false;
      }

      console.log('LINE LOGIN status:', response.status);
      console.log('LINE LOGIN response:', data);

      if (
        response.status === 401 &&
        data.error === 'LINE_ID_TOKEN_EXPIRED'
      ) {
        reloginLine();
        return false;
      }

      setError(data.error || 'ไม่สามารถเข้าสู่ระบบได้');
      setCheckingAccount(false);
      return false;

    } catch (error) {
      console.error('LINE LOGIN fetch error:', error);
      setError(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${error.message}`);
      setCheckingAccount(false);
      return false;
    }
  };

  useEffect(() => {
    if (!liffId) {
      setCheckingAccount(false);
      return;
    }

    initializeLineLiff()
      .then(async () => {
        setLiffReady(true);

        if (liff.isLoggedIn()) {
          try {
            const identity = await readLineIdentity();

            setLineProfile(identity.profile);
            setIdToken(identity.idToken);

            await loginExistingUser(identity.idToken);

          } catch (identityError) {
            console.error('LINE identity error:', identityError);
            setError(identityError.message);
            setCheckingAccount(false);
          }
        } else {
          setCheckingAccount(false);
        }
      })
      .catch(() => {
        setError('เชื่อมต่อ LINE ไม่สำเร็จ กรุณาตรวจสอบ LIFF ID');
        setCheckingAccount(false);
      });
  }, [liffId]);

  // เชื่อมต่อบัญชี LINE
  const handleLineConnect = async () => {
    setError('');

    if (!liffReady) return;

    if (!liff.isLoggedIn()) {
      liff.login({
        redirectUri: window.location.href,
      });
      return;
    }

    try {
      const identity = await readLineIdentity();

      setLineProfile(identity.profile);
      setIdToken(identity.idToken);

      await loginExistingUser(identity.idToken);

    } catch (identityError) {
      setError(identityError.message);
    }
  };

  // สมัครสมาชิก
  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (!idToken) {
      setError('กรุณาเชื่อมต่อบัญชี LINE ก่อนสมัครสมาชิก');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/users/line-register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
          age: Number(age),
          occupation: occupation.trim(),
          email: email.trim(),
          monthly_income: monthlyIncome,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('Register error:', data);
        setError(data.error || 'สมัครสมาชิกไม่สำเร็จ');
        return;
      }

      sessionStorage.setItem('accessToken', data.access);
      sessionStorage.setItem('refreshToken', data.refresh);

      navigate('/home/');

    } catch (error) {
      console.error(error);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');

    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-100 border-t-[#A995D8] rounded-full animate-spin" />

          <p className="text-sm text-gray-500">
            กำลังตรวจสอบบัญชี LINE...
          </p>
        </div>
      </div>
    );
  }

  const inputClass = `
    w-full px-4 py-3
    bg-white/80
    border border-gray-200
    rounded-xl
    text-gray-700
    placeholder:text-gray-400
    outline-none
    transition-all duration-200
    focus:border-purple-300
    focus:ring-4 focus:ring-purple-100/70
  `;

  const labelClass = `
    block text-sm font-medium text-gray-700 mb-2
  `;

  return (
    <div className="
      relative min-h-screen overflow-hidden
      bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50
      px-4 py-10 sm:py-14
    ">

      {/* Background Decorations */}
      <div className="
        absolute -top-24 -right-20
        w-72 h-72
        bg-pink-200/40
        rounded-full blur-3xl
        pointer-events-none
      " />

      <div className="
        absolute top-1/3 -left-28
        w-80 h-80
        bg-blue-200/40
        rounded-full blur-3xl
        pointer-events-none
      " />

      <div className="
        absolute -bottom-28 right-1/4
        w-80 h-80
        bg-purple-200/40
        rounded-full blur-3xl
        pointer-events-none
      " />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-9">

          <h1 className="
            text-2xl sm:text-3xl
            font-bold text-gray-800
            tracking-tight
          ">
            สมัครสมาชิก
          </h1>

        </div>

        {/* Form Container */}
        <div className="
          w-full
          bg-white/85
          backdrop-blur-xl
          rounded-3xl
          shadow-[0_12px_50px_rgba(139,126,200,0.10)]
          border border-white
          p-6 sm:p-9 md:p-10
        ">

          {/* LINE Connect Button */}
          {!lineProfile && (
            <button
              type="button"
              onClick={handleLineConnect}
              disabled={!liffReady || loading}
              className="
                w-full py-3.5 px-5
                rounded-xl
                bg-[#06C755]
                hover:bg-[#05B34C]
                text-white font-semibold
                shadow-sm
                transition-all duration-200
                hover:shadow-md
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {liffReady
                ? 'เชื่อมต่อด้วย LINE'
                : 'กำลังเชื่อมต่อ...'}
            </button>
          )}

          {!liffId && (
            <p className="mt-3 text-sm text-red-500 text-center">
              ยังไม่ได้ตั้งค่า VITE_LINE_LIFF_ID
            </p>
          )}

          {/* LINE Profile */}
          {lineProfile && (
            <div className="flex flex-col items-center text-center mb-9">

              <div className="
                w-24 h-24 sm:w-28 sm:h-28
                rounded-full
                overflow-hidden
                bg-purple-100
                ring-4 ring-white
                shadow-md
              ">
                {lineProfile.pictureUrl ? (
                  <img
                    src={lineProfile.pictureUrl}
                    alt="รูปโปรไฟล์ LINE"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="
                    w-full h-full
                    flex items-center justify-center
                    text-3xl text-purple-400
                  ">
                    👤
                  </div>
                )}
              </div>

              <h2 className="
                mt-4
                text-lg sm:text-xl
                font-semibold text-gray-800
              ">
                {lineProfile.displayName}
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                เชื่อมต่อกับข้อมูลโปรไฟล์ LINE ของคุณแล้ว
              </p>

            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="
              mb-6 p-3.5
              rounded-xl
              bg-red-50
              border border-red-100
              text-sm text-red-500
              text-center
            ">
              {error}
            </div>
          )}

          {/* Register Form */}
          {lineProfile && (
            <form onSubmit={handleRegister}>

              <div className="mb-7">
                <h3 className="
                  text-base font-semibold text-gray-800
                ">
                  กรุณากรอกข้อมูลเพื่อสร้างบัญชีของคุณ
                </h3>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">

                {/* Age */}
                <div>
                  <label htmlFor="age" className={labelClass}>
                    อายุ (ปี)
                    <span className="text-pink-400 ml-1">*</span>
                  </label>

                  <input
                    id="age"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="กรอกอายุของคุณ"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Occupation */}
                <div>
                  <label htmlFor="occupation" className={labelClass}>
                    กลุ่มอาชีพ
                    <span className="text-pink-400 ml-1">*</span>
                  </label>

                  <select
                    id="occupation"
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value)}
                    className={`
                      ${inputClass}
                      appearance-none cursor-pointer
                    `}
                    required
                  >
                    <option value="" disabled>
                      -- เลือกกลุ่มอาชีพ --
                    </option>

                    <option value="นักเรียน / นักศึกษา">
                      นักเรียน / นักศึกษา
                    </option>

                    <option value="พนักงานบริษัท / เอกชน">
                      พนักงานบริษัท / เอกชน
                    </option>

                    <option value="ข้าราชการ / รัฐวิสาหกิจ">
                      ข้าราชการ / รัฐวิสาหกิจ
                    </option>

                    <option value="เจ้าของธุรกิจ / ค้าขาย">
                      เจ้าของธุรกิจ / ค้าขาย
                    </option>

                    <option value="อาชีพอิสระ / ฟรีแลนซ์">
                      อาชีพอิสระ / ฟรีแลนซ์
                    </option>

                    <option value="รับจ้างทั่วไป / แรงงาน">
                      รับจ้างทั่วไป / แรงงาน
                    </option>

                    <option value="เกษตรกร">
                      เกษตรกร
                    </option>

                    <option value="ไม่ได้ประกอบอาชีพ / อื่น ๆ">
                      ไม่ได้ประกอบอาชีพ / อื่น ๆ
                    </option>
                  </select>
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelClass}>
                    อีเมล
                    <span className="
                      ml-2 text-xs font-normal text-gray-400
                    ">
                      *สำหรับรับเอกสารที่ส่งออก (ไม่บังคับ)
                    </span>
                  </label>

                  <input
                    id="email"
                    type="email"
                    maxLength="254"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Monthly Income */}
                <div className="sm:col-span-2">
                  <label htmlFor="monthly-income" className={labelClass}>
                    รายได้ต่อเดือน (บาท)
                    <span className="
                      ml-2 text-xs font-normal text-gray-400
                    ">
                      *สำหรับการประเมินสุขภาพการเงิน (ไม่บังคับ)
                    </span>
                  </label>

                  <input
                    id="monthly-income"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="กรอกรายได้ต่อเดือน"
                    value={monthlyIncome}
                    onChange={(event) => setMonthlyIncome(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !idToken}
                className="
                  w-full mt-8 py-3.5 px-5
                  rounded-xl
                  bg-gradient-to-r
                  from-[#E9AFC9]
                  via-[#C5B5E8]
                  to-[#A9C8ED]
                  hover:brightness-105
                  text-white font-semibold
                  shadow-md shadow-purple-200/50
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:shadow-lg
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  disabled:hover:translate-y-0
                "
              >
                {loading
                  ? 'กำลังสมัครสมาชิก...'
                  : 'สร้างบัญชี'}
              </button>

              <p className="
                mt-4 text-center
                text-xs text-gray-400
              ">
                ข้อมูลของคุณจะถูกนำไปใช้ในการประเมิณสุขภาพการเงินส่วนบุคคล
              </p>

            </form>
          )}

        </div>

        {/* Footer */}
        <p className="
          mt-6 text-center
          text-xs text-gray-400
        ">
          KaneCho : Personal Finance Management
        </p>

      </div>
    </div>
  );
}

export default Register;
