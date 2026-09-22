import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';
import { shortenAddress, useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { account, isConnected, isLoading, error, connectWallet } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const walletLabel = isLoading
    ? 'Connecting...'
    : isConnected
      ? shortenAddress(account)
      : 'Connect';

  const handleMobileConnect = async () => {
    await connectWallet();
    setIsOpen(false);
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Properties', href: '/properties' },
    { name: 'About', href: '/about' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Blog', href: '/blog' },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="container">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <svg width="30" height="35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="15" cy="20" r="10" stroke="#0682ff"/>
                  <circle cx="15" cy="20" r="6" stroke="#0682ff" strokeWidth="3"/>
              </svg>  
              <span className="text-2xl font-bold text-primary-600 mt-1.5">RentVerse</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium"
              >
                {item.name}
              </Link>
            ))}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-secondary-100 rounded-md"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <button
              className="btn"
              type="button"
              onClick={connectWallet}
              disabled={isLoading || isConnected}
              title={isConnected ? account : 'Connect MetaMask wallet'}
            >
              {walletLabel}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-secondary-600 hover:text-primary-600 rounded-md"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FiSun size={22} /> : <FiMoon size={22} />}
            </button>
            <button
              type="button"
              className="text-secondary-600 hover:text-primary-600"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-base font-medium text-secondary-600 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <button
                className="block px-3 py-2 text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
                type="button"
                onClick={handleMobileConnect}
                disabled={isLoading || isConnected}
                title={isConnected ? account : 'Connect MetaMask wallet'}
              >
                {walletLabel}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="pb-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
