import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity,
    Users,
    Calendar,
    BarChart2,
    RefreshCw
} from 'lucide-react';

const AdminAnalytics = () => {
    const [stats, setStats] = useState({ totalVisits: 0, dailyVisits: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/visits`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}` // Admin token
                }
            });
            if (res.data.success) {
                setStats({
                    totalVisits: res.data.totalVisits,
                    dailyVisits: res.data.dailyVisits
                });
            } else {
                setError('Failed to load visit analytics');
            }
        } catch (err) {
            console.error(err);
            setError('Error connecting to the server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    // Get today's visits
    const today = new Date().toISOString().split('T')[0];
    const todayData = stats.dailyVisits.find(v => v.date === today);
    const todayVisits = todayData ? todayData.count : 0;

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Activity className="text-blue-500 w-8 h-8" />
                        Website Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">Track traffic and visitor engagement</p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 mb-1 font-medium text-lg">Total Lifetime Visits</p>
                            <h3 className="text-5xl font-extrabold tracking-tight">
                                {loading ? '...' : stats.totalVisits.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white transform hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-purple-100 mb-1 font-medium text-lg">Today's Visits</p>
                            <h3 className="text-5xl font-extrabold tracking-tight">
                                {loading ? '...' : todayVisits.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <BarChart2 className="w-6 h-6 text-indigo-500" />
                    <h2 className="text-xl font-bold text-gray-800">Daily Breakdown</h2>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                        <p>Loading analytics data...</p>
                    </div>
                ) : stats.dailyVisits.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg">No visit data recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                    <th className="p-4 font-semibold border-b">Date</th>
                                    <th className="p-4 font-semibold border-b">Visits Count</th>
                                    <th className="p-4 font-semibold border-b">Impact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...stats.dailyVisits].reverse().map((record, index) => {
                                    // Calculate simple percentage width for a basic bar chart visual
                                    const maxVisits = Math.max(...stats.dailyVisits.map(v => v.count), 1);
                                    const percent = (record.count / maxVisits) * 100;
                                    
                                    return (
                                        <tr key={index} className="hover:bg-gray-50/50 transition-colors border-b last:border-0 border-gray-50">
                                            <td className="p-4 text-gray-700 font-medium">
                                                {new Date(record.date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="p-4 font-semibold text-gray-900 text-lg">
                                                {record.count.toLocaleString()}
                                            </td>
                                            <td className="p-4 w-1/3">
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full" 
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;
