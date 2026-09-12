import { useState } from 'react';
import { useNavigate } from 'react-router-dom';


function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();

    setError('');

    // ตรวจสอบ Password ก่อนส่งไป Backend
    if (password !== confirmPassword) {
      setError('Password ไม่ตรงกัน');
      return;
    }

    setLoading(true);

    // ส่งข้อมูลไป Backend ผ่าน /api/users/register/
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/users/register/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log('Register error:', data);

        // แสดง error จาก Django
        if (data.email) {
          setError(data.email[0]);
        } else if (data.username) {
          setError(data.username[0]);
        } else if (data.password) {
          setError(data.password[0]);
        } else {
          setError('สมัครสมาชิกไม่สำเร็จ');
        }

        return;
      }

      // สมัครสำเร็จ
      alert('สมัครสมาชิกสำเร็จ');

      // กลับไปหน้า Login
      navigate('/');

    } catch (error) {
      console.error(error);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-card">

        <div className="register-header">
          <h1>สมัครสมาชิก (Register)</h1>
          {/* <p>สร้างบัญชีเพื่อเริ่มจัดการการเงินของคุณ</p> */}
        </div>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label htmlFor="username">
              ชื่อผู้ใช้ (Username)
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              อีเมล (Email)
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              รหัสผ่าน (Password)
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              ยืนยันรหัสผ่าน (Confirm Password)
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <p className="register-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-register"
            disabled={loading}
          >
            {loading
              ? 'กำลังสมัครสมาชิก...'
              : 'สร้างบัญชี'}
          </button>

        </form>

        <p className="login-text">
          มีบัญชีอยู่แล้ว?{' '}

          <a href="/">
            เข้าสู่ระบบ
          </a>
        </p>

      </div>

    </div>
  );
}

export default Register;