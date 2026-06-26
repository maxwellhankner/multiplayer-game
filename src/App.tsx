import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HostPage from './pages/HostPage';
import JoinPage from './pages/JoinPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HostPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
