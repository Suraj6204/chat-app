import React from 'react'
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <div>
      <Routes>
        <Route path="/login" element={<LoginPage/>} />
      </Routes>
    </div>
  )
}

export default App