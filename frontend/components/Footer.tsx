'use client';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a3a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold gradient-text mb-4">Prophet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyze Polymarket wallet trading history and get personalized market recommendations.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Polymarket
                </a>
              </li>
              <li>
                <a href="https://docs.domeapi.io" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  DomeAPI Docs
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">About</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Built for analyzing prediction market trading patterns and providing intelligent market recommendations.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Prophet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
