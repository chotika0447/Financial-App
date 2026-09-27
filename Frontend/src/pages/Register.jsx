import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeLineLiff, liff, readLineIdentity } from '../lineAuth';

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

  // เช็คว่าเคย regist แล้วรึยัง
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

      // มีบัญชีอยู่แล้ว→ ให้ไปหน้า Home เลย
      if (response.ok) {
        sessionStorage.setItem('accessToken', data.access);
        sessionStorage.setItem('refreshToken', data.refresh);

        navigate('/home/');
        return true;
      }

      // 404 = ยังไม่เคยสมัคร → ให้แสดง Register
      if (response.status === 404) {
        setCheckingAccount(false);
        return false;
      }
      console.log('LINE LOGIN status:', response.status);
      console.log('LINE LOGIN response:', data);

      //กรณีที่tokenหมดอายุ
      if (response.status === 401 && data.error === 'LINE_ID_TOKEN_EXPIRED') {
        console.log('LINE ID Token หมดอายุ → Login LINE ใหม่');

        reloginLine();
        return false;
      }

      // Error อื่นๆ
      setError(data.error || 'ไม่สามารถเข้าสู่ระบบได้');
      setCheckingAccount(false);
      return false;

    } catch (error) {
      console.error('LINE LOGIN fetch error:', error);
      setError(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${error.message}`);
      setCheckingAccount(false); //ส่งสถานะการตรวจบัญชีผู้ใช้กลับไปว่าไม่มีบัญชี
      return false;
    }
  };
  
  useEffect(() => {
    if (!liffId) return;

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

  //ฟังก์ชันการรับมือการเชือมต่อบัญชี line
  const handleLineConnect = async () => {
    setError('');
    if (!liffReady) return;

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    try {
      const identity = await readLineIdentity();

      setLineProfile(identity.profile);
      setIdToken(identity.idToken);

      // ตรวจบัญชีเดิม
      await loginExistingUser(identity.idToken);

    } catch (identityError) {
      setError(identityError.message);
    }
  };

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

  //ถ้ายังตรวจบัญชีไม่เสร็จจะยังไม่โหลดหน้าต่อไป
  if (checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-[#8B7EC8] rounded-full animate-spin"></div>

          <p className="text-gray-500">
            กำลังตรวจสอบบัญชี LINE...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="register-page">

      <div className="register-card">

        <div className="register-header">
          <h1>สมัครสมาชิก (Register)</h1>
          <p>เชื่อมต่อ LINE เพื่อสร้างโปรไฟล์ของคุณ</p>
        </div>

        <button
          type="button"
          className="line-connect-button"
          onClick={handleLineConnect}
          disabled={!liffReady || loading}
        >
          {lineProfile ? 'เชื่อมต่อ LINE แล้ว' : liffReady ? 'เชื่อมต่อด้วย LINE' : 'กำลังเชื่อมต่อ...'}
        </button>

        {!liffId && (
          <p className="register-error">ยังไม่ได้ตั้งค่า VITE_LINE_LIFF_ID</p>
        )}

        {error && (
          <p className="register-error">
            {error}
          </p>
        )}

        {lineProfile && (
          <div className="line-profile-preview">
            {lineProfile.pictureUrl && (
              <img src={lineProfile.pictureUrl} alt="รูปโปรไฟล์ LINE" />
            )}
            <span>{lineProfile.displayName}</span>
          </div>
        )}

        {lineProfile && (
          <form className="profile-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="age">อายุ (ปี)</label>
              <input
                id="age"
                type="number"
                min="1"
                step="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupation">อาชีพ</label>
              <input
                id="occupation"
                type="text"
                maxLength="100"
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">อีเมล(ไม่บังคับ)</label>
              <input
                id="email"
                type="email"
                maxLength="254"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="monthly-income">รายได้ต่อเดือน (บาท)</label>
              <input
                id="monthly-income"
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome}
                onChange={(event) => setMonthlyIncome(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-register"
              disabled={loading || !idToken}
            >
              {loading
                ? 'กำลังสมัครสมาชิก...'
                : 'สร้างบัญชี'}
            </button>
          </form>
        )}

      </div>

    </div>
  );
}

export default Register;