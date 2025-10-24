import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BookOpen, ClipboardList, LogOut, Download, CheckCircle2, Circle, Calendar, FolderOpen, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import WorkspaceJoinTab from '@/components/student/WorkspaceJoinTab';
import WorkspaceTasksTab from '@/components/student/WorkspaceTasksTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentDashboard = ({ user, onLogout }) => {
  const location = useLocation();
  const [materials, setMaterials] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentTab = location.pathname.includes('/tasks') ? 'tasks' : 'materials';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [materialsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/materials`),
        axios.get(`${API}/tasks`)
      ]);
      setMaterials(materialsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId, completed) => {
    try {
      if (completed) {
        await axios.delete(`${API}/tasks/${taskId}/complete`);
        toast.success('Task marked as incomplete');
      } else {
        await axios.post(`${API}/tasks/${taskId}/complete`);
        toast.success('Task marked as complete!');
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update task');
    }
  };

  const navItems = [
    { path: '/student', label: 'Workspaces', icon: FolderOpen },
    { path: '/student/tasks', label: 'Tasks & Submissions', icon: FileCheck },
    { path: '/student/materials', label: 'Materials', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">StudyHub</h1>
                <p className="text-xs text-gray-500">Welcome, {user.name}</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              data-testid="logout-btn"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<WorkspaceJoinTab />} />
          <Route path="/tasks" element={<WorkspaceTasksTab />} />
          <Route
            path="/materials"
            element={
              <div data-testid="materials-section">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Learning Materials</h2>
                  <p className="text-gray-600 mt-1">Access lecture notes and video tutorials</p>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : materials.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No materials available yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((material) => (
                      <Card key={material.id} className="card-hover" data-testid={`material-${material.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Badge
                                variant="secondary"
                                className={material.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                              >
                                {material.type === 'video' ? '🎥 Video' : '📄 Note'}
                              </Badge>
                              <CardTitle className="mt-2">{material.title}</CardTitle>
                            </div>
                          </div>
                          <CardDescription>
                            {material.filename}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            className="w-full bg-teal-600 hover:bg-teal-700"
                            onClick={() => window.open(`${BACKEND_URL}${material.file_path}`, '_blank')}
                            data-testid={`download-material-${material.id}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;