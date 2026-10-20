
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import Register from './pages/Register';
import './App.css';

import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import AddFriend from './pages/AddFriend';
import MyQRCode from './pages/MyQRCode';
import ScanFriendQR from './pages/ScanFriendQR';

import Wallet from './pages/Wallet';
import SavingPlan from './pages/SavingPlan';
import Retirement from './pages/Retirement';
import CompoundInterest from './pages/CompoundInterest';

import FinancialHealth from './pages/FinancialHealth';

import { initializeLineLiff, liff, readLineIdentity } from './lineAuth';

function EntryRoute() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function routeUser() {
      const queryParams = new URLSearchParams(window.location.search);
      const debtId = queryParams.get('debtId');
      const returnTo = queryParams.get('returnTo');
      let destination = '/home/';
      if (returnTo === '/debts/') {
        destination = '/debts/';
      }
      if (debtId) {
        destination = `/debts/?debtId=${encodeURIComponent(debtId)}`;
      }
      const redirectUri =
        `${window.location.origin}${window.location.pathname}${window.location.search}`;
        
      const accessToken = sessionStorage.getItem('accessToken');
      console.log('Access Token:', accessToken);

      if (accessToken) {
        try {
          const response = await fetch('/users/me/', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (response.ok) {
            navigate(destination, { replace: true });
            return;
          }
        } catch {
          if (!cancelled) {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
          }
          return;
        }

        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      }

      try {
        await initializeLineLiff();

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri });
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

        const responseText = await response.text();
        let data = {};
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            if (!response.ok) {
              throw new Error(
                `เชื่อมต่อ Backend ไม่สำเร็จ (HTTP ${response.status})`,
              );
            }
            throw new Error('Backend ส่งข้อมูลกลับมาไม่ถูกต้อง');
          }
        } else if (!response.ok) {
          throw new Error(
            `เชื่อมต่อ Backend ไม่สำเร็จ (HTTP ${response.status})`,
          );
        }

        if (!response.ok) {
          if (
            response.status === 401 &&
            data.error === 'LINE_ID_TOKEN_EXPIRED'
          ) {
            liff.logout();
            liff.login({ redirectUri });
            return;
          }

          throw new Error(
            data.error || 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ'
          );
        }

        sessionStorage.setItem('accessToken', data.access);
        sessionStorage.setItem('refreshToken', data.refresh);
        navigate(destination, { replace: true });
      } catch (routeError) {
        if (!cancelled) {
          setError(
            routeError.message || 'เข้าสู่ระบบไม่สำเร็จ'
          );
        }
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
        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          ลองอีกครั้ง
        </button>
      )}
    </main>
  );
}

function DebtEntryRoute() {
  const location = useLocation();
  const [authorizationState, setAuthorizationState] = useState('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function verifyAccessToken() {
      const accessToken = sessionStorage.getItem('accessToken');

      if (!accessToken) {
        setAuthorizationState('unauthorized');
        return;
      }

      try {
        const response = await fetch('/users/me/', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          if (!cancelled) setAuthorizationState('unauthorized');
          return;
        }

        if (!cancelled) setAuthorizationState('authorized');
      } catch {
        if (!cancelled) {
          setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
          setAuthorizationState('error');
        }
      }
    }

    verifyAccessToken();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authorizationState === 'unauthorized') {
    const queryParams = new URLSearchParams(location.search);
    queryParams.set('returnTo', '/debts/');
    const search = '?' + queryParams.toString();

    return (
      <Navigate
        to={{ pathname: '/', search }}
        replace
      />
    );
  }

  if (authorizationState === 'error') {
    return <main className="entry-route"><p>{error}</p></main>;
  }

  if (authorizationState !== 'authorized') {
    return <main className="entry-route"><p>กำลังตรวจสอบบัญชีของคุณ...</p></main>;
  }

  return <Debts />;
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

        {/* หน้าแก้ไข Draft จาก LINE Flex Card */}
        <Route
          path="/edit-transaction/"
          element={<Transactions />}
        />

        <Route
          path="/saving/"
          element={<Wallet />}
        />
        <Route
          path="/debts/"
          element={<DebtEntryRoute />}
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
          path="/friends/my-qr"
          element={<MyQRCode />}
        />

        <Route
          path="/friends/scan-qr"
          element={<ScanFriendQR />}
        />

        <Route
          path="/retirement"
          element={<Retirement />}
        />

        <Route
          path="/compound-interest"
          element={<CompoundInterest />}
        />
        {<Route
          path="/saving-plan"
          element={<SavingPlan />}
        />}

        {<Route
          path="/calculator"
          element={<Retirement />}
        />}

        <Route
          path="/financial-health"
          element={<FinancialHealth />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
