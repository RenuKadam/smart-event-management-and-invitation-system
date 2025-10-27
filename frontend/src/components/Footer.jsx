import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCalendarAlt, FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FaCalendarAlt className="text-primary-500 text-2xl" />
              <span className="text-xl font-bold text-white">Occasion Hub</span>
            </div>
            <p className="text-gray-400">
              Making event management and booking seamless and enjoyable for everyone.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">
                <FaFacebook className="text-xl" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">
                <FaTwitter className="text-xl" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">
                <FaInstagram className="text-xl" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">
                <FaLinkedin className="text-xl" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/events" className="hover:text-primary-500 transition-colors">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link to="/create-event" className="hover:text-primary-500 transition-colors">
                  Create Event
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-primary-500 transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/my-events" className="hover:text-primary-500 transition-colors">
                  My Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <FaMapMarkerAlt className="text-primary-500" />
                <span>123 Event Street, City, Country</span>
              </li>
              <li className="flex items-center space-x-2">
                <FaPhone className="text-primary-500" />
                <span>+1 234 567 8900</span>
              </li>
              <li className="flex items-center space-x-2">
                <FaEnvelope className="text-primary-500" />
                <span>support@occasionhub.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Newsletter</h3>
            <p className="text-gray-400 mb-4">
              Subscribe to our newsletter for updates and exclusive offers.
            </p>
            <form className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © {currentYear} Occasion Hub. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy" className="hover:text-primary-500 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-primary-500 transition-colors">
                Terms of Service
              </Link>
              <Link to="/faq" className="hover:text-primary-500 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 