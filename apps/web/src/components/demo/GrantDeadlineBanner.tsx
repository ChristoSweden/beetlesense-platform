import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, AlertCircle, ExternalLink } from 'lucide-react';

const GrantDeadlineBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const deadline = new Date('2026-04-04T23:59:59').getTime();
      const timeLeft = deadline - now.getTime();

      if (timeLeft <= 0) {
        setIsExpired(true);
        setIsVisible(false);
        localStorage.removeItem('grantBannerDismissed');
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      setDaysLeft(days);
      setHoursLeft(hours);
      setMinutesLeft(minutes);
    };

    // Check if banner was dismissed
    const wasDismissed = localStorage.getItem('grantBannerDismissed') === 'true';
    if (wasDismissed) {
      setIsVisible(false);
      return;
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('grantBannerDismissed', 'true');
  };

  if (!isVisible || isExpired) {
    return null;
  }

  const urgencyLevel = daysLeft <= 2 ? 'critical' : daysLeft <= 5 ? 'high' : 'normal';
  const bgClass = urgencyLevel === 'critical'
    ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-600/40'
    : urgencyLevel === 'high'
    ? 'bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-orange-600/40'
    : 'bg-gradient-to-r from-blue-900/30 to-emerald-900/30 border-blue-600/40';

  const accentColor = urgencyLevel === 'critical'
    ? 'text-red-400'
    : urgencyLevel === 'high'
    ? 'text-orange-400'
    : 'text-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`border-b ${bgClass} backdrop-blur-sm sticky top-0 z-40`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center gap-3 flex-wrap">
              {/* EU Flag Badge */}
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-5 rounded bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  EU
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    FORWARDS / ROB4GREEN Grant Application Window Open
                  </h3>
                  {urgencyLevel === 'critical' && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex-shrink-0"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    </motion.div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-1">
                  Up to <span className="font-semibold text-emerald-400">€60,000</span> for AI-powered forestry innovation.{' '}
                  <span className="text-white font-medium">BeetleSense is pre-qualified for this program.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 border border-gray-700/50`}>
              <Clock className={`w-4 h-4 ${accentColor} flex-shrink-0`} />
              <div className="text-xs sm:text-sm font-mono font-bold text-white whitespace-nowrap">
                <span className={accentColor}>
                  {daysLeft}d {hoursLeft}h {minutesLeft}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA and Dismiss - Second Row on Mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-0 sm:justify-between sm:mt-3">
          {/* CTA Links */}
          <div className="flex gap-2 flex-col xs:flex-row sm:flex-row">
            <a
              href="#grant-info"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded transition-colors"
            >
              Learn About the Grant
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="#grant-qualifications"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/20 text-xs sm:text-sm font-semibold rounded transition-colors"
            >
              See How BeetleSense Qualifies
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-2 hover:bg-gray-700/50 rounded transition-colors"
            aria-label="Dismiss grant notification"
            title="Dismiss this notification"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GrantDeadlineBanner;
