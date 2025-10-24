import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, LogOut, Bell, Trophy, Users } from 'lucide-react';
import DepartmentUpdatesTab from '@/components/departmentAdmin/DepartmentUpdatesTab';
import LeaderboardTab from '@/components/departmentAdmin/LeaderboardTab';
import EventAttendanceTab from '@/components/departmentAdmin/EventAttendanceTab';

const DepartmentAdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'updates', label: 'Department Updates', icon: Bell, path: '/department-admin/updates' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/department-admin/leaderboard' },
    { id: 'attendance', label: 'Event Attendance', icon: Users, path: '/department-admin/attendance' }
  ];

  const activeTab = tabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'updates';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Department Admin Portal</h1>
                <p className="text-sm text-gray-600">{user.department || 'Department'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`
                    flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors
                    ${isActive 
                      ? 'border-purple-600 text-purple-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/department-admin/updates" replace />} />
          <Route path="/updates" element={<DepartmentUpdatesTab user={user} />} />
          <Route path="/leaderboard" element={<LeaderboardTab user={user} />} />
          <Route path="/attendance" element={<EventAttendanceTab user={user} />} />
        </Routes>
      </div>
    </div>
  );
};

export default DepartmentAdminDashboard;
