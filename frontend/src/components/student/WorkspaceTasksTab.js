import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Upload, ExternalLink, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkspaceTasksTab = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState('file');
  const [file, setFile] = useState(null);
  const [link, setLink] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchTasks();
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get(`${API}/workspaces`);
      setWorkspaces(response.data);
      if (response.data.length > 0) {
        setSelectedWorkspace(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedWorkspace) return;
    try {
      const response = await axios.get(`${API}/workspaces/${selectedWorkspace.id}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    }
  };

  const openSubmitDialog = (task) => {
    setSelectedTask(task);
    setSubmissionType('file');
    setFile(null);
    setLink('');
    setSubmitOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (submissionType === 'file' && file) {
        formData.append('file', file);
      } else if (submissionType === 'link' && link) {
        formData.append('link', link);
      } else {
        toast.error('Please provide a file or link');
        setSubmitting(false);
        return;
      }

      await axios.post(`${API}/tasks/${selectedTask.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Submission uploaded successfully!');
      setSubmitOpen(false);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          text: 'Approved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          badge: 'bg-green-500'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-5 h-5" />,
          text: 'Rejected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          badge: 'bg-red-500'
        };
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Pending Review',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          badge: 'bg-yellow-500'
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'Not Submitted',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          badge: 'bg-gray-500'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-gray-500">Join a workspace first to view and submit tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Workspace Selector */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tasks & Submissions</h2>
        <Select value={selectedWorkspace?.id} onValueChange={(id) => {
          const workspace = workspaces.find(w => w.id === id);
          setSelectedWorkspace(workspace);
        }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-500">Your teacher hasn't assigned any tasks yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const statusInfo = getStatusInfo(task.submission_status);
            const isOverdue = new Date(task.deadline) < new Date() && task.submission_status === 'not_submitted';
            
            return (
              <Card key={task.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <Badge className={statusInfo.badge}>{statusInfo.text}</Badge>
                      </div>
                      <CardDescription className="text-base">{task.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className={`${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          Deadline: {new Date(task.deadline).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Submission type: <span className="font-medium capitalize">{task.submission_type}</span>
                      </p>
                      {task.submitted_at && (
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(task.submitted_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    {(task.submission_status === 'not_submitted' || task.submission_status === 'rejected') && (
                      <Button 
                        onClick={() => openSubmitDialog(task)}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {task.submission_status === 'rejected' ? 'Resubmit' : 'Submit'}
                      </Button>
                    )}
                  </div>

                  {isOverdue && task.submission_status === 'not_submitted' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">This task is overdue!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Task</DialogTitle>
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Submission Type</Label>
              <Select value={submissionType} onValueChange={setSubmissionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">Upload File</SelectItem>
                  <SelectItem value="link">Submit Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {submissionType === 'file' ? (
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File (Max 10MB)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept={selectedTask?.submission_type === 'image' ? 'image/*' : '*'}
                  required
                />
                {file && (
                  <p className="text-sm text-gray-500">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="link-input">Submit Link</Label>
                <Input
                  id="link-input"
                  type="url"
                  placeholder="https://..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspaceTasksTab;
