import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

   const navigate = useNavigate();

  /*login ด้วย email-password */
  const handleLogin = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/users/login/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Email หรือ Password ไม่ถูกต้อง');
        return;
      }

      // เก็บ JWT
      sessionStorage.setItem(
        'accessToken',
        data.access
      );

      sessionStorage.setItem(
        'refreshToken',
        data.refresh
      );

      // ไปหน้า Profile
      navigate('/profile/');

    } catch (error) {
      console.error(error);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  /*login ด้วย บัญชี google */
  const handleGoogleLogin = () => {
    window.location.href =
      'http://127.0.0.1:8000/accounts/google/login/';
  };

  return (
    <div className="login-page">
      <div className="login-card">
        
        <div className="login-header">
          <h1>Login</h1>
          <p>เข้าสู่ระบบเพื่อจัดการการเงินของคุณ</p>
        </div>

        {/* ถ้ากดส่งฟอร์มจะเรียกใช้ handleLogin  */}
        <form onSubmit={handleLogin}>

          <div className="form-group">
            
            <label htmlFor="email">
              อีเมล
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email" required
            />
          </div>


          <div className="form-group">
            <label htmlFor="password">
              รหัสผ่าน
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password" required
            />
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}


          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

        </form>

        <div className="divider"><span>หรือ</span></div>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
        >
          เข้าสู่ระบบด้วย Google
        </button>


        <p className="register-text">
          ไม่มีบัญชีใช่ไหม?{' '}
          <a href="/register/">
            สมัครสมาชิก
          </a>
        </p>

      </div>

    </div>
  );
}

export default Login;