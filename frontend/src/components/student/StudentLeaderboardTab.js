import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Trophy, TrendingUp, TrendingDown, Medal, Target, Award, Calendar, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentLeaderboardTab = ({ user }) => {
  const [myStats, setMyStats] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, topResponse] = await Promise.all([
        axios.get(`${API}/leaderboard/my-stats`),
        axios.get(`${API}/leaderboard/top-performers`)
      ]);
      setMyStats(statsResponse.data);
      setTopPerformers(topResponse.data);
    } catch (error) {
      toast.error('Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-xl font-bold text-gray-600">#{rank}</span>;
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
    return <span className="text-sm text-gray-400">New</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
        <p className="text-gray-600 mt-1">Track your performance and compete with peers</p>
      </div>

      {/* My Stats Card */}
      {myStats && (
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl">Your Rank</CardTitle>
                <CardDescription className="text-indigo-100">
                  Current semester performance
                </CardDescription>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Trophy className="w-8 h-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-4xl font-bold mb-1">
                  {myStats.rank > 0 ? `#${myStats.rank}` : 'Unranked'}
                </div>
                <div className="text-sm text-indigo-100">Rank</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{myStats.total_points}</div>
                <div className="text-sm text-indigo-100">Total Points</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{myStats.tasks_completed}</div>
                <div className="text-sm text-indigo-100">Tasks Done</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{myStats.events_attended}</div>
                <div className="text-sm text-indigo-100">Events Attended</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-indigo-100">Task Completion Rate</span>
                <span className="text-lg font-bold">{myStats.task_completion_rate}%</span>
              </div>
              <Progress 
                value={myStats.task_completion_rate} 
                className="h-2 bg-white/20"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {myStats && myStats.recent_activities && myStats.recent_activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>Your latest point-earning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myStats.recent_activities.slice().reverse().map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      activity.points > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {activity.points > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Target className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{activity.description}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <Badge className={
                    activity.points > 0 
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Top Performers
          </CardTitle>
          <CardDescription>Top 10 students in your department</CardDescription>
        </CardHeader>
        <CardContent>
          {topPerformers.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No rankings available yet</p>
              <p className="text-sm text-gray-500 mt-1">Be the first to earn points!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((student, index) => {
                const isCurrentUser = student.user_id === user.id;
                
                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      isCurrentUser 
                        ? 'bg-indigo-50 border-2 border-indigo-200 shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-center w-12">
                      {getRankBadge(student.rank)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">
                          {student.user_name}
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </div>
                        {student.section && (
                          <Badge variant="outline" className="text-xs">
                            Section {student.section}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                        <span>{student.tasks_completed} tasks</span>
                        <span>{student.events_attended} events</span>
                        <span>{student.task_completion_rate.toFixed(0)}% completion</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-indigo-600">
                        {student.total_points}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>

                    <div className="w-16 text-center">
                      {getRankChangeIndicator(student.rank_change)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points Guide */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg">How to Earn Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Task on Time: +10 points</div>
                <div className="text-gray-600">Complete assignments before deadline</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Event Attendance: +20 points</div>
                <div className="text-gray-600">Participate in department events</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Trophy className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Event Winning: +30 points</div>
                <div className="text-gray-600">Win competitions and contests</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Target className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Late/Missed: -5/-10 points</div>
                <div className="text-gray-600">Penalties for late or missed tasks</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLeaderboardTab;
