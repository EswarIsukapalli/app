import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Heart, Users, Tag, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ['All', 'Workshop', 'Sports', 'Club', 'Announcement', 'General'];

const DepartmentFeedTab = ({ user }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    fetchUpdates();
    fetchUpcomingEvents();
  }, [selectedCategory]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      const response = await axios.get(`${API}/department-updates`, { params });
      setUpdates(response.data);
    } catch (error) {
      toast.error('Failed to fetch updates');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await axios.get(`${API}/department-updates/calendar`);
      const now = new Date();
      const upcoming = response.data.filter(event => 
        new Date(event.event_date) > now
      ).slice(0, 5);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Failed to fetch upcoming events');
    }
  };

  const handleInterest = async (updateId, action) => {
    try {
      const response = await axios.post(`${API}/department-updates/${updateId}/interest?action=${action}`);
      toast.success(response.data.marked ? `Marked as ${action}!` : `Unmarked as ${action}`);
      fetchUpdates();
      fetchUpcomingEvents();
    } catch (error) {
      toast.error('Failed to update interest');
    }
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

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Updates</h2>
          <p className="text-gray-600 mt-1">Stay updated with events and announcements</p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {loading && updates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading updates...</p>
            </div>
          ) : updates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No updates available</p>
                <p className="text-sm text-gray-500 mt-1">Check back later for new announcements</p>
              </CardContent>
            </Card>
          ) : (
            updates.map((update) => {
              const isEvent = !!update.event_date;
              const eventDate = isEvent ? new Date(update.event_date) : null;
              const isPast = isEvent && eventDate < new Date();
              
              return (
                <Card key={update.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getCategoryColor(update.category)}>
                            {update.category}
                          </Badge>
                          {isEvent && (
                            <Badge variant={isPast ? "outline" : "default"} className="gap-1">
                              <Calendar className="w-3 h-3" />
                              {isPast ? 'Past Event' : formatEventDate(update.event_date)}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl">{update.title}</CardTitle>
                        <CardDescription className="mt-2 text-base">
                          {update.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        {isEvent && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {eventDate.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                        <span className="text-purple-600">
                          {update.interested_count} interested
                        </span>
                        <span className="text-green-600">
                          {update.attending_count} attending
                        </span>
                      </div>
                      {isEvent && !isPast && (
                        <div className="flex gap-2">
                          <Button
                            variant={update.is_interested ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInterest(update.id, 'interested')}
                            className="gap-1"
                          >
                            <Heart className={`w-4 h-4 ${update.is_interested ? 'fill-current' : ''}`} />
                            Interested
                          </Button>
                          <Button
                            variant={update.is_attending ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInterest(update.id, 'attending')}
                            className={`gap-1 ${update.is_attending ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            <Users className="w-4 h-4" />
                            Attending
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      Posted by {update.created_by_name} • {new Date(update.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 rounded-lg flex flex-col items-center justify-center text-white">
                          <div className="text-xs font-medium">
                            {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-lg font-bold leading-none">
                            {new Date(event.event_date).getDate()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge className={`${getCategoryColor(event.category)} mb-1`} size="sm">
                            {event.category}
                          </Badge>
                          <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                            {event.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {new Date(event.event_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DepartmentFeedTab;
