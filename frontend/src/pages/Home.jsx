import { Link } from 'react-router-dom';
import { FaCalendar, FaTicketAlt, FaUsers, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-primary-800/90"></div>
          <div className="absolute inset-0 bg-pattern opacity-10"></div>
        </div>
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn">
              {user ? (
                user.role === 'organizer' ? 
                'Welcome Back, Event Organizer!' :
                'Welcome Back to Occasion Hub!'
              ) : (
                'Discover and Book Amazing Events'
              )}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 animate-fadeIn animation-delay-200">
              {user ? (
                user.role === 'organizer' ?
                'Manage your events and track your bookings all in one place.' :
                'Find and book your next amazing experience.'
              ) : (
                'Find the perfect event for you, from concerts to conferences and everything in between.'
              )}
            </p>
            {user ? (
              <div className="flex justify-center gap-4">
                {user.role === 'organizer' ? (
                  <>
                    <Link 
                      to="/create-event" 
                      className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeIn animation-delay-400"
                    >
                      Create Event
                    </Link>
                    <Link 
                      to="/my-events" 
                      className="inline-block bg-primary-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeIn animation-delay-400"
                    >
                      My Events
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/events" 
                      className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeIn animation-delay-400"
                    >
                      Browse Events
                    </Link>
                    <Link 
                      to="/my-bookings" 
                      className="inline-block bg-primary-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeIn animation-delay-400"
                    >
                      My Bookings
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <Link 
                to="/events" 
                className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeIn animation-delay-400"
              >
                Browse Events
              </Link>
            )}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            Why Choose Occasion Hub?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="feature-card group">
              <div className="feature-icon-wrapper">
                <FaCalendar className="feature-icon" />
              </div>
              <h3 className="feature-title">Easy Event Creation</h3>
              <p className="feature-description">
                Create and manage your events with our intuitive interface
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card group">
              <div className="feature-icon-wrapper">
                <FaTicketAlt className="feature-icon" />
              </div>
              <h3 className="feature-title">Simple Booking</h3>
              <p className="feature-description">
                Book tickets in seconds with our streamlined process
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card group">
              <div className="feature-icon-wrapper">
                <FaUsers className="feature-icon" />
              </div>
              <h3 className="feature-title">Community Driven</h3>
              <p className="feature-description">
                Connect with event organizers and attendees
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card group">
              <div className="feature-icon-wrapper">
                <FaLock className="feature-icon" />
              </div>
              <h3 className="feature-title">Secure Platform</h3>
              <p className="feature-description">
                Your data and transactions are always protected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Host Your Event?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of successful event organizers on our platform
            </p>
            <Link 
              to="/signup" 
              className="inline-block bg-white text-primary-600 px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 