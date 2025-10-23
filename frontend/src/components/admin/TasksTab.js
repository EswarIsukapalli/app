import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    deadline: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await axios.post(`${API}/tasks`, taskData);
      toast.success('Assignment created and notifications sent!');
      setDialogOpen(false);
      setTaskData({ title: '', description: '', deadline: '' });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const viewCompletions = async (taskId) => {
    try {
      const response = await axios.get(`${API}/tasks/${taskId}/completions`);
      setSelectedTask(response.data);
    } catch (error) {
      toast.error('Failed to fetch completion status');
    }
  };

  return (
    <div data-testid="tasks-section">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Assignments</h2>
          <p className="text-gray-600 mt-1">Create tasks and track student progress</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Students will be notified via email about the new assignment
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  data-testid="task-title"
                  placeholder="e.g., Week 1 Assignment"
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  data-testid="task-description"
                  placeholder="Assignment details and requirements..."
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Deadline</Label>
                <Input
                  id="task-deadline"
                  data-testid="task-deadline"
                  type="datetime-local"
                  value={taskData.deadline}
                  onChange={(e) => setTaskData({ ...taskData, deadline: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                data-testid="create-task-submit-btn"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create & Notify Students'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No assignments created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="card-hover" data-testid={`task-${task.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription className="mt-2">{task.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(task.deadline), 'PPP')}
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => viewCompletions(task.id)}
                        data-testid={`view-completions-${task.id}`}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Progress
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Assignment Progress</DialogTitle>
                        <DialogDescription>{selectedTask?.task.title}</DialogDescription>
                      </DialogHeader>
                      {selectedTask && (
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="flex-1 p-4 bg-green-50 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 mb-1">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-semibold">Completed</span>
                              </div>
                              <div className="text-2xl font-bold text-green-900">
                                {selectedTask.completed_count}
                              </div>
                            </div>
                            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 text-gray-700 mb-1">
                                <Users className="w-5 h-5" />
                                <span className="font-semibold">Total Students</span>
                              </div>
                              <div className="text-2xl font-bold text-gray-900">
                                {selectedTask.total_students}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-3">Students who completed:</h4>
                            {selectedTask.completions.length === 0 ? (
                              <p className="text-gray-500 text-sm">No completions yet</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {selectedTask.completions.map((completion) => (
                                  <div
                                    key={completion.id}
                                    data-testid={`completion-${completion.student_id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      <span className="font-medium">{completion.student_name}</span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {format(new Date(completion.completed_at), 'PPp')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksTab;