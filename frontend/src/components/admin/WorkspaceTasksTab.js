import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar, Users, CheckCircle2, XCircle, FileText, ExternalLink, Image, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkspaceTasksTab = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    deadline: '',
    submission_type: 'any'
  });

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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedWorkspace) {
      toast.error('Please select a workspace');
      return;
    }
    setCreating(true);

    try {
      const payload = {
        ...taskData,
        workspace_id: selectedWorkspace.id
      };
      await axios.post(`${API}/workspaces/${selectedWorkspace.id}/tasks`, payload);
      toast.success('Task created successfully!');
      setDialogOpen(false);
      setTaskData({ title: '', description: '', deadline: '', submission_type: 'any' });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const viewSubmissions = async (task) => {
    setSelectedTask(task);
    setSubmissionsOpen(true);
    try {
      const response = await axios.get(`${API}/tasks/${task.id}/submissions`);
      setSubmissions(response.data);
    } catch (error) {
      toast.error('Failed to fetch submissions');
    }
  };

  const handleReview = (submission) => {
    setSelectedSubmission(submission);
    setReviewComment('');
    setReviewOpen(true);
  };

  const submitReview = async (status) => {
    try {
      await axios.post(`${API}/submissions/${selectedSubmission.id}/review`, {
        status,
        comment: reviewComment
      });
      toast.success(`Submission ${status}!`);
      setReviewOpen(false);
      viewSubmissions(selectedTask);
    } catch (error) {
      toast.error('Failed to review submission');
    }
  };

  const getSubmissionTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'file': return <File className="w-4 h-4" />;
      case 'link': return <ExternalLink className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-gray-500">Create a workspace first to manage tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Workspace Selector */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a task for {selectedWorkspace?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  placeholder="e.g., Coding Contest Submission"
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description *</Label>
                <Textarea
                  id="task-description"
                  placeholder="Task details..."
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission-type">Submission Type *</Label>
                <Select value={taskData.submission_type} onValueChange={(value) => setTaskData({ ...taskData, submission_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any (File or Link)</SelectItem>
                    <SelectItem value="image">Image Only</SelectItem>
                    <SelectItem value="file">File Only</SelectItem>
                    <SelectItem value="link">Link Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Deadline *</Label>
                <Input
                  id="task-deadline"
                  type="datetime-local"
                  value={taskData.deadline}
                  onChange={(e) => setTaskData({ ...taskData, deadline: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-500 mb-4">Create your first task to get started</p>
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <CardDescription className="mt-2">{task.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getSubmissionTypeIcon(task.submission_type)}
                    <span className="text-sm text-gray-500 capitalize">{task.submission_type}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.deadline).toLocaleString()}
                    </div>
                  </div>
                  <Button onClick={() => viewSubmissions(task)} variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    View Submissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submissions Dialog */}
      <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.task?.title || 'Task Submissions'}</DialogTitle>
            <DialogDescription>
              {submissions.total_students} students | {submissions.submitted_count} submitted | 
              {' '}{submissions.approved_count} approved | {submissions.rejected_count} rejected | 
              {' '}{submissions.pending_count} pending
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {submissions.submissions?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No submissions yet</p>
              </div>
            ) : (
              submissions.submissions?.map((submission) => (
                <Card key={submission.id} className="border-l-4" style={{
                  borderLeftColor: submission.status === 'approved' ? '#22c55e' : 
                                 submission.status === 'rejected' ? '#ef4444' : '#eab308'
                }}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-lg">{submission.student_name}</p>
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                          Submitted: {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                        
                        {submission.submission_type === 'file' && submission.file_path && (
                          <div className="mb-3">
                            <a 
                              href={`${BACKEND_URL}${submission.file_path}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-indigo-600 hover:underline"
                            >
                              <File className="w-4 h-4" />
                              View Submitted File
                            </a>
                          </div>
                        )}
                        
                        {submission.submission_type === 'link' && submission.link && (
                          <div className="mb-3">
                            <a 
                              href={submission.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-indigo-600 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                              {submission.link}
                            </a>
                          </div>
                        )}
                        
                        {submission.review_comment && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <strong>Review Comment:</strong> {submission.review_comment}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {submission.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleReview(submission)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Review submission from {selectedSubmission?.student_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-comment">Comment (optional)</Label>
              <Textarea
                id="review-comment"
                placeholder="Add feedback for the student..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-red-600 hover:bg-red-50"
              onClick={() => submitReview('rejected')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => submitReview('approved')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspaceTasksTab;
