import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import Register from './pages/Register';
import './App.css'

import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AddFriend from './pages/AddFriend';

import Wallet from './pages/Wallet';
import SavingPlan from './pages/SavingPlan';
import Retirement from './pages/Retirement';
import CompoundInterest from './pages/CompoundInterest';




import { initializeLineLiff, liff, readLineIdentity } from './lineAuth';

function EntryRoute() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function routeUser() {
      const accessToken = sessionStorage.getItem('accessToken');

      if (accessToken) {
        try {
          const response = await fetch('/users/me/', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            navigate('/home/', { replace: true });
            return;
          }
        } catch {
          if (!cancelled) setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
          return;
        }

        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      }

      try {
        await initializeLineLiff();

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: `${window.location.origin}/` });
          return;
        }

        const { idToken } = await readLineIdentity();
        const response = await fetch('/users/line-login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });

        if (response.status === 404) {
          navigate('/register/', { replace: true });
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 && data.error === 'LINE_ID_TOKEN_EXPIRED') {
            liff.logout();
            liff.login({ redirectUri: `${window.location.origin}/` });
            return;
          }

          throw new Error(data.error || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ');
        }

        sessionStorage.setItem('accessToken', data.access);
        sessionStorage.setItem('refreshToken', data.refresh);
        navigate('/home/', { replace: true });
      } catch (routeError) {
        if (!cancelled) setError(routeError.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    }

    routeUser();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="entry-route">
      <p>{error || 'กำลังตรวจสอบบัญชีของคุณ...'}</p>
      {error && (
        <button type="button" onClick={() => window.location.reload()}>
          ลองอีกครั้ง
        </button>
      )}
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<EntryRoute />}
        />

        <Route
          path="/register/"
          element={<Register />}
        />

        <Route
          path="/profile/"
          element={<Profile />}
        />

        <Route
          path="/home/"
          element={<Home />}
        />
        <Route
          path="/transactions/"
          element={<Transactions />}
        />
        <Route
          path="/saving/"
          element={<Wallet />}
        />
        {/* SavingPlan */}
        <Route
          path="/debts/"
          element={<Debts />}
        />
        <Route
          path="/notifications/"
          element={<Notifications />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/friends/add"
          element={<AddFriend />}
        />
        <Route
          path="/retirement"
          element={<Retirement />}
        />
        <Route
          path="/compound-interest"
          element={<CompoundInterest />}
        />
        {/* <Route
          path="/saving-plan"
          element={<SavingPlan />}
        /> */}
        

      </Routes>

    </BrowserRouter>
  );
}

export default App;