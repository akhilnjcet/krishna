import React, { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Download, 
    ZoomIn, 
    ZoomOut, 
    RotateCw, 
    FileText, 
    Image as ImageIcon, 
    AlertCircle, 
    Loader2, 
    Maximize2, 
    ExternalLink,
    RefreshCw
} from 'lucide-react';
import { resolveAttachmentUrl, detectFileType, dataUriToBlob, safeDownloadAttachment } from '../utils/attachmentHelper';

// Error Boundary to prevent any attachment rendering failure from crashing the entire app
class AttachmentErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Attachment Preview Crash Prevented:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800 m-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-red-900 dark:text-red-200 mb-1">Preview Render Error</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-4">
                        An unexpected error occurred while displaying this attachment.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const TaskAttachmentModal = ({ 
    isOpen, 
    onClose, 
    attachment, 
    attachmentIndex = 0, 
    taskTitle = 'Task Attachment' 
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [fileType, setFileType] = useState('other');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [downloading, setDownloading] = useState(false);

    const activeBlobUrlRef = useRef(null);

    // Clean up created Blob URLs
    const cleanupBlobUrl = () => {
        if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
            try {
                URL.revokeObjectURL(activeBlobUrlRef.current);
            } catch (e) {
                console.warn('Revoke Blob URL error:', e);
            }
            activeBlobUrlRef.current = null;
        }
    };

    useEffect(() => {
        if (!isOpen || !attachment) {
            cleanupBlobUrl();
            setPreviewUrl('');
            setError(null);
            setZoom(1);
            setRotation(0);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);
        setZoom(1);
        setRotation(0);

        try {
            const rawUrl = resolveAttachmentUrl(attachment);
            if (!rawUrl) {
                if (isMounted) {
                    setError('The attachment link or data is missing or empty.');
                    setLoading(false);
                }
                return;
            }

            const detectedType = detectFileType(rawUrl);
            if (isMounted) {
                setFileType(detectedType);
            }

            // Handle base64 Data URIs (convert to Blob URL for clean PDF/Image rendering)
            if (rawUrl.startsWith('data:')) {
                const blob = dataUriToBlob(rawUrl);
                if (blob) {
                    cleanupBlobUrl();
                    const bUrl = URL.createObjectURL(blob);
                    activeBlobUrlRef.current = bUrl;
                    if (isMounted) {
                        setPreviewUrl(bUrl);
                        setLoading(false);
                    }
                } else {
                    if (isMounted) {
                        setPreviewUrl(rawUrl);
                        setLoading(false);
                    }
                }
            } else {
                cleanupBlobUrl();
                if (isMounted) {
                    setPreviewUrl(rawUrl);
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('Error preparing attachment preview:', err);
            if (isMounted) {
                setError('Failed to load attachment preview. ' + (err.message || ''));
                setLoading(false);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [isOpen, attachment]);

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            cleanupBlobUrl();
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !attachment) return null;

    const fileName = `${taskTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_attachment_${attachmentIndex + 1}`;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => {
        setZoom(1);
        setRotation(0);
    };
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            await safeDownloadAttachment({
                url: attachment,
                fileName: `${fileName}.${fileType === 'pdf' ? 'pdf' : fileType === 'image' ? 'png' : 'bin'}`,
                mimeType: fileType === 'pdf' ? 'application/pdf' : fileType === 'image' ? 'image/png' : ''
            });
        } catch (err) {
            console.error('Download error:', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <AttachmentErrorBoundary>
            <div 
                className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Attachment Viewer"
            >
                <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
                    
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                fileType === 'image' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                fileType === 'pdf' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}>
                                {fileType}
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                    Attachment #{attachmentIndex + 1}
                                </h3>
                                <p className="text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md">
                                    {taskTitle}
                                </p>
                            </div>
                        </div>

                        {/* Control Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {fileType === 'image' && !error && (
                                <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1">
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500 w-9 text-center">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <ZoomOut className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        title="Rotate"
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <RotateCw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold transition-all border border-blue-100 dark:border-blue-800"
                                title="Download File"
                            >
                                {downloading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                <span className="hidden sm:inline">Download</span>
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="Close Preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Viewer Body */}
                    <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/40 min-h-[300px]">
                        {loading && (
                            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <span className="text-xs font-bold">Loading attachment preview...</span>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-2xl border border-red-200 dark:border-red-900/40 text-center space-y-4 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Unable to Preview Attachment</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{typeof error === 'object' ? (error?.message || error?.error || JSON.stringify(error)) : String(error || '')}</p>
                                </div>
                                <div className="flex justify-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download File Directly
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && !error && fileType === 'image' && (
                            <div className="w-full h-full flex items-center justify-center overflow-hidden min-h-[250px]">
                                <img
                                    src={previewUrl}
                                    alt={`Attachment #${attachmentIndex + 1}`}
                                    className="max-h-[68vh] max-w-full w-auto object-contain rounded-xl shadow-sm transition-transform duration-200 select-none"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`
                                    }}
                                    onError={() => setError('Image failed to load or format is invalid.')}
                                />
                            </div>
                        )}

                        {!loading && !error && fileType === 'pdf' && (
                            <div className="w-full h-full flex flex-col items-center">
                                {/* Desktop PDF frame */}
                                <div className="hidden sm:block w-full h-[65vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-inner">
                                    <iframe
                                        src={`${previewUrl}#toolbar=1`}
                                        className="w-full h-full border-0"
                                        title="PDF Attachment Viewer"
                                    />
                                </div>

                                {/* Mobile Fallback Card for Android WebView / Mobile Browsers */}
                                <div className="sm:hidden w-full bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center mx-auto">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">PDF Document Ready</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            For the best mobile viewing experience on Android, open or download this PDF into your device reader.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Open / Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!loading && !error && fileType !== 'image' && fileType !== 'pdf' && (
                            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mx-auto">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reference Document</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        This file type ({fileType}) cannot be rendered directly in the browser preview. Download it to view on your device.
                                    </p>
                                </div>
                                <div className="flex justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        {downloading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        Download File
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Bar */}
                    <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                        <span>Safe Viewer • Krishna ERP</span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            Return to Task Details
                        </button>
                    </div>
                </div>
            </div>
        </AttachmentErrorBoundary>
    );
};

export default TaskAttachmentModal;
