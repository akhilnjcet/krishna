import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import TripManagementTab from '../../components/fleet/TripManagementTab';
import StaffIdCardModal from '../../components/StaffIdCardModal';
import { openGoogleMapsNavigation } from '../../utils/mapsUtil';
import { 
    Truck, Plus, Search, Filter, Calendar, AlertTriangle, ShieldCheck, 
    Clock, DollarSign, Fuel, Wrench, FileText, CheckCircle2, ChevronRight, 
    X, RefreshCw, Navigation, User, MapPin, Gauge, UserCheck, UserX, 
    Phone, PhoneCall, Edit, Trash2, ArrowRight, Eye, ShieldAlert, Users, Award,
    KeyRound, Lock, Shield, Check, Info, CreditCard
} from 'lucide-react';

const VEHICLE_TYPES = [
    'Pickup Truck',
    'Flatbed Truck',
    'Heavy Commercial Trailer',
    'Crane / Boom Truck',
    'Utility Van',
    'Company Car',
    'Two Wheeler'
];

const LICENSE_TYPES = [
    'LMV (Light Motor Vehicle)',
    'LMV-Commercial / Transport',
    'HMV (Heavy Motor Vehicle)',
    'Heavy Trailer (40ft / Low Bed)',
    'Medium Goods Vehicle (MGV)',
    'Crane / Heavy Equipment',
    'Hazardous Goods / Tanker',
    'Two Wheeler',
    'Other'
];

const FALLBACK_DRIVER_PERMISSIONS = {
    'driver.view': { label: 'View Drivers', description: 'Browse driver directory, profiles, and licenses' },
    'driver.create': { label: 'Register Drivers', description: 'Create and register new driver profiles' },
    'driver.edit': { label: 'Edit Driver Details', description: 'Modify contact numbers, license details, and status' },
    'driver.delete': { label: 'Delete Drivers', description: 'Permanently remove driver accounts' },
    'driver.activate': { label: 'Activate Drivers', description: 'Mark driver as available for dispatch' },
    'driver.deactivate': { label: 'Suspend / Deactivate', description: 'Temporarily suspend driver accounts' },
    'driver.password_reset': { label: 'Reset Password', description: 'Change driver portal login password' },
    'driver.assign_vehicle': { label: 'Assign Vehicles', description: 'Allocate or reassign company transport assets' },
    'driver.assign_trip': { label: 'Assign & Dispatch Trips', description: 'Schedule and dispatch delivery routes' },
    'driver.view_reports': { label: 'View Reports & Logs', description: 'Access trip distance and fuel logs' },
    'driver.manage_issues': { label: 'Manage Issues', description: 'Review and resolve vehicle defect tickets' },
    'driver.view_location': { label: 'Track Live Location', description: 'Monitor real-time GPS coordinates' },
    'driver.manage_documents': { label: 'Manage Documents', description: 'Upload and verify permits and PUC' }
};

