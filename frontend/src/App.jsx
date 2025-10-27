import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/global.css';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import MyEvents from './pages/MyEvents';
import MyBookings from './pages/MyBookings';
import EventBookings from './pages/EventBookings';
import Analytics from './pages/Analytics';
import PaymentPage from './pages/PaymentPage';
import BookingSuccess from './pages/BookingSuccess';
import TicketScanner from './pages/TicketScanner';
import Profile from './components/Profile';
import EventReports from './components/EventReports';

const App = () => {
  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen flex flex-col transition-colors duration-200 dark:bg-gray-900">
          <Navbar />
          <main className="container mx-auto px-4 py-8 flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Register />} />
              <Route
                path="/create-event"
                element={
                  <RoleRoute allowedRoles={['organizer']}>
                    <CreateEvent />
                  </RoleRoute>
                }
              />
              <Route
                path="/my-events"
                element={
                  <RoleRoute allowedRoles={['organizer']}>
                    <MyEvents />
                  </RoleRoute>
                }
              />
              <Route
                path="/event-bookings"
                element={
                  <RoleRoute allowedRoles={['organizer']}>
                    <EventBookings />
                  </RoleRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <RoleRoute allowedRoles={['organizer']}>
                    <Analytics />
                  </RoleRoute>
                }
              />
              <Route
                path="/my-bookings"
                element={
                  <RoleRoute allowedRoles={['participant']}>
                    <MyBookings />
                  </RoleRoute>
                }
              />
              <Route
                path="/payment/:bookingId"
                element={
                  <PrivateRoute>
                    <PaymentPage />
                  </PrivateRoute>
                }
              />
              <Route path="/booking/success/:bookingId" element={<BookingSuccess />} />
              <Route path="/scanner" element={<TicketScanner />} />
              <Route path="/profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route 
                path="/reports" 
                element={
                  <PrivateRoute>
                    <RoleRoute allowedRoles={['organizer']}>
                      <EventReports />
                    </RoleRoute>
                  </PrivateRoute>
                } 
              />
            </Routes>
          </main>
          <Footer />
          <ToastContainer 
            position="bottom-right"
            theme="colored"
            className="dark:text-gray-100"
          />
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
