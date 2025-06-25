import React from 'react';
import { BarChart3 } from 'lucide-react';

const ManagerLogin = ({ state, updateState, handleManagerLogin, Button }) => {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Manager Login</h2>
          <p className="text-gray-600">Access management dashboard</p>
        </div>
        
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
            {state.error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter manager password"
            value={state.managerPassword}
            onChange={(e) => updateState({ managerPassword: e.target.value })}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            onKeyPress={(e) => e.key === 'Enter' && handleManagerLogin(e)}
          />
          <Button 
            onClick={handleManagerLogin} 
            disabled={state.loading} 
            className="w-full" 
            size="lg"
          >
            {state.loading ? 'Logging in...' : 'Login'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;