/**
 * Weather Icons — simple inline SVG icons matching the dark green theme.
 * No external dependencies.
 */

import type { WeatherIconType } from '@/services/smhiService';

interface WeatherIconProps {
  type: WeatherIconType;
  size?: 24 | 32;
  className?: string;
}

export function WeatherIcon({ type, size = 24, className = '' }: WeatherIconProps) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: '0 0 32 32',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
  };

  switch (type) {
    case 'clear-day':
      return (
        <svg {...props}>
          {/* Sun */}
          <circle cx="16" cy="16" r="6" fill="#fbbf24" />
          {/* Rays */}
          <line x1="16" y1="3" x2="16" y2="7" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="25" x2="16" y2="29" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="16" x2="7" y2="16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="16" x2="29" y2="16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="7.1" y1="7.1" x2="9.9" y2="9.9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="22.1" y1="22.1" x2="24.9" y2="24.9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="7.1" y1="24.9" x2="9.9" y2="22.1" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="22.1" y1="9.9" x2="24.9" y2="7.1" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'clear-night':
      return (
        <svg {...props}>
          <path
            d="M22 16a10 10 0 01-10 10A10 10 0 0116 6a8 8 0 006 10z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <circle cx="24" cy="8" r="1" fill="#fbbf24" />
          <circle cx="26" cy="12" r="0.8" fill="#fbbf24" />
          <circle cx="22" cy="5" r="0.6" fill="#fbbf24" />
        </svg>
      );

    case 'partly-cloudy':
      return (
        <svg {...props}>
          {/* Sun behind */}
          <circle cx="22" cy="11" r="5" fill="#fbbf24" />
          <line x1="22" y1="2" x2="22" y2="5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="28" y1="11" x2="31" y2="11" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26.5" y1="6.5" x2="28.5" y2="4.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          {/* Cloud */}
          <path
            d="M8 26h16a6 6 0 00-2-11.7A7 7 0 009 17a5 5 0 00-1 9z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      );

    case 'cloudy':
      return (
        <svg {...props}>
          <path
            d="M8 25h16a6 6 0 00-2-11.7A7 7 0 009 16a5 5 0 00-1 9z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <path
            d="M14 20h12a4.5 4.5 0 00-1.5-8.8A5.3 5.3 0 0014.5 13 3.8 3.8 0 0014 20z"
            fill="#b0bec5"
            stroke="#cbd5e1"
            strokeWidth="0.5"
          />
        </svg>
      );

    case 'light-rain':
      return (
        <svg {...props}>
          {/* Cloud */}
          <path
            d="M7 20h16a5.5 5.5 0 00-1.8-10.7A6.5 6.5 0 008.5 12 4.5 4.5 0 007 20z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {/* Rain drops */}
          <line x1="11" y1="23" x2="10" y2="27" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="23" x2="15" y2="27" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="21" y1="23" x2="20" y2="27" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'heavy-rain':
      return (
        <svg {...props}>
          <path
            d="M7 18h16a5.5 5.5 0 00-1.8-10.7A6.5 6.5 0 008.5 10 4.5 4.5 0 007 18z"
            fill="#64748b"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <line x1="9" y1="21" x2="7" y2="27" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="21" x2="12" y2="27" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          <line x1="19" y1="21" x2="17" y2="27" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="21" x2="22" y2="27" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'snow':
      return (
        <svg {...props}>
          <path
            d="M7 20h16a5.5 5.5 0 00-1.8-10.7A6.5 6.5 0 008.5 12 4.5 4.5 0 007 20z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <circle cx="10" cy="24" r="1.2" fill="#e2e8f0" />
          <circle cx="16" cy="25" r="1.2" fill="#e2e8f0" />
          <circle cx="22" cy="24" r="1.2" fill="#e2e8f0" />
          <circle cx="13" cy="28" r="1" fill="#e2e8f0" />
          <circle cx="19" cy="28" r="1" fill="#e2e8f0" />
        </svg>
      );

    case 'thunder':
      return (
        <svg {...props}>
          <path
            d="M7 18h16a5.5 5.5 0 00-1.8-10.7A6.5 6.5 0 008.5 10 4.5 4.5 0 007 18z"
            fill="#64748b"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <polygon points="17,19 13,25 16,25 14,30 20,23 17,23 19,19" fill="#fbbf24" />
        </svg>
      );

    case 'fog':
      return (
        <svg {...props}>
          <line x1="6" y1="12" x2="26" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="16" x2="24" y2="16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="20" x2="26" y2="20" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="24" x2="22" y2="24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <path
            d="M8 25h16a6 6 0 00-2-11.7A7 7 0 009 16a5 5 0 00-1 9z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      );
  }
}
