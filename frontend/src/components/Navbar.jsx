import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaSignInAlt, FaSignOutAlt, FaUserPlus, FaCalendarAlt, FaUser, FaSun, FaMoon, FaPlus, FaChartLine, FaUserCircle, FaChartBar } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <nav className="bg-white shadow-md dark:bg-gray-800 transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FaCalendarAlt className="text-primary-600 text-2xl dark:text-primary-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white transition-colors">
              Occasion Hub
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <FaSun className="text-yellow-400 text-xl" />
              ) : (
                <FaMoon className="text-gray-600 text-xl" />
              )}
            </button>

            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="nav-link flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
                >
                  <FaUserCircle className="mr-1" />
                  Profile
                </Link>

                {user.role === 'organizer' ? (
                  <>
                    <Link
                      to="/create-event"
                      className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Create Event
                    </Link>
                    <Link
                      to="/my-events"
                      className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Events
                    </Link>
                    <Link
                      to="/reports"
                      className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Reports
                    </Link>
                    <Link to="/event-bookings" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                      <FaUser className="inline mr-1" />
                      Event Bookings
                    </Link>
                    <Link to="/analytics" className="nav-link">
                      <FaChartLine className="mr-1" />
                      Analytics
                    </Link>
                  </>
                ) : (
                  <Link to="/my-bookings" className="nav-link">
                    <FaUser className="mr-1" />
                    My Bookings
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="nav-link text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500"
                >
                  <FaSignOutAlt className="mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  <FaSignInAlt className="mr-1" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-primary"
                >
                  <FaUserPlus className="mr-1" />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 