import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Users, Copy, Check, FolderOpen, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WorkspacesTab = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: ''
  });

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await axios.get(`${API}/workspaces`);
      setWorkspaces(response.data);
    } catch (error) {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/workspaces`, formData);
      setWorkspaces([...workspaces, response.data]);
      setCreateOpen(false);
      setFormData({ name: '', description: '', subject: '' });
      toast.success('Workspace created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace');
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const viewMembers = async (workspace) => {
    setSelectedWorkspace(workspace);
    setMembersOpen(true);
    try {
      const response = await axios.get(`${API}/workspaces/${workspace.id}/members`);
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to load members');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Workspaces</h2>
          <p className="text-gray-500 mt-1">Manage your class workspaces and share invite codes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a workspace for your class or subject. Students can join using the invite code.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., MCA Semester 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Data Structures"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Workspace description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Workspace</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No workspaces yet</h3>
            <p className="text-gray-500 mb-4">Create your first workspace to get started</p>
            <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{workspace.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewMembers(workspace)}
                    className="flex items-center gap-1 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    {workspace.member_count || 0}
                  </Button>
                </CardTitle>
                {workspace.subject && (
                  <CardDescription className="text-indigo-600 font-medium">
                    {workspace.subject}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm line-clamp-2">{workspace.description}</p>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200">
                  <Label className="text-xs text-gray-600 mb-1 block">Invite Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded font-mono text-lg font-bold text-indigo-600 border border-indigo-200">
                      {workspace.invite_code}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyInviteCode(workspace.invite_code)}
                      className="shrink-0"
                    >
                      {copiedCode === workspace.invite_code ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Members Dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workspace Members</DialogTitle>
            <DialogDescription>
              {selectedWorkspace?.name} - {members.length} member(s)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No students have joined yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.student_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{member.student_name}</p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspacesTab;
