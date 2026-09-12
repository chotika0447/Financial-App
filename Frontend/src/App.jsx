import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';


function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register/"
          element={<Register />}
        />

        <Route
          path="/google-callback/"
          element={<GoogleCallback />}
        />

        <Route
          path="/profile/"
          element={<Profile />}
        />

        <Route
          path="/transactions/"
          element={<Transactions />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;