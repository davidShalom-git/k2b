import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom'
import Billing_Page from './Components/Billing_Page'
import Home_Page from './Components/Home_Page'

const AppRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/billing');
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path='/' element={<Home_Page />} />
      <Route path='/billing' element={<Billing_Page />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App