const AdminFleet = () => {
    // Navigation Tab
    const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'drivers' | 'assignments'

    // Fleet state
    const [vehicles, setVehicles] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [expiringOnly, setExpiringOnly] = useState(false);

    // Driver Management state
    const [driversList, setDriversList] = useState([]);
    const [eligibleDrivers, setEligibleDrivers] = useState([]);
    const [staffCandidates, setStaffCandidates] = useState([]);
    const [driverKpis, setDriverKpis] = useState(null);
    const [driverLoading, setDriverLoading] = useState(false);
    const [driverSearchQuery, setDriverSearchQuery] = useState('');
    const [driverStatusFilter, setDriverStatusFilter] = useState('All');
    const [driverExpiringFilter, setDriverExpiringFilter] = useState(false);

    // Modals - Fleet
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showTripModal, setShowTripModal] = useState(false);
    const [showFuelModal, setShowFuelModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // Modals - Driver
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [isFromVehicleForm, setIsFromVehicleForm] = useState(false);
    const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
    const [selectedDriverProfile, setSelectedDriverProfile] = useState(null);
    const [showIdCardModal, setShowIdCardModal] = useState(false);
    const [selectedDriverForIdCard, setSelectedDriverForIdCard] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTargetDriver, setAssignTargetDriver] = useState(null);
    const [assignTargetVehicleId, setAssignTargetVehicleId] = useState('');
    const [assignReason, setAssignReason] = useState('Routine Fleet Assignment');

    // Modals - Password Reset & Permissions Matrix
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [targetDriverForReset, setTargetDriverForReset] = useState(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [permissionsUsers, setPermissionsUsers] = useState([]);
    const [allPermissionsList, setAllPermissionsList] = useState([]);
    const [prohibitedList, setProhibitedList] = useState([]);
    const [permissionsLoading, setPermissionsLoading] = useState(false);
    const [updatingPermUserId, setUpdatingPermUserId] = useState(null);

    // Modals - Driver Emergency SOS Hotlines (Editable by Admin)
    const [showHotlinesModal, setShowHotlinesModal] = useState(false);
    const [emergencyHotlines, setEmergencyHotlines] = useState([]);
    const [loadingHotlines, setLoadingHotlines] = useState(false);
    const [savingHotlines, setSavingHotlines] = useState(false);

    // Notification banner
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, isError = false) => {
        setToastMessage({ text: msg, isError });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Form states
    const [registerForm, setRegisterForm] = useState({
        registrationNumber: '',
        vehicleName: '',
        vehicleType: 'Pickup Truck',
        assignedDriverId: '',
        driverLicenseNumber: '',
        currentOdometer: '',
        fuelType: 'Diesel',
        tankCapacityLiters: '60',
        notes: ''
    });

    const [tripForm, setTripForm] = useState({
        projectId: '',
        driverId: '',
        startLocation: 'Central Yard / Workshop, Palakkad',
        destination: '',
        startOdometer: '',
        endOdometer: '',
        purpose: 'Material / Site Delivery',
        isCompleted: false
    });

    const [fuelForm, setFuelForm] = useState({
        liters: '',
        costPerLiter: '',
        totalCost: '',
        odometerReading: '',
        fuelStation: 'Local Fuel Pump',
        notes: ''
    });

    const [serviceForm, setServiceForm] = useState({
        serviceType: 'Scheduled Maintenance',
        odometerReading: '',
        garageName: 'Authorized Service Center',
        totalCost: '',
        nextServiceDueOdometer: '',
        notes: ''
    });

    const [docForm, setDocForm] = useState({
        docType: 'Insurance Policy',
        documentNumber: '',
        expiryDate: '',
        notes: ''
    });

    // Driver Form state
    const [driverForm, setDriverForm] = useState({
        name: '',
        photoUrl: '',
        employeeId: '',
        staff_id: '',
        phone: '',
        address: '',
        licenseNumber: '',
        licenseType: 'LMV-Commercial / Transport',
        licenseExpiryDate: '',
        emergencyContactName: '',
        emergencyPhone: '',
        emergencyRelation: 'Next of Kin',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: '',
        email: '',
        password: '',
        enablePortalLogin: true
    });

    const [projects, setProjects] = useState([]);

    // ─── DATA FETCHING ───────────────────────────────────────────────
    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'All') params.status = statusFilter;
            if (typeFilter !== 'All') params.vehicleType = typeFilter;
            if (expiringOnly) params.expiringDocs = 'true';
            if (searchQuery) params.search = searchQuery;

            const [vehRes, repRes] = await Promise.all([
                api.get('/vehicles', { params }),
                api.get('/vehicles/reports/summary').catch(() => ({ data: { kpis: null } }))
            ]);

            if (vehRes.data?.vehicles) setVehicles(vehRes.data.vehicles);
            if (repRes.data?.kpis) setKpis(repRes.data.kpis);
        } catch (err) {
            console.error('Failed to load fleet:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, expiringOnly, searchQuery]);

    const fetchDriversData = useCallback(async () => {
        try {
            setDriverLoading(true);
            const params = {};
            if (driverStatusFilter !== 'All') params.status = driverStatusFilter;
            if (driverExpiringFilter) params.expiringOnly = 'true';
            if (driverSearchQuery) params.search = driverSearchQuery;

            const [listRes, summaryRes, eligibleRes, staffRes] = await Promise.all([
                api.get('/vehicles/drivers', { params }).catch(() => ({ data: { drivers: [] } })),
                api.get('/vehicles/drivers/summary').catch(() => ({ data: { kpis: null } })),
                api.get('/vehicles/drivers/eligible').catch(() => ({ data: { drivers: [] } })),
                api.get('/vehicles/drivers/staff-candidates').catch(() => ({ data: { staffCandidates: [] } }))
            ]);

            if (listRes.data?.drivers) setDriversList(listRes.data.drivers);
            if (summaryRes.data?.kpis) setDriverKpis(summaryRes.data.kpis);
            if (eligibleRes.data?.drivers) setEligibleDrivers(eligibleRes.data.drivers);
            if (staffRes.data?.staffCandidates) setStaffCandidates(staffRes.data.staffCandidates);
        } catch (err) {
            console.error('Failed to load drivers data:', err);
        } finally {
            setDriverLoading(false);
        }
    }, [driverStatusFilter, driverExpiringFilter, driverSearchQuery]);

    const fetchAuxiliaryData = useCallback(async () => {
        try {
            const [projRes, eligibleRes] = await Promise.all([
                api.get('/projects').catch(() => ({ data: { projects: [] } })),
                api.get('/vehicles/drivers/eligible').catch(() => ({ data: { drivers: [] } }))
            ]);
            if (projRes.data) {
                const list = Array.isArray(projRes.data) ? projRes.data : (projRes.data.projects || []);
                setProjects(list);
            }
            if (eligibleRes.data?.drivers) {
                setEligibleDrivers(eligibleRes.data.drivers);
            }
        } catch (err) {
            console.warn('Auxiliary fetch error:', err);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
        fetchAuxiliaryData();
        fetchDriversData();
    }, [fetchVehicles, fetchAuxiliaryData, fetchDriversData]);

    // ─── VEHICLE HANDLERS ────────────────────────────────────────────
    const handleRegisterVehicle = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/vehicles', registerForm);
            setShowRegisterModal(false);
            setRegisterForm({
                registrationNumber: '',
                vehicleName: '',
                vehicleType: 'Pickup Truck',
                assignedDriverId: '',
                driverLicenseNumber: '',
                currentOdometer: '',
                fuelType: 'Diesel',
                tankCapacityLiters: '60',
                notes: ''
            });
            showToast('Vehicle registered successfully!');
            fetchVehicles();
            fetchDriversData();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to register vehicle', true);
        }
    };

    const handleRecordTrip = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/trips`, tripForm);
            setShowTripModal(false);
            setSelectedVehicle(null);
            showToast('Trip record logged successfully!');
            fetchVehicles();
            fetchDriversData();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to record trip', true);
        }
    };

    const handleRecordFuel = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/fuel`, fuelForm);
            setShowFuelModal(false);
            setSelectedVehicle(null);
            showToast('Fuel refill logged and synced to finance ledger!');
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to record fuel log', true);
        }
    };

    const handleRecordService = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/service`, serviceForm);
            setShowServiceModal(false);
            setSelectedVehicle(null);
            showToast('Service log recorded and expense registered!');
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to record service log', true);
        }
    };

    const handleAddDocument = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/documents`, docForm);
            setShowDocModal(false);
            setSelectedVehicle(null);
            showToast('Vehicle document added successfully!');
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to add document', true);
        }
    };

    // ─── DRIVER MANAGEMENT HANDLERS ──────────────────────────────────
    const handleOpenAddDriver = (fromVehicle = false) => {
        setEditingDriver(null);
        setIsFromVehicleForm(fromVehicle);
        setDriverForm({
            name: '',
            photoUrl: '',
            employeeId: '',
            staff_id: '',
            phone: '',
            address: '',
            licenseNumber: '',
            licenseType: 'LMV-Commercial / Transport',
            licenseExpiryDate: '',
            emergencyContactName: '',
            emergencyPhone: '',
            emergencyRelation: 'Next of Kin',
            joiningDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            notes: '',
            email: '',
            password: 'Driver@123',
            enablePortalLogin: true
        });
        setShowDriverModal(true);
    };

    const handleOpenEditDriver = (driver) => {
        setEditingDriver(driver);
        setIsFromVehicleForm(false);
        setDriverForm({
            name: driver.name || '',
            photoUrl: driver.photoUrl || '',
            employeeId: driver.employeeId?._id || driver.employeeId || '',
            staff_id: driver.staff_id || '',
            phone: driver.phone || '',
            address: driver.address || '',
            licenseNumber: driver.licenseNumber || '',
            licenseType: driver.licenseType || 'LMV-Commercial / Transport',
            licenseExpiryDate: driver.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toISOString().split('T')[0] : '',
            emergencyContactName: driver.emergencyContact?.name || '',
            emergencyPhone: driver.emergencyPhone || driver.emergencyContact?.phone || '',
            emergencyRelation: driver.emergencyContact?.relation || 'Next of Kin',
            joiningDate: driver.joiningDate ? new Date(driver.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: driver.status || 'Active',
            notes: driver.notes || '',
            email: driver.email || driver.userId?.email || '',
            password: '',
            enablePortalLogin: Boolean(driver.userId || driver.email)
        });
        setShowDriverModal(true);
    };

    const handleSaveDriver = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: driverForm.name,
                photoUrl: driverForm.photoUrl,
                employeeId: driverForm.employeeId || null,
                staff_id: driverForm.staff_id,
                phone: driverForm.phone,
                address: driverForm.address,
                licenseNumber: driverForm.licenseNumber,
                licenseType: driverForm.licenseType,
                licenseExpiryDate: driverForm.licenseExpiryDate,
                emergencyContact: {
                    name: driverForm.emergencyContactName,
                    phone: driverForm.emergencyPhone,
                    relation: driverForm.emergencyRelation
                },
                emergencyPhone: driverForm.emergencyPhone,
                joiningDate: driverForm.joiningDate,
                status: driverForm.status,
                notes: driverForm.notes,
                email: driverForm.email,
                password: driverForm.password,
                enablePortalLogin: driverForm.enablePortalLogin
            };

            if (editingDriver) {
                await api.put(`/vehicles/drivers/${editingDriver._id}`, payload);
                showToast(`Driver ${driverForm.name} profile updated!`);
            } else {
                const res = await api.post('/vehicles/drivers', payload);
                const newDriver = res.data?.driver;
                showToast(`Driver ${driverForm.name} registered successfully!`);

                // If opened from the Vehicle Registration Modal, auto-select this new driver!
                if (isFromVehicleForm && newDriver) {
                    setRegisterForm(prev => ({
                        ...prev,
                        assignedDriverId: newDriver._id,
                        driverLicenseNumber: newDriver.licenseNumber
                    }));
                }
            }

            setShowDriverModal(false);
            setEditingDriver(null);
            fetchDriversData();
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to save driver', true);
        }
    };

    // ─── RESET DRIVER PASSWORD HANDLERS ──────────────────────────────
    const handleOpenResetPassword = (driver) => {
        setTargetDriverForReset(driver);
        setNewPasswordValue('');
        setShowResetPasswordModal(true);
    };

    const handleConfirmResetPassword = async (e) => {
        e.preventDefault();
        if (!targetDriverForReset) return;
        if (!newPasswordValue || newPasswordValue.length < 6) {
            showToast('Password must be at least 6 characters long', true);
            return;
        }
        try {
            setResettingPassword(true);
            const res = await api.post(`/drivers/${targetDriverForReset._id}/reset-password`, {
                newPassword: newPasswordValue
            });
            showToast(res.data?.message || `Password for ${targetDriverForReset.name} has been reset successfully.`);
            setShowResetPasswordModal(false);
            setTargetDriverForReset(null);
            setNewPasswordValue('');
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to reset driver password', true);
        } finally {
            setResettingPassword(false);
        }
    };

    // ─── DRIVER EMERGENCY SOS HOTLINES HANDLERS ───────────────────────
    const fetchEmergencyHotlines = async () => {
        setLoadingHotlines(true);
        try {
            const res = await api.get('/drivers/emergency/contacts');
            if (res.data?.success && Array.isArray(res.data.contacts)) {
                setEmergencyHotlines(res.data.contacts);
            }
        } catch (err) {
            showToast('Failed to load emergency hotlines: ' + (err.response?.data?.message || err.message), true);
        } finally {
            setLoadingHotlines(false);
        }
    };

    const handleSaveEmergencyHotlines = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setSavingHotlines(true);
        try {
            const res = await api.put('/drivers/emergency/contacts', { contacts: emergencyHotlines });
            if (res.data?.success) {
                showToast('Driver Emergency SOS Hotlines updated successfully!');
                setShowHotlinesModal(false);
            }
        } catch (err) {
            showToast('Failed to save hotlines: ' + (err.response?.data?.message || err.message), true);
        } finally {
            setSavingHotlines(false);
        }
    };

    const handleAddHotlineRow = () => {
        setEmergencyHotlines(prev => [
            ...prev,
            { role: 'Emergency Helpline', name: 'New Hotline Desk', phone: '+91 ', available: '24/7 Emergency' }
        ]);
    };

    const handleRemoveHotlineRow = (index) => {
        setEmergencyHotlines(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateHotlineField = (index, field, value) => {
        setEmergencyHotlines(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // ─── DRIVER PERMISSIONS MATRIX HANDLERS ─────────────────────────
    const handleOpenPermissionsModal = async () => {
        try {
            setPermissionsLoading(true);
            setShowPermissionsModal(true);
            const res = await api.get('/drivers/permissions/matrix');
            if (res.data?.success) {
                setPermissionsUsers(res.data.users || []);
                setAllPermissionsList(res.data.allPermissions || []);
                setProhibitedList(res.data.prohibitedForStaff || []);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load permissions matrix', true);
        } finally {
            setPermissionsLoading(false);
        }
    };

    const handleToggleUserPermission = async (targetUser, permKey) => {
        if ((targetUser.role || '').toLowerCase() === 'admin') {
            showToast('Administrators inherently possess full, unrestricted permissions.', true);
            return;
        }
        const isStaff = (targetUser.role || '').toLowerCase() === 'staff';
        if (isStaff && prohibitedList.includes(permKey)) {
            showToast(`Permission "${permKey}" is strictly prohibited for Staff by ERP security policy.`, true);
            return;
        }
        const currentPerms = targetUser.permissions || targetUser.driverPermissions || [];
        const hasPerm = currentPerms.includes(permKey);
        const updatedPerms = hasPerm
            ? currentPerms.filter(p => p !== permKey)
            : [...currentPerms, permKey];

        try {
            setUpdatingPermUserId(targetUser._id);
            await api.put(`/drivers/permissions/user/${targetUser._id}`, {
                permissions: updatedPerms
            });
            setPermissionsUsers(prev => prev.map(u => 
                u._id === targetUser._id ? { ...u, permissions: updatedPerms, driverPermissions: updatedPerms } : u
            ));
            showToast(`Driver permissions updated for ${targetUser.name}`);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update user permissions', true);
        } finally {
            setUpdatingPermUserId(null);
        }
    };

    const handleToggleDriverStatus = async (driver) => {
        const nextStatus = driver.status === 'Active' ? 'Inactive' : 'Active';
        if (!window.confirm(`Are you sure you want to change ${driver.name}'s status to ${nextStatus}?${nextStatus === 'Inactive' && driver.currentAssignedVehicle?.vehicleId ? ' (This will automatically unassign them from vehicle ' + driver.currentAssignedVehicle.registrationNumber + ')' : ''}`)) {
            return;
        }
        try {
            await api.put(`/vehicles/drivers/${driver._id}`, { status: nextStatus });
            showToast(`Driver ${driver.name} is now ${nextStatus}.`);
            fetchDriversData();
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to update status', true);
        }
    };

    const handleDeleteDriver = async (driver) => {
        if (!window.confirm(`Are you sure you want to permanently delete driver ${driver.name}?`)) return;
        try {
            await api.delete(`/vehicles/drivers/${driver._id}`);
            showToast(`Driver ${driver.name} deleted.`);
            fetchDriversData();
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to delete driver', true);
        }
    };

    const handleViewDriverProfile = async (driverId) => {
        try {
            setProfileLoading(true);
            setShowDriverProfileModal(true);
            const res = await api.get(`/vehicles/drivers/${driverId}`);
            if (res.data?.success) {
                setSelectedDriverProfile(res.data);
            }
        } catch (err) {
            showToast('Failed to load driver profile details', true);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleOpenAssignModal = (driver, vehicleId = '') => {
        setAssignTargetDriver(driver);
        setAssignTargetVehicleId(vehicleId || driver.currentAssignedVehicle?.vehicleId || '');
        setAssignReason('Fleet Operational Reassignment');
        setShowAssignModal(true);
    };

    const handleExecuteAssignment = async (e) => {
        e.preventDefault();
        if (!assignTargetDriver) return;
        try {
            await api.post(`/vehicles/drivers/${assignTargetDriver._id}/assign`, {
                vehicleId: assignTargetVehicleId || null,
                reason: assignReason
            });
            showToast(`Driver assignment updated successfully!`);
            setShowAssignModal(false);
            setAssignTargetDriver(null);
            fetchDriversData();
            fetchVehicles();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Failed to assign driver', true);
        }
    };

    const handleTriggerExpiryScan = async () => {
        try {
            const res = await api.get('/vehicles/drivers/check-expiries');
            if (res.data?.success) {
                showToast(`Licence scan completed! ${res.data.totalExpiring} expiring licences checked.`);
                fetchDriversData();
            }
        } catch (err) {
            showToast('Failed to scan licence expiries', true);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            v.registrationNumber?.toLowerCase().includes(q) ||
            v.vehicleName?.toLowerCase().includes(q) ||
            v.assignedDriverName?.toLowerCase().includes(q)
        );
    });

    const expiringAlertCount = vehicles.filter(v => v.hasExpiringDocs).length;
    const driverAlertCount = (driverKpis?.expiredLicensesCount || 0) + (driverKpis?.expiringSoonCount || 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all ${
                    toastMessage.isError ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                    {toastMessage.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/30 border border-blue-400/40 uppercase tracking-wider">
                            Logistics, Fleet & Drivers
                        </span>
                        {driverAlertCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/30 border border-rose-400/40 flex items-center gap-1 text-rose-200">
                                <ShieldAlert className="w-3 h-3" />
                                {driverAlertCount} Driver Licence Alerts
                            </span>
                        )}
                        {expiringAlertCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/30 border border-amber-400/40 flex items-center gap-1 text-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                {expiringAlertCount} Vehicle Docs Due
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">Fleet & Driver Management</h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
                        Manage company logistics vehicles, registered company drivers, real-time vehicle assignments, trip dispatches, fuel expenses, and licence renewals.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={() => handleOpenAddDriver(false)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all"
                    >
                        <UserCheck className="w-4 h-4" />
                        Add New Driver
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowRegisterModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Register Vehicle
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            fetchEmergencyHotlines();
                            setShowHotlinesModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
                        title="Edit Driver 24/7 Emergency SOS Hotlines & Phone Numbers"
                    >
                        <PhoneCall className="w-4 h-4" />
                        <span>Emergency Hotlines</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { fetchVehicles(); fetchDriversData(); }}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading || driverLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs sm:text-sm">
                <button
                    onClick={() => setActiveTab('fleet')}
                    className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition ${
                        activeTab === 'fleet'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Company Fleet Vehicles ({vehicles.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('drivers')}
                    className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition ${
                        activeTab === 'drivers'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Driver Management ({driversList.length})</span>
                    {driverAlertCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                            {driverAlertCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition ${
                        activeTab === 'assignments'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    <span>Driver Assignments Hub</span>
                </button>

                <button
                    onClick={() => setActiveTab('trips')}
                    className={`px-4 py-2.5 rounded-xl font-black flex items-center gap-2 transition ${
                        activeTab === 'trips'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Navigation className="w-4 h-4" />
                    <span>Trip Management & Real-Time Monitoring</span>
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: FLEET & VEHICLES
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'fleet' && (
                <div className="space-y-6">
                    {/* Fleet KPI Cards */}
                    {kpis && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Fleet Size</span>
                                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    {kpis.totalVehicles}
                                </p>
                                <span className="text-[10px] text-emerald-600 font-bold">{kpis.availableVehicles} Ready for Dispatch</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[11px] font-bold text-indigo-500 uppercase">On Delivery Trips</span>
                                <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                                    {kpis.onTripVehicles}
                                </p>
                                <span className="text-[10px] text-slate-400">{kpis.totalFleetDistance} km total logged</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[11px] font-bold text-amber-500 uppercase">Total Fuel Expense</span>
                                <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1 font-mono">
                                    ₹{kpis.totalFleetFuelCost.toLocaleString()}
                                </p>
                                <span className="text-[10px] text-slate-400">Synced to Financial Ledger</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Service & Repairs</span>
                                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                                    ₹{kpis.totalFleetMaintenanceCost.toLocaleString()}
                                </p>
                                <span className="text-[10px] text-slate-400">Total Fleet Cost: ₹{kpis.totalFleetExpenses.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Filter Toolbar */}
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by registration number, vehicle model, driver..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-2 font-bold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Available">Available</option>
                                <option value="On Trip">On Trip</option>
                                <option value="In Maintenance">In Maintenance</option>
                                <option value="Out of Service">Out of Service</option>
                            </select>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-2 font-bold"
                            >
                                <option value="All">All Vehicle Types</option>
                                {VEHICLE_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setExpiringOnly(!expiringOnly)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    expiringOnly ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Expiring Docs ({expiringAlertCount})
                            </button>
                        </div>
                    </div>

                    {/* Vehicle Grid */}
                    {filteredVehicles.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                            <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h3 className="font-bold text-slate-800 dark:text-white">No Fleet Vehicles Found</h3>
                            <p className="text-xs text-slate-500 mt-1">Register delivery trucks, pickups or utility trailers to begin tracking logistics.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredVehicles.map(vehicle => (
                                <div
                                    key={vehicle._id}
                                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        {/* Top Badges */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-black text-sm px-2.5 py-1 bg-slate-900 text-amber-400 rounded-xl tracking-wider">
                                                {vehicle.registrationNumber}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                vehicle.status === 'Available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                vehicle.status === 'On Trip' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                                                'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                            }`}>
                                                {vehicle.status}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">{vehicle.vehicleName}</h3>
                                            <p className="text-xs text-slate-500">{vehicle.vehicleType} • {vehicle.fuelType}</p>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Odometer</span>
                                                <span className="font-black text-slate-900 dark:text-white font-mono">{vehicle.currentOdometer} km</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Mileage</span>
                                                <span className="font-black text-emerald-600 font-mono">{vehicle.avgEfficiency || '—'} km/L</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Cost</span>
                                                <span className="font-black text-indigo-600 font-mono">₹{vehicle.totalExpenses.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Driver & Site assignment */}
                                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate">
                                                        Driver: <strong>{vehicle.assignedDriverName || 'Unassigned'}</strong>
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenAssignModal(
                                                        driversList.find(d => d._id === vehicle.assignedDriverRef) || { _id: '', name: 'Unassigned', currentAssignedVehicle: { vehicleId: vehicle._id } },
                                                        vehicle._id
                                                    )}
                                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold shrink-0 ml-2"
                                                >
                                                    {vehicle.assignedDriverName ? 'Change' : '+ Assign'}
                                                </button>
                                            </div>
                                            {vehicle.assignedDriverPhone && (
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    <span>{vehicle.assignedDriverPhone}</span>
                                                    {vehicle.driverLicenseNumber && <span className="font-mono text-[10px] ml-1">({vehicle.driverLicenseNumber})</span>}
                                                </div>
                                            )}

                                            {vehicle.expiringDocuments?.length > 0 && (
                                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 mt-1">
                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                                    <span>
                                                        {vehicle.expiringDocuments[0].docType} expires in {vehicle.expiringDocuments[0].daysRemaining} days!
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1.5 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVehicle(vehicle);
                                                setTripForm({
                                                    projectId: '',
                                                    driverId: vehicle.assignedDriverRef || vehicle.assignedDriverId || '',
                                                    startLocation: 'Central Yard / Workshop, Palakkad',
                                                    destination: '',
                                                    startOdometer: vehicle.currentOdometer,
                                                    endOdometer: '',
                                                    purpose: 'Material / Site Delivery',
                                                    isCompleted: false
                                                });
                                                setShowTripModal(true);
                                            }}
                                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                            title="Record Trip"
                                        >
                                            <Navigation className="w-3 h-3" />
                                            Trip
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVehicle(vehicle);
                                                setFuelForm({
                                                    liters: '',
                                                    costPerLiter: '',
                                                    totalCost: '',
                                                    odometerReading: vehicle.currentOdometer,
                                                    fuelStation: 'Local Fuel Pump',
                                                    notes: ''
                                                });
                                                setShowFuelModal(true);
                                            }}
                                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                            title="Record Fuel"
                                        >
                                            <Fuel className="w-3 h-3" />
                                            Fuel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVehicle(vehicle);
                                                setServiceForm({
                                                    serviceType: 'Scheduled Maintenance',
                                                    odometerReading: vehicle.currentOdometer,
                                                    garageName: 'Authorized Service Center',
                                                    totalCost: '',
                                                    nextServiceDueOdometer: vehicle.currentOdometer + 5000,
                                                    notes: ''
                                                });
                                                setShowServiceModal(true);
                                            }}
                                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                            title="Record Maintenance"
                                        >
                                            <Wrench className="w-3 h-3" />
                                            Service
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVehicle(vehicle);
                                                setDocForm({
                                                    docType: 'Insurance Policy',
                                                    documentNumber: '',
                                                    expiryDate: '',
                                                    notes: ''
                                                });
                                                setShowDocModal(true);
                                            }}
                                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                            title="Add Renewal Document"
                                        >
                                            <FileText className="w-3 h-3" />
                                            Docs
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: DRIVER MANAGEMENT
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'drivers' && (
                <div className="space-y-6">
                    {/* Driver KPIs */}
                    {driverKpis && (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Drivers</span>
                                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    {driverKpis.totalDrivers}
                                </p>
                                <span className="text-[10px] text-slate-400">{driverKpis.activeDrivers} Active</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase block">Available</span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                                    {driverKpis.availableDrivers}
                                </p>
                                <span className="text-[10px] text-slate-400">Ready for dispatch</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase block">Assigned</span>
                                <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                                    {driverKpis.assignedDrivers}
                                </p>
                                <span className="text-[10px] text-slate-400">Assigned to vehicles</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-[10px] font-bold text-blue-500 uppercase block">On Active Trip</span>
                                <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
                                    {driverKpis.driversOnTrip}
                                </p>
                                <span className="text-[10px] text-slate-400">Currently en route</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 shadow-sm">
                                <span className="text-[10px] font-bold text-amber-500 uppercase block">Expiring Soon</span>
                                <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                                    {driverKpis.expiringSoonCount}
                                </p>
                                <span className="text-[10px] text-slate-400">Within 30 days</span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm">
                                <span className="text-[10px] font-bold text-rose-500 uppercase block">Expired Licences</span>
                                <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                                    {driverKpis.expiredLicensesCount}
                                </p>
                                <span className="text-[10px] text-rose-600 font-bold">Action Required</span>
                            </div>
                        </div>
                    )}

                    {/* Filter and Action Toolbar */}
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search driver name, phone, licence number, staff ID..."
                                value={driverSearchQuery}
                                onChange={(e) => setDriverSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={driverStatusFilter}
                                onChange={(e) => setDriverStatusFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-2.5 py-2 font-bold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active Drivers</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => setDriverExpiringFilter(!driverExpiringFilter)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    driverExpiringFilter ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Licence Alerts ({driverAlertCount})
                            </button>

                            <button
                                type="button"
                                onClick={handleTriggerExpiryScan}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 text-slate-700 dark:text-slate-300"
                                title="Run automated licence expiry check and send admin notifications"
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                Scan Expiries
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenPermissionsModal}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                title="Manage Driver role permissions for Managers and Staff"
                            >
                                <Shield className="w-3.5 h-3.5 text-amber-400" />
                                Role Permissions
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    fetchEmergencyHotlines();
                                    setShowHotlinesModal(true);
                                }}
                                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/50 shadow-xs"
                                title="Edit Driver 24/7 Emergency SOS Hotlines & Phone Numbers"
                            >
                                <PhoneCall className="w-3.5 h-3.5" />
                                SOS Hotlines
                            </button>

                            <button
                                type="button"
                                onClick={() => handleOpenAddDriver(false)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/20"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Driver
                            </button>
                        </div>
                    </div>

                    {/* Drivers List */}
                    {driversList.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800">
                            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h3 className="font-bold text-slate-800 dark:text-white">No Drivers Registered</h3>
                            <p className="text-xs text-slate-500 mt-1">Register drivers with full names, mobile numbers, and driving licences to assign them to fleet vehicles.</p>
                            <button
                                onClick={() => handleOpenAddDriver(false)}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Add First Driver
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {driversList.map(driver => {
                                const isExpired = driver.isLicenseExpired;
                                const daysRemaining = driver.daysUntilLicenseExpiry;
                                const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;

                                return (
                                    <div
                                        key={driver._id}
                                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            {/* Top badges */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                        driver.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        {driver.status}
                                                    </span>

                                                    {driver.staff_id && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                                                            {driver.staff_id}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Current vehicle assignment pill */}
                                                {driver.currentAssignedVehicle?.vehicleId ? (
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                                        driver.isOnActiveTrip
                                                            ? 'bg-blue-100 text-blue-700 animate-pulse'
                                                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                    }`}>
                                                        <Truck className="w-3 h-3" />
                                                        {driver.isOnActiveTrip ? 'En Route: ' : 'Assigned: '}
                                                        {driver.currentAssignedVehicle.registrationNumber}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800">
                                                        Available
                                                    </span>
                                                )}
                                            </div>

                                            {/* Driver Info */}
                                            <div className="flex items-start gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
                                                    {driver.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate flex-1">
                                                    <h3 className="font-black text-slate-900 dark:text-white text-base truncate">{driver.name}</h3>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <a href={`tel:${driver.phone}`} className="hover:underline font-semibold">{driver.phone}</a>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Licence Details Card */}
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Driving Licence</span>
                                                    <span className="font-mono font-black text-slate-900 dark:text-white">{driver.licenseNumber}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                    <span>Type:</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={driver.licenseType}>
                                                        {driver.licenseType}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400">Expiry Date:</span>
                                                    <span className={`font-bold flex items-center gap-1 ${
                                                        isExpired ? 'text-rose-600 dark:text-rose-400' :
                                                        isExpiringSoon ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        {new Date(driver.licenseExpiryDate).toLocaleDateString()}
                                                        {isExpired && <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-black">EXPIRED</span>}
                                                        {!isExpired && isExpiringSoon && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.2 rounded font-black">{daysRemaining}d LEFT</span>}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Emergency contact */}
                                            {driver.emergencyPhone && (
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                                    <span className="text-slate-500 font-bold">Emergency:</span>
                                                    <span>{driver.emergencyContact?.name ? `${driver.emergencyContact.name} - ` : ''}{driver.emergencyPhone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleViewDriverProfile(driver._id)}
                                                className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                                title="View Complete Profile & Trip History"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Profile</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDriverForIdCard({
                                                        ...driver,
                                                        role: 'driver',
                                                        designation: 'Driver',
                                                        department: 'Logistics & Fleet',
                                                        staff_id: driver.staff_id || `DRV-${String(driver._id || '').slice(-4).toUpperCase()}`,
                                                        profilePhoto: driver.photoUrl || ''
                                                    });
                                                    setShowIdCardModal(true);
                                                }}
                                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                title="Generate / Print Official Driver ID Card"
                                            >
                                                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenAssignModal(driver)}
                                                className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                                                title="Assign to Vehicle"
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                <span>{driver.currentAssignedVehicle?.vehicleId ? 'Reassign' : 'Assign'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenResetPassword(driver)}
                                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 hover:text-violet-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                title="Reset Driver Portal Password"
                                            >
                                                <KeyRound className="w-3.5 h-3.5 text-violet-500" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditDriver(driver)}
                                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                title="Edit Driver Details"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleDriverStatus(driver)}
                                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                title={driver.status === 'Active' ? 'Deactivate Driver' : 'Activate Driver'}
                                            >
                                                {driver.status === 'Active' ? <UserX className="w-3.5 h-3.5 text-amber-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDriver(driver)}
                                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                title="Delete Driver"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 3: DRIVER ASSIGNMENTS HUB
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'assignments' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                    <span>Vehicle & Driver Assignment Control</span>
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Assign dedicated authorized drivers to company vehicles. Reassignment automatically preserves past transport logs.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {driverKpis?.availableDrivers || 0} Drivers Ready for Assignment
                                </span>
                            </div>
                        </div>

                        {/* Assignments Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                        <th className="px-4 py-3">Vehicle</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Vehicle Status</th>
                                        <th className="px-4 py-3">Assigned Driver</th>
                                        <th className="px-4 py-3">Driver Contact</th>
                                        <th className="px-4 py-3">Licence Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                    {vehicles.map(vehicle => {
                                        const assignedDriver = driversList.find(d => d._id === vehicle.assignedDriverRef);
                                        const isExpired = assignedDriver?.isLicenseExpired;

                                        return (
                                            <tr key={vehicle._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-4 py-3 font-bold whitespace-nowrap">
                                                    <div className="font-mono font-black text-slate-900 dark:text-white">
                                                        {vehicle.registrationNumber}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-normal">{vehicle.vehicleName}</div>
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                                    {vehicle.vehicleType}
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                        vehicle.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        vehicle.status === 'On Trip' ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse' :
                                                        'bg-rose-50 text-rose-600 border border-rose-200'
                                                    }`}>
                                                        {vehicle.status}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {assignedDriver ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                                                {assignedDriver.name.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-slate-900 dark:text-white">{assignedDriver.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {assignedDriver ? (
                                                        <span className="font-medium text-slate-600 dark:text-slate-400">{assignedDriver.phone}</span>
                                                    ) : '-'}
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {assignedDriver ? (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {isExpired ? 'Licence Expired' : 'Licence Valid'}
                                                        </span>
                                                    ) : '-'}
                                                </td>

                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenAssignModal(
                                                                assignedDriver || { _id: '', name: 'Unassigned', currentAssignedVehicle: { vehicleId: vehicle._id } },
                                                                vehicle._id
                                                            )}
                                                            className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition"
                                                        >
                                                            {assignedDriver ? 'Change Driver' : 'Assign Driver'}
                                                        </button>

                                                        {assignedDriver && (
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Unassign ${assignedDriver.name} from vehicle ${vehicle.registrationNumber}?`)) return;
                                                                    try {
                                                                        await api.post(`/vehicles/drivers/${assignedDriver._id}/assign`, {
                                                                            vehicleId: null,
                                                                            reason: 'Unassigned via Assignment Hub'
                                                                        });
                                                                        showToast(`Driver unassigned.`);
                                                                        fetchDriversData();
                                                                        fetchVehicles();
                                                                    } catch (err) {
                                                                        showToast(err.response?.data?.message || err.message, true);
                                                                    }
                                                                }}
                                                                className="px-2 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition"
                                                                title="Remove Driver Assignment"
                                                            >
                                                                Unassign
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 4: TRIP MANAGEMENT & REAL-TIME MONITORING
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'trips' && (
                <div className="space-y-6">
                    <TripManagementTab />
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: REGISTER COMPANY VEHICLE (INTEGRATED DRIVER DROPDOWN)
            ════════════════════════════════════════════════════════════════ */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-emerald-600" />
                                    <span>Register Company Vehicle</span>
                                </h3>
                                <p className="text-[11px] text-slate-400">Add a new commercial vehicle to the company fleet.</p>
                            </div>
                            <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterVehicle} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Registration Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="KL-09-AH-3829"
                                        value={registerForm.registrationNumber}
                                        onChange={(e) => setRegisterForm({ ...registerForm, registrationNumber: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold uppercase font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Vehicle Name / Model *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Tata 407 Flatbed Truck"
                                        value={registerForm.vehicleName}
                                        onChange={(e) => setRegisterForm({ ...registerForm, vehicleName: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Vehicle Type *</label>
                                    <select
                                        value={registerForm.vehicleType}
                                        onChange={(e) => setRegisterForm({ ...registerForm, vehicleType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        {VEHICLE_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">Assigned Driver</label>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenAddDriver(true)}
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>Add New</span>
                                        </button>
                                    </div>
                                    <select
                                        value={registerForm.assignedDriverId}
                                        onChange={(e) => {
                                            const dId = e.target.value;
                                            const selectedD = eligibleDrivers.find(d => d._id === dId);
                                            setRegisterForm({
                                                ...registerForm,
                                                assignedDriverId: dId,
                                                driverLicenseNumber: selectedD?.licenseNumber || ''
                                            });
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="">Unassigned</option>
                                        {eligibleDrivers.map(d => (
                                            <option key={d._id} value={d._id}>
                                                {d.name} ({d.phone}) • {d.licenseType}{d.isAssigned ? ' [Assigned]' : ' [Available]'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Odometer (km)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={registerForm.currentOdometer}
                                        onChange={(e) => setRegisterForm({ ...registerForm, currentOdometer: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Fuel Type</label>
                                    <select
                                        value={registerForm.fuelType}
                                        onChange={(e) => setRegisterForm({ ...registerForm, fuelType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="Diesel">Diesel</option>
                                        <option value="Petrol">Petrol</option>
                                        <option value="Electric">Electric</option>
                                        <option value="CNG">CNG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Tank Capacity (L)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={registerForm.tankCapacityLiters}
                                        onChange={(e) => setRegisterForm({ ...registerForm, tankCapacityLiters: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Notes / Description</label>
                                <textarea
                                    rows="2"
                                    placeholder="Optional notes regarding vehicle condition, yard location..."
                                    value={registerForm.notes}
                                    onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                                >
                                    Save Vehicle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: REGISTER / EDIT DRIVER
            ════════════════════════════════════════════════════════════════ */}
            {showDriverModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                    <span>{editingDriver ? 'Edit Driver Profile' : 'Register New Driver'}</span>
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {isFromVehicleForm ? 'Register driver directly and return to vehicle form with driver selected.' : 'Authorized driver records, licence verification, and emergency contacts.'}
                                </p>
                            </div>
                            <button onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDriver} className="space-y-3.5 text-xs">
                            {/* Optional Link to Existing Staff Member */}
                            {!editingDriver && staffCandidates.length > 0 && (
                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                                    <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block mb-1">
                                        Link to Existing Employee (Optional)
                                    </label>
                                    <select
                                        value={driverForm.employeeId}
                                        onChange={(e) => {
                                            const empId = e.target.value;
                                            if (!empId) {
                                                setDriverForm({ ...driverForm, employeeId: '', staff_id: '' });
                                                return;
                                            }
                                            const cand = staffCandidates.find(c => c._id === empId);
                                            if (cand) {
                                                setDriverForm({
                                                    ...driverForm,
                                                    employeeId: cand._id,
                                                    name: cand.name || driverForm.name,
                                                    phone: cand.phone || driverForm.phone,
                                                    staff_id: cand.staff_id || '',
                                                    address: cand.address || driverForm.address,
                                                    emergencyPhone: cand.emergencyContact || driverForm.emergencyPhone
                                                });
                                            }
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-2 text-xs font-bold"
                                    >
                                        <option value="">-- Standalone Driver (Not a staff user) --</option>
                                        {staffCandidates.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.phone}) • {c.designation || 'Staff'} [ID: {c.staff_id || 'N/A'}]
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Linking an employee prevents duplicate profiles and syncs employee contact details.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Driver Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Suresh Kumar"
                                        value={driverForm.name}
                                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Mobile / Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+91 98765 43210"
                                        value={driverForm.phone}
                                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Driving Licence Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="KL-09-20150001234"
                                        value={driverForm.licenseNumber}
                                        onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold uppercase font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Licence Type *</label>
                                    <select
                                        value={driverForm.licenseType}
                                        onChange={(e) => setDriverForm({ ...driverForm, licenseType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        {LICENSE_TYPES.map(lt => (
                                            <option key={lt} value={lt}>{lt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Licence Expiry Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={driverForm.licenseExpiryDate}
                                        onChange={(e) => setDriverForm({ ...driverForm, licenseExpiryDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Emergency Mobile</label>
                                    <input
                                        type="tel"
                                        placeholder="Family Contact"
                                        value={driverForm.emergencyPhone}
                                        onChange={(e) => setDriverForm({ ...driverForm, emergencyPhone: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Status</label>
                                    <select
                                        value={driverForm.status}
                                        onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Residential Address</label>
                                <input
                                    type="text"
                                    placeholder="Street, Town, District, PIN..."
                                    value={driverForm.address}
                                    onChange={(e) => setDriverForm({ ...driverForm, address: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Additional Notes</label>
                                <input
                                    type="text"
                                    placeholder="Badge number, training certifications, experience..."
                                    value={driverForm.notes}
                                    onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            {/* Driver Portal Authentication Section */}
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-indigo-600" />
                                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                            Driver Portal & Mobile App Access
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={driverForm.enablePortalLogin}
                                            onChange={(e) => setDriverForm({ ...driverForm, enablePortalLogin: e.target.checked })}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        Enable Login
                                    </label>
                                </div>

                                {driverForm.enablePortalLogin && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                                Login Email / Username
                                            </label>
                                            <input
                                                type="email"
                                                placeholder={driverForm.phone ? `${driverForm.phone.replace(/\D/g, '')}@driver.krishna.com` : 'driver@krishna.com'}
                                                value={driverForm.email}
                                                onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Leave empty to auto-generate using mobile number.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                                {editingDriver ? 'New Password (Optional)' : 'Initial Password *'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={editingDriver ? 'Leave blank to keep unchanged' : 'Minimum 6 chars'}
                                                value={driverForm.password}
                                                onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-medium"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Driver can use mobile or email with this password to log in.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowDriverModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                                >
                                    {editingDriver ? 'Update Driver Profile' : isFromVehicleForm ? 'Save & Select in Vehicle' : 'Register Driver'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: DRIVER PROFILE & TRIP HISTORY
            ════════════════════════════════════════════════════════════════ */}
            {showDriverProfileModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-6">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                                    {selectedDriverProfile?.driver?.name?.charAt(0) || 'D'}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>{selectedDriverProfile?.driver?.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            selectedDriverProfile?.driver?.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {selectedDriverProfile?.driver?.status}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Licence: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedDriverProfile?.driver?.licenseNumber}</span> • {selectedDriverProfile?.driver?.licenseType}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDriverProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {profileLoading ? (
                            <div className="p-12 text-center text-slate-400 font-bold">Loading driver profile and trip history...</div>
                        ) : selectedDriverProfile ? (
                            <div className="space-y-4 text-xs">
                                {/* Summary Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Vehicle</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {selectedDriverProfile.driver.currentAssignedVehicle?.registrationNumber || 'Currently Available'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Trips</span>
                                        <span className="font-black text-indigo-600 font-mono text-sm">
                                            {selectedDriverProfile.metrics?.totalTrips || 0}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Distance</span>
                                        <span className="font-black text-emerald-600 font-mono text-sm">
                                            {selectedDriverProfile.metrics?.totalKmDriven?.toLocaleString() || 0} km
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Licence Expiry</span>
                                        <span className={`font-black ${
                                            selectedDriverProfile.driver.isLicenseExpired ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                                        }`}>
                                            {new Date(selectedDriverProfile.driver.licenseExpiryDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Contact & Address */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Mobile Phone</span>
                                        <span className="font-bold">{selectedDriverProfile.driver.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Emergency Contact</span>
                                        <span className="font-bold">{selectedDriverProfile.driver.emergencyPhone || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Address</span>
                                        <span className="font-medium text-slate-600 dark:text-slate-300">{selectedDriverProfile.driver.address || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Assignment History */}
                                <div className="space-y-2">
                                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <History className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Vehicle Assignment History</span>
                                    </h4>
                                    {(!selectedDriverProfile.driver.assignmentHistory || selectedDriverProfile.driver.assignmentHistory.length === 0) ? (
                                        <p className="text-slate-400 italic text-xs">No prior vehicle assignment records.</p>
                                    ) : (
                                        <div className="overflow-x-auto max-h-40 overflow-y-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                                                        <th className="px-3 py-1.5">Vehicle</th>
                                                        <th className="px-3 py-1.5">Assigned On</th>
                                                        <th className="px-3 py-1.5">Unassigned On</th>
                                                        <th className="px-3 py-1.5">Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {selectedDriverProfile.driver.assignmentHistory.map((h, i) => (
                                                        <tr key={i}>
                                                            <td className="px-3 py-1.5 font-bold font-mono text-indigo-600">{h.registrationNumber} ({h.vehicleName})</td>
                                                            <td className="px-3 py-1.5 text-slate-500">{new Date(h.assignedAt).toLocaleDateString()}</td>
                                                            <td className="px-3 py-1.5 text-slate-500">{h.unassignedAt ? new Date(h.unassignedAt).toLocaleDateString() : <span className="text-emerald-600 font-bold">Currently Active</span>}</td>
                                                            <td className="px-3 py-1.5 text-slate-400">{h.reason || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Trip History */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Driver Trip History ({selectedDriverProfile.tripHistory?.length || 0})</span>
                                    </h4>
                                    {(!selectedDriverProfile.tripHistory || selectedDriverProfile.tripHistory.length === 0) ? (
                                        <p className="text-slate-400 italic text-xs">No trips logged yet under this driver.</p>
                                    ) : (
                                        <div className="overflow-x-auto max-h-48 overflow-y-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                                                        <th className="px-3 py-1.5">Date</th>
                                                        <th className="px-3 py-1.5">Vehicle</th>
                                                        <th className="px-3 py-1.5">Destination</th>
                                                        <th className="px-3 py-1.5 text-center">Distance (km)</th>
                                                        <th className="px-3 py-1.5">Purpose</th>
                                                        <th className="px-3 py-1.5">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {selectedDriverProfile.tripHistory.map((t, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-3 py-1.5 text-slate-400">{new Date(t.date || t.completedAt).toLocaleDateString()}</td>
                                                            <td className="px-3 py-1.5 font-mono font-bold">{t.vehicleRegistration}</td>
                                                            <td className="px-3 py-1.5 font-semibold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openGoogleMapsNavigation(t)}
                                                                    className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 text-left font-bold"
                                                                    title="Open Destination in Google Maps"
                                                                >
                                                                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                    <span>{t.destination}</span>
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center font-bold text-slate-900 dark:text-white font-mono">{t.distanceKm || 0} km</td>
                                                            <td className="px-3 py-1.5 text-slate-500">{t.purpose}</td>
                                                            <td className="px-3 py-1.5">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                    t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                                                }`}>
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: QUICK ASSIGN DRIVER TO VEHICLE
            ════════════════════════════════════════════════════════════════ */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    {assignTargetDriver?.name !== 'Unassigned' ? `Assign Driver: ${assignTargetDriver?.name}` : 'Assign Driver to Vehicle'}
                                </h3>
                                <p className="text-[11px] text-slate-400">Select target vehicle or unassign.</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteAssignment} className="space-y-3.5 text-xs">
                            {/* If opened without a specific driver selected */}
                            {(!assignTargetDriver?._id || assignTargetDriver.name === 'Unassigned') && (
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Select Driver *</label>
                                    <select
                                        required
                                        value={assignTargetDriver?._id || ''}
                                        onChange={(e) => {
                                            const d = driversList.find(drv => drv._id === e.target.value);
                                            setAssignTargetDriver(d);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="">-- Choose Eligible Driver --</option>
                                        {eligibleDrivers.map(d => (
                                            <option key={d._id} value={d._id}>
                                                {d.name} ({d.phone}) • {d.licenseType}{d.isAssigned ? ' [Assigned]' : ' [Available]'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Vehicle *</label>
                                <select
                                    value={assignTargetVehicleId}
                                    onChange={(e) => setAssignTargetVehicleId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="">-- Leave Unassigned --</option>
                                    {vehicles.map(v => (
                                        <option key={v._id} value={v._id}>
                                            {v.registrationNumber} — {v.vehicleName} ({v.vehicleType}) {v.assignedDriverName ? `[Current: ${v.assignedDriverName}]` : '[Unassigned]'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Assignment Reason / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Site delivery route dispatch, driver rotation..."
                                    value={assignReason}
                                    onChange={(e) => setAssignReason(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                                >
                                    Confirm Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: RESET DRIVER PASSWORD
            ════════════════════════════════════════════════════════════════ */}
            {showResetPasswordModal && targetDriverForReset && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-violet-100 dark:bg-violet-900/40 text-violet-600 rounded-xl">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        Reset Driver Password
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        {targetDriverForReset.name} ({targetDriverForReset.phone})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowResetPasswordModal(false); setTargetDriverForReset(null); }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                    New Portal Password *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter new strong password (min 6 characters)"
                                    value={newPasswordValue}
                                    onChange={(e) => setNewPasswordValue(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold"
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    This will update the linked credentials immediately. The driver will be able to log in to the driver portal with this new password.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => { setShowResetPasswordModal(false); setTargetDriverForReset(null); }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resettingPassword}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/20 disabled:opacity-50"
                                >
                                    {resettingPassword ? 'Updating Password...' : 'Save New Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: DRIVER ROLE PERMISSIONS MANAGER (ADMIN ONLY)
            ════════════════════════════════════════════════════════════════ */}
            {showPermissionsModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-2xl">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        Driver Role Permissions Manager
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Grant or revoke granular driver management authority for Managers and Staff.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPermissionsModal(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Security notice alert */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 shrink-0">
                            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                            <div>
                                <span className="font-bold">ERP Security Enforcement: </span>
                                Staff members can perform operational tasks (assigning vehicles/trips, viewing reports and documents) but are strictly prohibited from creating, deleting, activating, deactivating, or resetting passwords for drivers.
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                            {permissionsLoading ? (
                                <div className="text-center py-12">
                                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-slate-500 font-bold">Loading users and permissions...</p>
                                </div>
                            ) : permissionsUsers.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs">No Manager or Staff users found in the system.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {permissionsUsers.map(user => {
                                        const userRoleNorm = (user.role || '').toLowerCase();
                                        const isAdmin = userRoleNorm === 'admin';
                                        const isStaff = userRoleNorm === 'staff';
                                        const userPerms = isAdmin
                                            ? allPermissionsList.map(p => typeof p === 'string' ? p : p.key)
                                            : (user.permissions || user.driverPermissions || []);
                                        const isBusy = updatingPermUserId === user._id;

                                        return (
                                            <div
                                                key={user._id}
                                                className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3"
                                            >
                                                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-xs text-slate-900 dark:text-white">
                                                                    {user.name}
                                                                </h4>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                    isAdmin
                                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                                        : userRoleNorm === 'manager'
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                }`}>
                                                                    {user.role}
                                                                </span>
                                                                {user.designation && (
                                                                    <span className="text-[10px] text-slate-400">
                                                                        • {user.designation}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400">{user.email || user.phone}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-[11px] font-bold text-slate-500">
                                                        {isAdmin ? (
                                                            <span className="text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                                                                Full Administrator Authority (All Permissions Active)
                                                            </span>
                                                        ) : (
                                                            <>
                                                                Active Permissions: <span className="text-indigo-600 font-black">{userPerms.length}</span> / {allPermissionsList.length}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Permission Items */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                    {allPermissionsList.map(perm => {
                                                        const permKey = typeof perm === 'string' ? perm : perm.key;
                                                        const meta = FALLBACK_DRIVER_PERMISSIONS[permKey] || {};
                                                        const permLabel = perm?.label || meta.label || permKey;
                                                        const permDesc = perm?.description || meta.description || '';

                                                        const isProhibited = isStaff && prohibitedList.includes(permKey);
                                                        const hasPerm = isAdmin || userPerms.includes(permKey);
                                                        const isCardDisabled = isAdmin || isProhibited || isBusy;

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={permKey}
                                                                disabled={isCardDisabled}
                                                                onClick={() => handleToggleUserPermission(user, permKey)}
                                                                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 select-none ${
                                                                    isAdmin
                                                                        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 text-slate-800 dark:text-slate-200 cursor-default'
                                                                        : isProhibited
                                                                        ? 'bg-slate-100 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed'
                                                                        : hasPerm
                                                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-xs cursor-pointer'
                                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <div className="mt-0.5 shrink-0">
                                                                    {isProhibited ? (
                                                                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                                                                    ) : hasPerm ? (
                                                                        <div className="w-3.5 h-3.5 rounded bg-indigo-600 text-white flex items-center justify-center">
                                                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600" />
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="text-[11px] font-bold truncate text-slate-800 dark:text-slate-200">
                                                                            {permLabel}
                                                                        </span>
                                                                        {isProhibited && (
                                                                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.2 rounded">
                                                                                PROHIBITED
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                                                        {permDesc}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowPermissionsModal(false)}
                                className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-black transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: EMERGENCY SOS HOTLINES & FACTORY CONTACTS (ADMIN EDITABLE)
            ════════════════════════════════════════════════════════════════ */}
            {showHotlinesModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col font-sans">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        Driver Emergency SOS Hotlines
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        These 24/7 contact numbers are displayed to drivers on the mobile portal Emergency SOS screen.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHotlinesModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Editable Contact Rows */}
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                            {loadingHotlines ? (
                                <div className="p-10 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                                    Loading active emergency hotlines...
                                </div>
                            ) : emergencyHotlines.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 font-bold">
                                    No emergency hotlines configured. Click below to add one.
                                </div>
                            ) : (
                                emergencyHotlines.map((contact, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 relative group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                <PhoneCall className="w-3.5 h-3.5" /> Hotline #{idx + 1}
                                            </span>
                                            {emergencyHotlines.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveHotlineRow(idx)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                                                    title="Remove this contact"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                                    Desk / Contact Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={(e) => handleUpdateHotlineField(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Fleet Operations Desk"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                                    Role / Department
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contact.role}
                                                    onChange={(e) => handleUpdateHotlineField(idx, 'role', e.target.value)}
                                                    placeholder="e.g. Fleet Manager / HQ"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                                    Phone Number (Calling / SOS) *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={contact.phone}
                                                    onChange={(e) => handleUpdateHotlineField(idx, 'phone', e.target.value)}
                                                    placeholder="e.g. +91 98450 12345 or 112"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                                    Availability Status
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contact.available}
                                                    onChange={(e) => handleUpdateHotlineField(idx, 'available', e.target.value)}
                                                    placeholder="e.g. 24/7 Emergency or Business Hours"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <button
                                type="button"
                                onClick={handleAddHotlineRow}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-dashed border-slate-300 dark:border-slate-700"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Another Emergency Hotline</span>
                            </button>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium text-center sm:text-left">
                                Changes take effect immediately across all driver mobile portals.
                            </span>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowHotlinesModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={savingHotlines}
                                    onClick={handleSaveEmergencyHotlines}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50 transition active:scale-95"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{savingHotlines ? 'Saving...' : 'Save Hotlines'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: RECORD VEHICLE TRIP (WITH DRIVER INTEGRATION)
            ════════════════════════════════════════════════════════════════ */}
            {showTripModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Navigation className="w-5 h-5 text-indigo-600" />
                                    <span>Record Vehicle Trip</span>
                                </h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber} — {selectedVehicle.vehicleName}</p>
                            </div>
                            <button onClick={() => setShowTripModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordTrip} className="space-y-3.5 text-xs">
                            {/* Trip Driver Selector */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Actual Driver for Trip *</label>
                                <select
                                    value={tripForm.driverId}
                                    onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    {selectedVehicle.assignedDriverName && (
                                        <option value={selectedVehicle.assignedDriverRef || selectedVehicle.assignedDriverId || ''}>
                                            Vehicle's Assigned Driver: {selectedVehicle.assignedDriverName} ({selectedVehicle.assignedDriverPhone || 'Default'})
                                        </option>
                                    )}
                                    {eligibleDrivers.filter(d => d._id !== (selectedVehicle.assignedDriverRef || selectedVehicle.assignedDriverId)).map(d => (
                                        <option key={d._id} value={d._id}>
                                            {d.name} ({d.phone}) • {d.licenseType}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Linked Project (Optional)</label>
                                <select
                                    value={tripForm.projectId}
                                    onChange={(e) => setTripForm({ ...tripForm, projectId: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="">General Delivery / Internal Logistics</option>
                                    {projects.map(p => (
                                        <option key={p._id} value={p._id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Starting Location</label>
                                    <input
                                        type="text"
                                        placeholder="Workshop / Central Yard"
                                        value={tripForm.startLocation}
                                        onChange={(e) => setTripForm({ ...tripForm, startLocation: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Destination Site *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Palakkad Site A"
                                        value={tripForm.destination}
                                        onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Start Odometer (km)</label>
                                    <input
                                        type="number"
                                        value={tripForm.startOdometer}
                                        onChange={(e) => setTripForm({ ...tripForm, startOdometer: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">End Odometer (if completed)</label>
                                    <input
                                        type="number"
                                        value={tripForm.endOdometer}
                                        onChange={(e) => setTripForm({ ...tripForm, endOdometer: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Trip Purpose</label>
                                <input
                                    type="text"
                                    value={tripForm.purpose}
                                    onChange={(e) => setTripForm({ ...tripForm, purpose: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="trip-completed-check"
                                    checked={tripForm.isCompleted}
                                    onChange={(e) => setTripForm({ ...tripForm, isCompleted: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="trip-completed-check" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Trip already completed (Updates odometer and releases vehicle)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowTripModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                                >
                                    Save Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: LOG FUEL EXPENSE
            ════════════════════════════════════════════════════════════════ */}
            {showFuelModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Fuel className="w-5 h-5 text-amber-500" />
                                    <span>Log Fuel Refill</span>
                                </h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber} — {selectedVehicle.vehicleName}</p>
                            </div>
                            <button onClick={() => setShowFuelModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordFuel} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Fuel Liters *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="e.g. 45.5"
                                        value={fuelForm.liters}
                                        onChange={(e) => {
                                            const l = parseFloat(e.target.value) || 0;
                                            const cpl = parseFloat(fuelForm.costPerLiter) || 0;
                                            setFuelForm({
                                                ...fuelForm,
                                                liters: e.target.value,
                                                totalCost: cpl > 0 ? (l * cpl).toFixed(2) : fuelForm.totalCost
                                            });
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Total Cost (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="Total Amount"
                                        value={fuelForm.totalCost}
                                        onChange={(e) => setFuelForm({ ...fuelForm, totalCost: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Odometer (km) *</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="Current km"
                                        value={fuelForm.odometerReading}
                                        onChange={(e) => setFuelForm({ ...fuelForm, odometerReading: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Fuel Station</label>
                                    <input
                                        type="text"
                                        value={fuelForm.fuelStation}
                                        onChange={(e) => setFuelForm({ ...fuelForm, fuelStation: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl font-bold">
                                🔒 Single Source of Truth: This automatically logs an Expense in company accounts under 'fuel'.
                            </p>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowFuelModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20"
                                >
                                    Record Fuel Refill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: LOG VEHICLE SERVICE / MAINTENANCE
            ════════════════════════════════════════════════════════════════ */}
            {showServiceModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-rose-500" />
                                    <span>Log Vehicle Service</span>
                                </h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber}</p>
                            </div>
                            <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordService} className="space-y-3.5 text-xs">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Service Type *</label>
                                <select
                                    value={serviceForm.serviceType}
                                    onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                                    <option value="Oil & Filter Change">Oil & Filter Change</option>
                                    <option value="Brake Service">Brake Service</option>
                                    <option value="Tyre Replacement">Tyre Replacement</option>
                                    <option value="Engine / Transmission Repair">Engine / Transmission Repair</option>
                                    <option value="Accident Repair">Accident Repair</option>
                                    <option value="Electrical / Battery">Electrical / Battery</option>
                                    <option value="Suspension / Wheel Alignment">Suspension / Wheel Alignment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Total Cost (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="Service Bill"
                                        value={serviceForm.totalCost}
                                        onChange={(e) => setServiceForm({ ...serviceForm, totalCost: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Odometer (km)</label>
                                    <input
                                        type="number"
                                        value={serviceForm.odometerReading}
                                        onChange={(e) => setServiceForm({ ...serviceForm, odometerReading: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Garage / Workshop Name</label>
                                <input
                                    type="text"
                                    value={serviceForm.garageName}
                                    onChange={(e) => setServiceForm({ ...serviceForm, garageName: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Service Notes / Replaced Parts</label>
                                <textarea
                                    rows="2"
                                    value={serviceForm.notes}
                                    onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <p className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl font-bold">
                                🔒 Single Source of Truth: Automatically recorded in company ledger under machinery maintenance.
                            </p>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowServiceModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                                >
                                    Save Service Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: ADD VEHICLE RENEWAL DOCUMENT
            ════════════════════════════════════════════════════════════════ */}
            {showDocModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    <span>Add Renewal Document</span>
                                </h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber}</p>
                            </div>
                            <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Document Type *</label>
                                <select
                                    value={docForm.docType}
                                    onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="Insurance Policy">Insurance Policy</option>
                                    <option value="Pollution / PUC Certificate">Pollution / PUC Certificate</option>
                                    <option value="Fitness Certificate">Fitness Certificate</option>
                                    <option value="Road Tax Permit">Road Tax Permit</option>
                                    <option value="National Permit">National Permit</option>
                                    <option value="Registration Certificate (RC)">Registration Certificate (RC)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Document / Policy No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. POL-982341"
                                        value={docForm.documentNumber}
                                        onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Expiry Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={docForm.expiryDate}
                                        onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Notes</label>
                                <input
                                    type="text"
                                    placeholder="Issuing agency, agent contact..."
                                    value={docForm.notes}
                                    onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowDocModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                                >
                                    Save Document
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Official Driver ID Card Modal */}
            {showIdCardModal && selectedDriverForIdCard && (
                <StaffIdCardModal
                    staff={selectedDriverForIdCard}
                    onClose={() => {
                        setShowIdCardModal(false);
                        setSelectedDriverForIdCard(null);
                    }}
                />
            )}
        </div>
    );
};

export default AdminFleet;
