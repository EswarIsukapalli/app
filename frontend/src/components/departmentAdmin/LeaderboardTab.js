import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, TrendingUp, TrendingDown, Medal, Target, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SECTIONS = ['All', 'A', 'B', 'C', 'D'];

const LeaderboardTab = ({ user }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('All');
  const [topPerformers, setTopPerformers] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSection]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = {
        department: user.department,
        limit: 100
      };
      if (selectedSection !== 'All') {
        params.section = selectedSection;
      }
      
      const response = await axios.get(`${API}/leaderboard`, { params });
      setLeaderboard(response.data);
      
      // Get top 10 for special display
      const top10Response = await axios.get(`${API}/leaderboard/top-performers`, {
        params: { department: user.department }
      });
      setTopPerformers(top10Response.data);
    } catch (error) {
      toast.error('Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const getRankChangeIndicator = (rankChange) => {
    if (rankChange > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">+{rankChange}</span>
        </div>
      );
    } else if (rankChange < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">{rankChange}</span>
        </div>
      );
    }
    return <span className="text-sm text-gray-400">-</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Leaderboard</h2>
          <p className="text-gray-600 mt-1">Track student performance and engagement</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by section:</span>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map(section => (
                <SelectItem key={section} value={section}>
                  {section === 'All' ? 'All Sections' : `Section ${section}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Performers */}
      {topPerformers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.slice(0, 3).map((student, idx) => {
            const colors = [
              'from-yellow-400 to-yellow-600',
              'from-gray-300 to-gray-500',
              'from-amber-500 to-amber-700'
            ];
            return (
              <Card key={student.id} className={`bg-gradient-to-br ${colors[idx]} text-white`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Trophy className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Rank {student.rank}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-2">{student.user_name}</CardTitle>
                  {student.section && (
                    <CardDescription className="text-white/80">
                      Section {student.section}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-90">Total Points</span>
                      <span className="text-2xl font-bold">{student.total_points}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="opacity-75">Tasks</div>
                        <div className="font-semibold">{student.tasks_completed}</div>
                      </div>
                      <div>
                        <div className="opacity-75">Events</div>
                        <div className="font-semibold">{student.events_attended}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>All Rankings</CardTitle>
          <CardDescription>
            Complete leaderboard for {selectedSection === 'All' ? 'all sections' : `Section ${selectedSection}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No rankings available yet</p>
              <p className="text-sm text-gray-500 mt-1">Students will appear here once they start completing tasks</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Section</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Points</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Tasks</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Events</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Completion %</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center w-10">
                          {getRankBadge(student.rank)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{student.user_name}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">
                          {student.section || '-'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-lg font-bold text-purple-600">
                          {student.total_points}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">
                        {student.tasks_completed}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">
                        {student.events_attended}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          className={
                            student.task_completion_rate >= 80 
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : student.task_completion_rate >= 50
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }
                        >
                          {student.task_completion_rate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getRankChangeIndicator(student.rank_change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {leaderboard.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Avg. Tasks Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {leaderboard.length > 0
                ? (leaderboard.reduce((sum, s) => sum + s.tasks_completed, 0) / leaderboard.length).toFixed(1)
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Avg. Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {leaderboard.length > 0
                ? (leaderboard.reduce((sum, s) => sum + s.task_completion_rate, 0) / leaderboard.length).toFixed(0)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardTab;
