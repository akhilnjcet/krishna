import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Clock, Play, AlertTriangle, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

const ProjectTimeline = ({ projectId }) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchTimeline();
        }
    }, [projectId]);

    const fetchTimeline = async () => {
        try {
            const res = await api.get(`/projects/${projectId}/timeline`);
            setTimeline(res.data);
        } catch (err) {
            console.error("Failed to fetch timeline:", err);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (status) => {
        switch (status) {
            case 'In Progress':
                return { icon: Play, color: 'bg-blue-500 text-white', label: 'Work Started' };
            case 'Delayed':
                return { icon: AlertTriangle, color: 'bg-amber-500 text-white', label: 'Project Delayed' };
            case 'Stopped':
                return { icon: ShieldAlert, color: 'bg-rose-600 text-white', label: 'Project Stopped' };
            case 'Completed':
                return { icon: CheckCircle2, color: 'bg-emerald-600 text-white', label: 'Project Completed' };
            case 'Restarted':
                return { icon: RotateCcw, color: 'bg-teal-500 text-white', label: 'Work Restarted' };
            default:
                return { icon: Clock, color: 'bg-gray-500 text-white', label: status };
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-6">
                <div className="w-5 h-5 border-2 border-brand-950 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (timeline.length === 0) {
        return (
            <div className="text-center py-6 text-xs text-slate-400 uppercase tracking-wider font-bold">
                No activity history recorded yet.
            </div>
        );
    }

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {timeline.map((event, idx) => {
                    const { icon: Icon, color, label } = getIcon(event.status);
                    return (
                        <li key={event._id || idx}>
                            <div className="relative pb-8">
                                {idx !== timeline.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-dark-border" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-dark-surface ${color}`}>
                                            <Icon className="w-4 h-4" />
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-dark-text">
                                                {label}{' '}
                                                {event.reason && (
                                                    <span className="font-normal text-slate-500 dark:text-dark-muted">
                                                        due to <span className="font-semibold text-slate-700 dark:text-dark-text">{event.reason}</span>
                                                    </span>
                                                )}
                                            </p>
                                            {event.remarks && (
                                                <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 bg-slate-50 dark:bg-dark-bg p-2 rounded-lg border border-slate-100 dark:border-dark-border inline-block max-w-md">
                                                    {event.remarks}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1.5 font-semibold">
                                                By: {event.reportedBy?.name || 'Operator'}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs whitespace-nowrap text-slate-500 dark:text-dark-muted font-medium">
                                            <time dateTime={event.reportedAt}>
                                                {new Date(event.reportedAt).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ProjectTimeline;
