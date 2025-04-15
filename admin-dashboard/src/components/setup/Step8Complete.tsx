import React from 'react';

interface Step8CompleteProps {
  onComplete: () => void;
}

/**
 * Final step of the setup wizard, instructing the user to refresh.
 */
const Step8Complete: React.FC<Step8CompleteProps> = ({ onComplete }) => {
  return (
    <div className="p-8 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-green-400 mb-6">🎉 Setup Complete! 🎉</h2>

      <div className="p-6 bg-gray-700 rounded-lg border border-gray-600 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Important Final Steps:</h3>

        <div className="mb-6 p-4 bg-yellow-900/50 border-2 border-yellow-600 rounded-lg text-yellow-200">
           <h4 className="font-bold text-lg mb-2">1. Refresh Required!</h4>
           <p className="text-base">
             After clicking the "Finish" button below, you <strong className='underline'>MUST refresh your browser page</strong> (press F5 or Ctrl+R/Cmd+R)
             to ensure all your new dashboard settings are loaded correctly.
           </p>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-lg text-gray-200 mb-2">2. Deploy Your Configuration:</h4>
          <p className="text-gray-300 mb-3">
            Remember to deploy the <code>dashboard-config.json</code> file you exported in the previous step:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-300">
            <li>Place the downloaded file in your project's <code>/public/</code> directory.</li>
            <li>Commit this file to your code repository (e.g., Git).</li>
            <li>Redeploy your dashboard application to your hosting provider (Vercel, Netlify, etc.).</li>
          </ol>
           <p className="mt-4 text-sm text-gray-400">
             This ensures all visitors see your configured dashboard instead of the setup wizard.
           </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-lg shadow-md"
        >
          Finish & Refresh Browser
        </button>
         <p className="mt-3 text-sm text-gray-500">(Remember to refresh after clicking!)</p>
      </div>
    </div>
  );
};

export default Step8Complete;