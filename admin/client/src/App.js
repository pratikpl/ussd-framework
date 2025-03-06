import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AuthProvider from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FlowList from './pages/FlowList';
import FlowDetail from './pages/FlowDetail';
import HelperList from './pages/HelperList';
import HelperDetail from './pages/HelperDetail';
import LogExplorer from './pages/LogExplorer';
import ReportGenerator from './pages/ReportGenerator';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="flows" element={<FlowList />} />
              <Route path="flows/:id" element={<FlowDetail />} />
              <Route path="helpers" element={<HelperList />} />
              <Route path="helpers/:path" element={<HelperDetail />} />
              <Route path="logs" element={<LogExplorer />} />
              <Route path="reports" element={<ReportGenerator />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;