import React from 'react'
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { useThemeStore } from "./store/useThemeStore";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { theme } = useThemeStore();
  return (

    <div data-theme={theme}>
      <Routes>
        <Route path="/login" element={<LoginPage/>} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App