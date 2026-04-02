import React, { useMemo } from 'react';
import { Grid3x3, ExternalLink, ArrowRight, GitCommit, CheckCircle2 } from 'lucide-react';

interface AppCard {
  id: string;
  name: string;
  status: 'live' | 'development';
  url: string;
  demoPath?: string;
  stats: string[];
  tags: string[];
  description: string;
  countdownLabel?: string;
  countdownDays?: number;
}

interface CommitEntry {
  app: string;
  message: string;
  time: string;
  timestamp: Date;
}

const PortfolioDashboard: React.FC = () => {
  // App portfolio data
  const apps: AppCard[] = useMemo(() => {
    const today = new Date();
    const prsShutdown = new Date('2026-03-31');
    const daysToPrsShutdown = Math.ceil((prsShutdown.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return [
      {
        id: 'beetlesense',
        name: 'BeetleSense',
        status: 'live',
        url: 'https://beetlesense-platform-web.vercel.app',
        demoPath: '/demo',
        stats: ['3 Live Data Sources', '7-Day Forecast', 'Carbon Calculator'],
        tags: ['AI', 'Forestry', 'EU Grant'],
        description: 'Forest health intelligence powered by real-time data from SMHI, NASA FIRMS, and Skogsstyrelsen',
      },
      {
        id: 'pilot-speak',
        name: 'Pilot Speak 4.0',
        status: 'live',
        url: 'https://pilot-speak-4-0.vercel.app',
        stats: ['35+ Scenarios', 'AI Speech Scoring', 'Live ATC Feed'],
        tags: ['Aviation', 'EdTech', 'AI'],
        description: 'Aviation language training with real-time speech assessment and live ATC integration',
        countdownLabel: 'PRS Migration Window',
        countdownDays: daysToPrsShutdown > 0 ? daysToPrsShutdown : 0,
      },
      {
        id: 'gravity',
        name: 'Gravity @ Gummifabriken',
        status: 'live',
        url: 'https://gravity-gummifabriken.vercel.app',
        stats: ['Proximity Discovery', 'Live Pulse Feed', 'Icebreakers'],
        tags: ['Social', 'Networking', 'Location'],
        description: 'Real-time proximity networking and spontaneous discovery platform for live events',
      },
    ];
  }, []);

  // Recent commits (static list showing today's work)
  const recentCommits: CommitEntry[] = useMemo(() => [
    {
      app: 'BeetleSense',
      message: 'feat: add AI forest predictor, threat map, and carbon calculator to demo',
      time: '22:10',
      timestamp: new Date('2026-03-30T22:10:00'),
    },
    {
      app: 'BeetleSense',
      message: 'feat: add ForestWard Observatory carbon intelligence section for FORWARDS grant',
      time: '18:30',
      timestamp: new Date('2026-03-30T18:30:00'),
    },
    {
      app: 'BeetleSense',
      message: 'fix: update all SEO/OG references to use live Vercel URL',
      time: '15:45',
      timestamp: new Date('2026-03-30T15:45:00'),
    },
    {
      app: 'Pilot Speak 4.0',
      message: 'feat: add 35 aviation scenarios with live ATC integration',
      time: '12:20',
      timestamp: new Date('2026-03-30T12:20:00'),
    },
    {
      app: 'Gravity @ Gummifabriken',
      message: 'feat: implement proximity-based networking with live pulse feed',
      time: '09:15',
      timestamp: new Date('2026-03-30T09:15:00'),
    },
  ], []);

  // Portfolio summary stats
  const portfolioStats = useMemo(() => ({
    totalApps: apps.length,
    totalFeatures: apps.reduce((sum, app) => sum + app.stats.length, 0),
    allLive: apps.every(app => app.status === 'live'),
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'PostgreSQL', 'Vercel'],
  }), [apps]);

  const _formatTime = (date: Date): string => {
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-900 bg-gray-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Grid3x3 className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold text-white">ChristoSweden App Portfolio</h1>
          </div>
          <p className="text-gray-400">Unified analytics across all live applications</p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* App Cards Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Live Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="group relative rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
              >
                {/* Status indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-medium text-green-400">Live</span>
                  </div>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* App title and URL */}
                <h3 className="text-xl font-bold text-white mb-1">{app.name}</h3>
                <p className="text-xs text-gray-500 mb-4 truncate">{app.url}</p>

                {/* Description */}
                <p className="text-sm text-gray-300 mb-4 line-clamp-2">{app.description}</p>

                {/* Stats */}
                <div className="space-y-2 mb-6">
                  {app.stats.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>{stat}</span>
                    </div>
                  ))}
                </div>

                {/* Countdown (if applicable) */}
                {app.countdownLabel && app.countdownDays !== undefined && (
                  <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="text-xs font-medium text-amber-300 mb-1">{app.countdownLabel}</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {app.countdownDays > 0 ? `${app.countdownDays} days` : 'Deadline reached'}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {app.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-3 py-1 rounded-full bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA Button */}
                <a
                  href={app.demoPath ? app.demoPath : app.url}
                  target={app.demoPath ? '_self' : '_blank'}
                  rel={app.demoPath ? '' : 'noopener noreferrer'}
                  className="inline-flex items-center gap-2 w-full justify-center rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 transition-colors duration-200"
                >
                  {app.demoPath ? 'View Demo' : 'Open App'}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio Summary */}
        <section className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-8">
          <h2 className="text-2xl font-bold text-white mb-8">Portfolio Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="text-4xl font-bold text-green-400">{portfolioStats.totalApps}</div>
              <p className="text-sm text-gray-400 mt-1">Live Applications</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">{portfolioStats.totalFeatures}</div>
              <p className="text-sm text-gray-400 mt-1">Total Features</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400">3</div>
              <p className="text-sm text-gray-400 mt-1">Data Integrations</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400">{recentCommits.length}</div>
              <p className="text-sm text-gray-400 mt-1">Today's Commits</p>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Technology Stack</h3>
            <div className="flex flex-wrap gap-2">
              {portfolioStats.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm font-medium text-gray-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Built by note */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-400 italic">
              Built by a solo developer with AI-powered agent teams. All apps deployed on Vercel with continuous integration and real-time data feeds.
            </p>
          </div>
        </section>

        {/* Recent Activity Feed */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-3">
            {recentCommits.map((commit, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  <GitCommit className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{commit.app}</span>
                      <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">
                        {commit.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 break-words">{commit.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PortfolioDashboard;
