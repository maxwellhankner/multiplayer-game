import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HostRoomPage from './pages/HostRoomPage';
import GuestRoomPage from './pages/GuestRoomPage';
import { guestRoomPath, normalizeRoomCode } from '../shared/routes';
import './index.css';

function LegacyJoinRedirect() {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room');
  if (room) {
    return <Navigate to={guestRoomPath(normalizeRoomCode(room))} replace />;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/host/:code" element={<HostRoomPage />} />
        <Route path="/room/:code" element={<GuestRoomPage />} />

        {/* Legacy redirects */}
        <Route path="/host/setup" element={<Navigate to="/" replace />} />
        <Route path="/host" element={<Navigate to="/" replace />} />
        <Route path="/join" element={<LegacyJoinRedirect />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
