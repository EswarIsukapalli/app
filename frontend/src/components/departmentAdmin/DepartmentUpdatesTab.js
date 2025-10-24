import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Calendar, Trash2, Users, Tag } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ['Workshop', 'Sports', 'Club', 'Announcement', 'General'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const DepartmentUpdatesTab = ({ user }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    event_date: '',
    visible_to_sections: []
  });

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/department-updates`);
      setUpdates(response.data);
    } catch (error) {
      toast.error('Failed to fetch updates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${API}/department-updates`, formData);
      toast.success('Update posted successfully!');
      setDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'General',
        event_date: '',
        visible_to_sections: []
      });
      fetchUpdates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post update');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (updateId) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return;
    
    try {
      await axios.delete(`${API}/department-updates/${updateId}`);
      toast.success('Update deleted successfully');
      fetchUpdates();
    } catch (error) {
      toast.error('Failed to delete update');
    }
  };

  const toggleSection = (section) => {
    setFormData(prev => ({
      ...prev,
      visible_to_sections: prev.visible_to_sections.includes(section)
        ? prev.visible_to_sections.filter(s => s !== section)
        : [...prev.visible_to_sections, section]
    }));
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Workshop': 'bg-blue-100 text-blue-800 border-blue-300',
      'Sports': 'bg-green-100 text-green-800 border-green-300',
      'Club': 'bg-purple-100 text-purple-800 border-purple-300',
      'Announcement': 'bg-orange-100 text-orange-800 border-orange-300',
      'General': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[category] || colors['General'];
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Updates</h2>
          <p className="text-gray-600 mt-1">Manage announcements and events for your department</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4" />
              Create Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Department Update</DialogTitle>
              <DialogDescription>
                Post announcements, events, or updates for your department
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Tech Workshop on AI"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide detailed information about the update..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_date">Event Date (Optional)</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visible to Sections (Leave empty for all)</Label>
                <div className="flex gap-2">
                  {SECTIONS.map(section => (
                    <Button
                      key={section}
                      type="button"
                      variant={formData.visible_to_sections.includes(section) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSection(section)}
                      className={formData.visible_to_sections.includes(section) ? "bg-purple-600" : ""}
                    >
                      Section {section}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Select specific sections or leave empty to show to all students
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                  {loading ? 'Posting...' : 'Post Update'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Updates List */}
      {loading && updates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading updates...</p>
        </div>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No updates posted yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Create Update" to post your first announcement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {updates.map((update) => (
            <Card key={update.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(update.category)}>
                        {update.category}
                      </Badge>
                      {update.visible_to_sections && update.visible_to_sections.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {update.visible_to_sections.join(', ')}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{update.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {update.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(update.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    {update.event_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(update.event_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-purple-600 font-medium">
                        {update.interested_count || 0} interested
                      </span>
                      <span className="text-green-600 font-medium">
                        {update.attending_count || 0} attending
                      </span>
                    </div>
                  </div>
                  <span className="text-xs">
                    Posted {new Date(update.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentUpdatesTab;
