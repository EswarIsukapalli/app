import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserCheck, Calendar, Users, Search } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EventAttendanceTab = ({ user }) => {
  const [updates, setUpdates] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/department-updates`);
      // Filter only events (with event_date)
      const events = response.data.filter(u => u.event_date);
      setUpdates(events);
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      // This would need a new API endpoint to get all students in department
      // For now, we'll get students who are interested/attending
      const attendingIds = [...new Set([
        ...(selectedUpdate?.interested_users || []),
        ...(selectedUpdate?.attending_users || [])
      ])];
      
      // In a real implementation, you'd have an endpoint to get all department students
      // For now, we'll create a placeholder
      setStudents([]);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleOpenDialog = (update) => {
    setSelectedUpdate(update);
    setSelectedStudents([]);
    setSearchQuery('');
    setDialogOpen(true);
    fetchStudents();
  };

  const handleMarkAttendance = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API}/leaderboard/mark-attendance/${selectedUpdate.id}`, selectedStudents);
      toast.success(`Attendance marked for ${selectedStudents.length} student(s)`);
      setDialogOpen(false);
      setSelectedStudents([]);
      fetchUpdates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Event Attendance</h2>
        <p className="text-gray-600 mt-1">Mark attendance for events to award leaderboard points</p>
      </div>

      {/* Events List */}
      {loading && updates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : updates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No events found</p>
            <p className="text-sm text-gray-500 mt-1">Create events with dates in Department Updates</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {updates.map((update) => {
            const eventDate = new Date(update.event_date);
            const isPast = eventDate < new Date();
            
            return (
              <Card key={update.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryColor(update.category)}>
                          {update.category}
                        </Badge>
                        {isPast ? (
                          <Badge className="bg-gray-100 text-gray-800">Past Event</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Upcoming</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{update.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {update.description}
                      </CardDescription>
                    </div>
                    <Dialog open={dialogOpen && selectedUpdate?.id === update.id} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => handleOpenDialog(update)}
                          className="gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                          <UserCheck className="w-4 h-4" />
                          Mark Attendance
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Mark Attendance - {update.title}</DialogTitle>
                          <DialogDescription>
                            Select students who attended this event to award them points (+20 points)
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Search and Select All */}
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                              <Input
                                placeholder="Search students by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                            {students.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedStudents.length === students.length}
                                  onCheckedChange={toggleAllStudents}
                                />
                                <label className="text-sm font-medium cursor-pointer" onClick={toggleAllStudents}>
                                  Select All ({students.length} students)
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Student List */}
                          <div className="border rounded-lg max-h-96 overflow-y-auto">
                            {students.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                <p>No students available</p>
                                <p className="text-sm mt-1">Students need to join your department first</p>
                              </div>
                            ) : filteredStudents.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <p>No students found matching "{searchQuery}"</p>
                              </div>
                            ) : (
                              <div className="divide-y">
                                {filteredStudents.map((student) => (
                                  <div
                                    key={student.id}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => toggleStudent(student.id)}
                                  >
                                    <Checkbox
                                      checked={selectedStudents.includes(student.id)}
                                      onCheckedChange={() => toggleStudent(student.id)}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{student.name}</div>
                                      <div className="text-sm text-gray-500">{student.email}</div>
                                    </div>
                                    {student.section && (
                                      <Badge variant="outline">Section {student.section}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-gray-600">
                              {selectedStudents.length} student(s) selected
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleMarkAttendance}
                                disabled={loading || selectedStudents.length === 0}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {loading ? 'Marking...' : 'Mark Attendance'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {eventDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-purple-600 font-medium">
                          {update.interested_count || 0} interested
                        </span>
                        <span className="text-green-600 font-medium">
                          {update.attending_count || 0} attending
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">How Attendance Works</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Mark attendance for students who attended events</li>
                <li>• Each attendance awards +20 points to the student's leaderboard</li>
                <li>• Points are automatically calculated and rankings updated</li>
                <li>• Attendance can be marked for both past and upcoming events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventAttendanceTab;
