import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';


import './App.css'

import Home from './pages/Home';
import Transactions from './pages/Transactions';
import Saving from './pages/Saving';
import Debts from './pages/Debts';
import Notifications from './pages/Notifications';

import Profile from './pages/Profile';

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
          path="/home/"
          element={<Home />}
        />
        <Route
          path="/transactions/"
          element={<Transactions />}
        />
        <Route
          path="/saving/"
          element={<Saving />}
        />
        <Route
          path="/debts/"
          element={<Debts />}
        />
        <Route
          path="/notifications/"
          element={<Notifications />}
        />
        

      </Routes>

    </BrowserRouter>
  );
}

export default App;