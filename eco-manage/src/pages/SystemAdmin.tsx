import React, { useEffect, useState } from 'react';
import {
  Building2, Plus, Globe, Shield, Trash2, Edit, CheckCircle, Search,
  Mail, Phone, MapPin, BookOpen, X, Settings, UserPlus, ExternalLink,
  Activity, Server, Database, Lock, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { AVAILABLE_MODULES } from '../utils/modules';

const SystemAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { user, switchSchool } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'INSTANCES' | 'REGISTRY' | 'HEALTH' | 'TRASH'>('INSTANCES');
  const [schools, setSchools] = useState<any[]>([]);
  const [deletedSchools, setDeletedSchools] = useState<any[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [schoolSubjects, setSchoolSubjects] = useState<number[]>([]);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingFounder, setIsAddingFounder] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Password confirmation state
  const [confirmPasswordModal, setConfirmPasswordModal] = useState<{
      isOpen: boolean;
      title: string;
      description: string;
      onConfirm: (password: string) => void;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // School metadata editing states
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolMotto, setEditSchoolMotto] = useState('');
  const [editSchoolAddress, setEditSchoolAddress] = useState('');
  const [editSchoolBp, setEditSchoolBp] = useState('');
  const [editSchoolEmail, setEditSchoolEmail] = useState('');
  const [editSchoolPhone, setEditSchoolPhone] = useState('');
  const [editSchoolRequiresCode, setEditSchoolRequiresCode] = useState(1);
  const [editSchoolAllowTermEdit, setEditSchoolAllowTermEdit] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // Founder editing states
  const [editingFounder, setEditingFounder] = useState<any | null>(null);
  const [editFounderUsername, setEditFounderUsername] = useState('');
  const [editFounderFullName, setEditFounderFullName] = useState('');
  const [editFounderPassword, setEditFounderPassword] = useState('');

  const [newSchool, setNewSchool] = useState({ name: '', address: '', contact_email: '', contact_phone: '', bp: '', motto: '', requires_subject_code: 1, allow_founder_term_edit: 0, term_structure: '3_TERMS_2_SEQS' });
  const [newSubject, setNewSubject] = useState({ name: '', domain: 'Science', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
  const [newFounder, setNewFounder] = useState({ username: '', password: '', fullName: '' });
  const [founderError, setFounderError] = useState<string | null>(null);
  const [founderEditError, setFounderEditError] = useState<string | null>(null);

  const loadSchools = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getSchools();
      setSchools(data || []);
    }
  };

  const loadDeletedSchools = async () => {
    if (window.electronAPI && window.electronAPI.getDeletedSchools) {
      const data = await window.electronAPI.getDeletedSchools();
      setDeletedSchools(data || []);
    }
  };

  const loadGlobalSubjects = async () => {
    if (window.electronAPI) {
        const data = await window.electronAPI.getGlobalSubjects();
        setGlobalSubjects(data || []);
    }
  }

  useEffect(() => {
    loadSchools();
    loadGlobalSubjects();
    loadDeletedSchools();
  }, []);

  const loadErrorLogs = async () => {
      if (window.electronAPI) {
          setIsLoadingLogs(true);
          try {
              const logs = await (window.electronAPI as any).getErrorLogs();
              setErrorLogs(logs || t('sys_no_error_logs_detected'));
          } catch (err: any) {
              setErrorLogs(t('sys_error_loading_logs', { message: err.message }));
          } finally {
              setIsLoadingLogs(false);
          }
      }
  };

  const clearErrorLogs = async () => {
      if (!window.confirm(t('sys_alert_logs_clear_confirm'))) return;
      if (window.electronAPI) {
          try {
              await (window.electronAPI as any).clearErrorLogs();
              setErrorLogs(t('sys_alert_logs_cleared'));
          } catch (err: any) {
              alert(t('sys_alert_logs_clear_error') + ': ' + err.message);
          }
      }
  };

  useEffect(() => {
      if (activeTab === 'HEALTH') {
          loadErrorLogs();
      } else if (activeTab === 'TRASH') {
          loadDeletedSchools();
      }
  }, [activeTab]);

  const handleAddSchool = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSchool.name.trim() || !newSchool.address.trim()) {
          alert(t('sys_alert_school_required'));
          return;
      }

      let cleanPhone = newSchool.contact_phone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.startsWith('237') && cleanPhone.length > 9) {
          cleanPhone = cleanPhone.slice(3);
      }
      if (cleanPhone && !/^(2|6)\d{8}$/.test(cleanPhone)) {
          alert(t('sys_alert_phone_invalid'));
          return;
      }

      if (window.electronAPI) {
          await window.electronAPI.addSchool({
              ...newSchool,
              contact_phone: cleanPhone
          });
          setNewSchool({ name: '', address: '', contact_email: '', contact_phone: '', bp: '', motto: '', requires_subject_code: 1, allow_founder_term_edit: 0, term_structure: '3_TERMS_2_SEQS' });
          setIsAdding(false);
          loadSchools();
      }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (window.electronAPI) {
          try {
              const res = await window.electronAPI.addGlobalSubject(newSubject);
              if (res?.error) {
                  showNotification(res.error, "error");
              } else {
                  showNotification(t('sys_subject_added_global', { name: newSubject.name }), "success");
                  setNewSubject({ name: '', domain: 'Sciences et Technologie', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
                  setIsAddingSubject(false);
                  loadGlobalSubjects();
              }
          } catch (err: any) {
              showNotification(err.message || t('sys_error_adding_subject'), "error");
          }
      }
  }

  const handleAddFounder = async (e: React.FormEvent) => {
      e.preventDefault();
      setFounderError(null);
      if (!selectedSchool || !window.electronAPI) return;

      try {
          const res = await window.electronAPI.addUser({
              ...newFounder,
              role: 'FOUNDER',
              schoolId: selectedSchool.id
          });
          
          if (res && res.error) {
              setFounderError(res.error);
              return;
          }

          setNewFounder({ username: '', password: '', fullName: '' });
          setIsAddingFounder(false);
          // Reload users for this school
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
      } catch (err: any) {
          setFounderError(err.message);
      }
  }

  const startEditFounder = (founder: any) => {
      setFounderEditError(null);
      setEditingFounder(founder);
      setEditFounderUsername(founder.username || '');
      setEditFounderFullName(founder.fullName || '');
      setEditFounderPassword('');
  };

  const handleUpdateFounder = async () => {
      setFounderEditError(null);
      if (!editingFounder || !selectedSchool || !window.electronAPI) return;
      try {
          const res = await window.electronAPI.updateUser({
              id: editingFounder.id,
              username: editFounderUsername,
              fullName: editFounderFullName,
              password: editFounderPassword || undefined
          });

          if (res && res.error) {
              setFounderEditError(res.error);
              return;
          }

          setEditingFounder(null);
          setEditFounderPassword('');
          alert(t('sys_founder_updated_success'));
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
      } catch (err: any) {
          setFounderEditError(err.message);
      }
  };

  const openSchoolDetail = async (school: any) => {
      setSelectedSchool(school);
      setEditSchoolName(school.name || '');
      setEditSchoolMotto(school.motto || '');
      setEditSchoolAddress(school.address || '');
      setEditSchoolBp(school.bp || '');
      setEditSchoolEmail(school.contact_email || '');
      setEditSchoolPhone(school.contact_phone || '');
      setEditSchoolRequiresCode(school.requires_subject_code !== undefined ? school.requires_subject_code : 1);
      setEditSchoolAllowTermEdit(school.allow_founder_term_edit !== undefined ? school.allow_founder_term_edit : 0);
      setIsEditingMetadata(false);

      if (window.electronAPI) {
          const activeSubs = await window.electronAPI.getSchoolSubjects(school.id);
          setSchoolSubjects(activeSubs.filter((s: any) => s.is_active).map((s: any) => s.id));

          const users = await window.electronAPI.getUsers(school.id);
          setSchoolUsers(users || []);

          try {
              const disabled = await (window.electronAPI as any).getDisabledModules(school.id);
              setDisabledModules(disabled || []);
          } catch(e) { setDisabledModules([]); }
      }
  }

  const handleToggleModule = async (moduleKey: string) => {
      if (!selectedSchool || !window.electronAPI) return;
      const newDisabled = disabledModules.includes(moduleKey)
          ? disabledModules.filter(m => m !== moduleKey)
          : [...disabledModules, moduleKey];
      setDisabledModules(newDisabled);
      try {
          await (window.electronAPI as any).setDisabledModules({ schoolId: selectedSchool.id, modules: newDisabled });
      } catch(e: any) {
          showNotification(e.message, "error");
          setDisabledModules(disabledModules);
      }
  };

  const handleSaveMetadata = async () => {
      if (!selectedSchool || !window.electronAPI) return;

      let cleanPhone = editSchoolPhone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.startsWith('237') && cleanPhone.length > 9) {
          cleanPhone = cleanPhone.slice(3);
      }
      if (cleanPhone && !/^(2|6)\d{8}$/.test(cleanPhone)) {
          alert(t('sys_alert_phone_invalid'));
          return;
      }

      try {
          const res = await window.electronAPI.updateSchoolSettings({
              id: selectedSchool.id,
              name: editSchoolName,
              motto: editSchoolMotto,
              address: editSchoolAddress,
              bp: editSchoolBp,
              contact_email: editSchoolEmail,
              contact_phone: cleanPhone,
              primary_color: selectedSchool.primary_color || '#1e293b',
              secondary_color: selectedSchool.secondary_color || '#f59e0b',
              receipt_sig_title: selectedSchool.receipt_sig_title || "Signature de l'Économe",
              bulletin_sig_left: selectedSchool.bulletin_sig_left || "L'ENSEIGNANT (TEACHER)",
              bulletin_sig_middle: selectedSchool.bulletin_sig_middle || "PARENT / GUARDIAN",
              bulletin_sig_right: selectedSchool.bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)",
              header_french: selectedSchool.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE",
              header_english: selectedSchool.header_english || "MINISTRY OF BASIC EDUCATION",
              bulletin_pdf_use_custom: selectedSchool.bulletin_pdf_use_custom || 0,
              bulletin_pdf_template: selectedSchool.bulletin_pdf_template || '',
              bulletin_pdf_mapping: selectedSchool.bulletin_pdf_mapping || '{}'
          });

          if (res && res.error) {
              throw new Error(res.error);
          }

          if ((window.electronAPI as any).updateSchoolSuperAdminSettings) {
              await (window.electronAPI as any).updateSchoolSuperAdminSettings({
                  schoolId: selectedSchool.id,
                  requiresSubjectCode: editSchoolRequiresCode,
                  allowFounderTermEdit: editSchoolAllowTermEdit
              });
          }

          const updatedSchool = {
              ...selectedSchool,
              name: editSchoolName,
              motto: editSchoolMotto,
              address: editSchoolAddress,
              bp: editSchoolBp,
              contact_email: editSchoolEmail,
              contact_phone: cleanPhone,
              requires_subject_code: editSchoolRequiresCode,
              allow_founder_term_edit: editSchoolAllowTermEdit
          };
          setSelectedSchool(updatedSchool);
          setIsEditingMetadata(false);
          loadSchools();
          alert(t('sys_alert_metadata_success'));
      } catch (err: any) {
          alert(t('sys_alert_metadata_error') + ": " + err.message);
      }
  };

  const toggleSchoolSubject = async (subjectId: number) => {
      if (!selectedSchool || !window.electronAPI) return;
      const isActive = schoolSubjects.includes(subjectId);
      await window.electronAPI.toggleSchoolSubject({ schoolId: selectedSchool.id, subjectId, isActive: !isActive });

      if (isActive) {
          setSchoolSubjects(schoolSubjects.filter(id => id !== subjectId));
      } else {
          setSchoolSubjects([...schoolSubjects, subjectId]);
      }
  }

  const handleRenewSubscription = async (months: number, amount: number) => {
      if (!selectedSchool || !window.electronAPI) return;
      if (!window.confirm(t('sys_confirm_payment_reception', { amount, months }))) return;

      try {
          if ((window.electronAPI as any).validatePayment) {
              await (window.electronAPI as any).validatePayment({
                  schoolId: selectedSchool.id,
                  monthsGranted: months,
                  amount: amount,
                  superAdminId: user?.id
              });
              alert(t('sys_payment_validated_success'));
              loadSchools();
              // Update local state to close the menu if needed
              setSelectedSchool({...selectedSchool, subscription_status: 'ACTIVE'});
          } else {
              alert(t('sys_api_not_connected'));
          }
      } catch (err: any) {
          alert(t('sys_error') + ': ' + err.message);
      }
  };

  const handleDeleteSchool = (id: number, name: string) => {
      setConfirmPasswordInput('');
      setConfirmPasswordError('');
      setConfirmPasswordModal({
          isOpen: true,
          title: t('delete_school_title'),
          description: t('sys_delete_school_desc', { name }),
          onConfirm: async (password) => {
              if (!password || password.trim() === '') {
                  setConfirmPasswordError(t('sys_password_cannot_be_empty'));
                  return;
              }
              if (window.electronAPI) {
                  try {
                      const res = await window.electronAPI.deleteSchool({ id, password: password.trim() });
                      if (res && res.error) {
                          setConfirmPasswordError(res.error);
                      } else {
                          setConfirmPasswordModal(prev => ({ ...prev, isOpen: false }));
                          showNotification(t('sys_school_trashed_success', { name }), "success");
                          loadSchools();
                          loadDeletedSchools();
                      }
                  } catch (err: any) {
                      setConfirmPasswordError(err.message);
                  }
              }
          }
      });
  };

  const handlePermanentlyDeleteSchool = (id: number, name: string) => {
      setConfirmPasswordInput('');
      setConfirmPasswordError('');
      setConfirmPasswordModal({
          isOpen: true,
          title: t('sys_permanent_delete_title'),
          description: t('sys_permanent_delete_desc', { name }),
          onConfirm: async (password) => {
              if (!password || password.trim() === '') {
                  setConfirmPasswordError(t('sys_password_cannot_be_empty'));
                  return;
              }
              if (window.electronAPI && window.electronAPI.permanentlyDeleteSchool) {
                  try {
                      const res = await window.electronAPI.permanentlyDeleteSchool({ id, password: password.trim() });
                      if (res && res.error) {
                          setConfirmPasswordError(res.error);
                      } else {
                          setConfirmPasswordModal(prev => ({ ...prev, isOpen: false }));
                          showNotification(t('sys_school_deleted_permanently', { name }), "success");
                          loadDeletedSchools();
                      }
                  } catch (err: any) {
                      setConfirmPasswordError(err.message);
                  }
              }
          }
      });
  };

  const handleDeleteSubject = async (id: number) => {
      if (!window.confirm(t('sys_confirm_delete_subject'))) return;
      if (window.electronAPI) {
          await window.electronAPI.deleteGlobalSubject(id);
          loadGlobalSubjects();
      }
  };

  const handleDeleteFounder = async (id: number) => {
      if (!window.confirm(t('sys_confirm_remove_founder_access'))) return;
      if (window.electronAPI && selectedSchool) {
          await window.electronAPI.deleteUser(id);
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
      }
  };

  if (user?.role !== 'SUPERADMIN') return (
    <div className="p-20 text-center bg-slate-950 h-screen flex flex-col items-center justify-center">
      <div className="p-6 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20">
        <Lock className="w-12 h-12 text-rose-500" />
      </div>
      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{t('sys_space_restricted', 'Maintenance Space Restricted')}</h2>
      <p className="text-slate-500 mt-4 max-w-md font-medium">{t('sys_space_restricted_desc', 'This workspace is reserved for system administrators and maintenance personnel.')}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Maintenance Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest">{t('sys_core_version')}</div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic">ECO-HUB <span className="text-amber-500">ROOT</span></h1>
          <p className="text-slate-500 mt-2 uppercase text-[10px] font-black tracking-[0.4em]">{t('sys_infra_monitoring')}</p>
        </div>

        <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-2xl gap-1">
            {[
              { id: 'INSTANCES', label: t('sys_tab_instances'), icon: Server },
              { id: 'REGISTRY', label: t('sys_tab_registry'), icon: Database },
              { id: 'HEALTH', label: t('sys_tab_status'), icon: Activity },
              { id: 'TRASH', label: t('sys_tab_trash'), icon: Trash2 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === tab.id ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {activeTab === 'INSTANCES' && (
        <div className="space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{t('sys_active_schools')}</p>
                <p className="text-5xl font-black text-white tracking-tighter">{schools.length}</p>
                <div className="mt-6 flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle className="w-4 h-4" /> {t('sys_nodes_stable')}
                </div>
              </div>
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{t('sys_global_storage')}</p>
                <p className="text-5xl font-black text-white tracking-tighter">1.2<span className="text-xl">GB</span></p>
                <div className="mt-6 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[15%]" />
                </div>
              </div>
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5 md:col-span-2">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">{t('sys_maint_summary')}</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>{t('sys_db_backups')}</span>
                    <span className="text-emerald-500">{t('sys_backup_auto')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>{t('sys_encryption_protocol')}</span>
                    <span className="text-amber-500">{t('sys_aes_active')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>{t('sys_isolation_engine')}</span>
                    <span className="text-white">{t('sys_enabled')}</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic">{t('sys_inst_directory')}</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{t('sys_inst_dir_desc')}</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-8 py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black tracking-[0.2em] hover:bg-amber-500 transition-all flex items-center shadow-xl"
            >
              <Plus className="w-5 h-5 mr-3" /> {t('sys_deploy_new_instance')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {schools.map(s => (
              <div key={s.id} className="glass-card group hover:border-amber-500/50 transition-all p-0 overflow-hidden bg-slate-900/50">
                <div className="p-8 bg-slate-950/50 border-b border-white/5 flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg transform group-hover:scale-105 transition-all">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{s.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">ID: HUB-SC-{s.id.toString().padStart(3, '0')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${s.is_active !== 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {s.is_active !== 0 ? t('sys_school_active') : t('sys_school_suspended')}
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <MapPin className="w-4 h-4 text-slate-600" /> {s.address}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <Mail className="w-4 h-4 text-slate-600" /> {s.contact_email}
                  </div>
                  {s.access_code && (
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-500">{t('sys_access_code_label')}</span>
                    <span className="text-amber-500 font-black tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg">{s.access_code}</span>
                  </div>
                  )}
                  <div className="pt-4 grid grid-cols-1 gap-3">
                    <button
                      onClick={() => openSchoolDetail(s)}
                      className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:border-amber-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-500" /> {t('sys_config')}
                    </button>
                    <button
                      onClick={async () => {
                          await switchSchool(s.id);
                          navigate('/');
                      }}
                      className="w-full py-3 bg-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> {t('sys_access')}
                    </button>
                    <button
                      onClick={async () => {
                          const nextActive = s.is_active === 0 ? 1 : 0;
                          if (window.electronAPI && (window.electronAPI as any).toggleSchoolStatus) {
                              await (window.electronAPI as any).toggleSchoolStatus({ id: s.id, isActive: nextActive });
                              alert(nextActive ? t('sys_school_reactivated', { name: s.name }) : t('sys_school_suspended_msg', { name: s.name }));
                              loadSchools();
                          }
                      }}
                      className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${s.is_active !== 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950'}`}
                    >
                      {s.is_active !== 0 ? t('sys_suspend') : t('sys_activate')}
                    </button>
                    <button 
                      onClick={() => handleDeleteSchool(s.id, s.name)} 
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-white border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('sys_delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'REGISTRY' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic">{t('sys_global_subject_reg')}</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{t('sys_cameroon_modules_desc')}</p>
            </div>
            <button
              onClick={() => setIsAddingSubject(true)}
              className="px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5 mr-3" /> {t('sys_add_to_registry')}
            </button>
          </div>

          <div className="glass-card p-0 overflow-hidden border-none shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                          <th className="px-10 py-6">{t('sys_reference')}</th>
                          <th className="px-10 py-6">{t('sys_module_name')}</th>
                          <th className="px-10 py-6">{t('sys_domain')}</th>
                          <th className="px-10 py-6">{t('sys_target_level')}</th>
                          <th className="px-10 py-6">{t('sys_section')}</th>
                          <th className="px-10 py-6 text-right">{t('sys_ops')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/30">
                      {globalSubjects.map(subj => (
                          <tr key={subj.id} className="hover:bg-white/5 transition-all group">
                              <td className="px-10 py-6">
                                <span className="font-mono text-xs text-amber-500/50">SUB-{subj.id.toString().padStart(4, '0')}</span>
                              </td>
                              <td className="px-10 py-6 font-black text-white uppercase text-sm tracking-tight">{subj.name}</td>
                              <td className="px-10 py-6">
                                  <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-tight">{subj.domain}</span>
                              </td>
                              <td className="px-10 py-6 text-xs text-slate-400 font-bold uppercase tracking-widest">{subj.level}</td>
                              <td className="px-10 py-6">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${subj.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                      {subj.section}
                                  </span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                  <button onClick={() => handleDeleteSubject(subj.id)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'HEALTH' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic">{t('sys_status_diagnostic')}</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{t('sys_status_diag_desc')}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={loadErrorLogs}
                disabled={isLoadingLogs}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all animate-none"
              >
                {isLoadingLogs ? t('sys_loading_logs') : t('sys_refresh_logs')}
              </button>
              <button
                onClick={clearErrorLogs}
                className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-rose-500/20 transition-all"
              >
                {t('sys_clear_logs_btn')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-8 bg-slate-900 border-white/5">
                <h3 className="font-black text-white uppercase tracking-widest text-xs mb-6 text-amber-500">{t('sys_info')}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase">{t('sys_db_status')}</p>
                    <p className="text-sm font-bold text-white mt-1">{t('sys_db_connected')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase">{t('sys_sec_isolation')}</p>
                    <p className="text-sm font-bold text-emerald-500 mt-1">{t('sys_multi_school_active')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase">{t('sys_env_version')}</p>
                    <p className="text-sm font-bold text-white mt-1">Electron v29.1.0 • Node v20</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 bg-slate-900 border-white/5">
                <h3 className="font-black text-white uppercase tracking-widest text-xs mb-6 text-amber-500">{t('sys_remote_assist')}</h3>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6 uppercase">
                  {t('sys_remote_assist_desc')}
                </p>
                <div className="pt-2">
                  <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {t('sys_diag_ready')}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="glass-card p-8 bg-slate-900 border-white/5 flex flex-col h-[500px]">
                <h3 className="font-black text-white uppercase tracking-widest text-xs mb-6 text-amber-500">{t('sys_realtime_errors')}</h3>
                <div className="flex-1 bg-slate-950/80 rounded-2xl border border-white/5 p-6 font-mono text-[10px] text-slate-400 overflow-y-auto whitespace-pre-wrap select-text">
                  {errorLogs || t('sys_no_errors_logged')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TRASH' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic">{t('sys_trash_title')}</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
              {t('sys_trash_desc')}
            </p>
          </div>

          {deletedSchools.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border-2 border-dashed border-white/5 rounded-3xl text-slate-500">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-50" />
              <p className="font-black uppercase text-xs tracking-widest">{t('sys_trash_empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {deletedSchools.map(s => {
                  const deletedDate = s.deleted_at ? new Date(s.deleted_at) : new Date();
                  const expireDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                  const diffTime = expireDate.getTime() - new Date().getTime();
                  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={s.id} className="glass-card group border-rose-500/10 hover:border-rose-500/30 bg-slate-900/50 p-0 overflow-hidden">
                      <div className="p-8 bg-slate-950/50 border-b border-white/5 flex items-start justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center text-2xl font-black shadow-lg">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">{s.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">ID: HUB-SC-{s.id.toString().padStart(3, '0')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-8 space-y-4">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">
                          {t('sys_auto_delete_in')} {diffDays} {diffDays > 1 ? t('days') : t('day')}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                           <MapPin className="w-4 h-4 text-slate-600" /> {s.address}
                        </div>
                        <div className="pt-4 flex gap-3">
                          <button
                            onClick={async () => {
                              if (window.electronAPI && (window.electronAPI as any).restoreSchool) {
                                  try {
                                      await (window.electronAPI as any).restoreSchool(s.id);
                                      loadSchools();
                                      loadDeletedSchools();
                                      showNotification(t('sys_alert_restore_success', { name: s.name }), "success");
                                  } catch (err: any) {
                                      showNotification(t('sys_alert_restore_error') + ': ' + err.message, "error");
                                  }
                              }
                            }}
                            className="flex-1 py-3 bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-950 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                          >
                            {t('sys_restore')}
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeleteSchool(s.id, s.name)}
                            className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                          >
                            {t('sys_destroy_perm')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail School Modal (Full View) */}
      {selectedSchool && (
          <div className="fixed inset-0 bg-slate-950 z-[150] overflow-y-auto animate-in fade-in duration-300">
              <div className="min-h-screen p-10 flex flex-col">
                  <div className="flex justify-between items-start mb-16">
                      <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center text-4xl font-black shadow-2xl">
                          {selectedSchool.name.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">{selectedSchool.name}</h2>
                          <div className="flex gap-4 mt-3">
                            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3 h-3 text-emerald-500" /> {t('sys_instance_live')}
                            </span>
                            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {t('sys_cameroon_cluster')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={async () => {
                              await switchSchool(selectedSchool.id);
                              setSelectedSchool(null);
                              navigate('/');
                          }}
                          className="px-6 py-5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-amber-500/10 active:scale-95"
                        >
                          <ExternalLink className="w-5 h-5" /> {t('sys_login_as_founder')}
                        </button>
                        <button
                          onClick={() => setSelectedSchool(null)}
                          className="p-5 bg-white/5 hover:bg-white/10 rounded-3xl text-slate-400 hover:text-white transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest border border-white/5"
                        >
                          <ArrowLeft className="w-5 h-5" /> {t('sys_back_to_schools')}
                        </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1">
                      {/* Left: General Info & Admin Users */}
                      <div className="space-y-8">
                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                              <Building2 className="w-6 h-6 text-amber-500" /> {t('sys_metadata')}
                            </h3>
                            {isEditingMetadata ? (
                              <div className="flex gap-2">
                                <button onClick={() => setIsEditingMetadata(false)} className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
                                  {t('cancel')}
                                </button>
                                <button onClick={handleSaveMetadata} className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                                  {t('save')}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setIsEditingMetadata(true)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {isEditingMetadata ? (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_school_name')}</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolName}
                                  onChange={(e) => setEditSchoolName(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_motto_devise')}</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolMotto}
                                  onChange={(e) => setEditSchoolMotto(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_hq_address')}</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolAddress}
                                  onChange={(e) => setEditSchoolAddress(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_email_contact')}</label>
                                <input
                                  type="email"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolEmail}
                                  onChange={(e) => setEditSchoolEmail(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_phone_contact')}</label>
                                <PhoneInput
                                  international
                                  defaultCountry="CM"
                                  limitMaxLength={true}
                                  className="input-field w-full flex items-center phone-input-glass text-amber-500 font-mono"
                                  value={editSchoolPhone}
                                  onChange={(val) => setEditSchoolPhone(val || '')}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_bp_mailbox')}</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolBp}
                                  onChange={(e) => setEditSchoolBp(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center justify-between pt-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('sys_require_subject_code_label')}</label>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                  checked={editSchoolRequiresCode === 1}
                                  onChange={(e) => setEditSchoolRequiresCode(e.target.checked ? 1 : 0)}
                                />
                              </div>
                              <div className="flex items-center justify-between pt-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('sys_allow_term_edit_label')}</label>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                  checked={editSchoolAllowTermEdit === 1}
                                  onChange={(e) => setEditSchoolAllowTermEdit(e.target.checked ? 1 : 0)}
                                />
                              </div>
                              <div className="pt-6 border-t border-white/5 mt-6">
                                <button onClick={handleSaveMetadata} className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
                                  {t('sys_save_metadata_btn')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t('sys_motto_devise')}</p>
                                <div className="flex items-center gap-3 text-white font-black text-sm italic">
                                  {selectedSchool.motto || 'N/A'}
                                </div>
                              </div>
                              {[
                                { icon: MapPin, label: t('sys_hq_address'), value: selectedSchool.address },
                                { icon: Globe, label: t('sys_email_contact'), value: selectedSchool.contact_email },
                                { icon: Phone, label: t('sys_phone_contact'), value: selectedSchool.contact_phone },
                                { icon: Mail, label: t('sys_bp_mailbox'), value: selectedSchool.bp || 'N/A' },
                              ].map((item, i) => (
                                <div key={i}>
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{item.label}</p>
                                  <div className="flex items-center gap-3 text-white font-black text-sm">
                                    <item.icon className="w-4 h-4 text-amber-500/50" />
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                              <div className="pt-4 border-t border-white/5 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">{t('sys_require_subject_code_colon')}</span>
                                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedSchool.requires_subject_code === 1 ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                                    {selectedSchool.requires_subject_code === 1 ? t('sys_status_active_upper') : t('sys_status_inactive_upper')}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">{t('sys_term_edit_by_founder_colon')}</span>
                                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedSchool.allow_founder_term_edit === 1 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                                    {selectedSchool.allow_founder_term_edit === 1 ? t('sys_status_authorized') : t('sys_status_refused')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </section>

                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                              <Shield className="w-6 h-6 text-amber-500" /> {t('sys_founders_keys')}
                            </h3>
                            <button
                              onClick={() => setIsAddingFounder(true)}
                              className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition-all"
                            >
                              <UserPlus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {schoolUsers.filter(u => u.role === 'FOUNDER').map(u => (
                              <div key={u.id} className="p-5 bg-slate-950 rounded-2xl border border-white/5">
                                {editingFounder?.id === u.id ? (
                                  <form onSubmit={(e) => { e.preventDefault(); handleUpdateFounder(); }} className="space-y-4">
                                    {founderEditError && (
                                        <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl text-rose-500 text-xs font-bold">
                                            {founderEditError}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_full_name')}</label>
                                      <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderFullName}
                                        onChange={(e) => setEditFounderFullName(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('sys_username_login')}</label>
                                      <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderUsername}
                                        onChange={(e) => setEditFounderUsername(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('new_password_optional')} ({t('leave_empty_to_keep_unchanged')})</label>
                                      <input
                                        type="password"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderPassword}
                                        onChange={(e) => setEditFounderPassword(e.target.value)}
                                        placeholder="••••••••"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                      <button type="button" onClick={() => setEditingFounder(null)} className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
                                        {t('cancel')}
                                      </button>
                                      <button type="submit" className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                                        {t('save')}
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-slate-400 group-hover:text-amber-500 transition-colors">
                                        F
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-white uppercase">{u.fullName}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">@{u.username}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => startEditFounder(u)} className="p-2 text-slate-500 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteFounder(u.id)} className="p-2 text-slate-500 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {schoolUsers.filter(u => u.role === 'FOUNDER').length === 0 && (
                              <div className="text-center py-6 text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                                {t('sys_no_founder_deployed')}
                              </div>
                            )}
                          </div>
                        </section>

                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                              <Activity className="w-6 h-6 text-emerald-500" /> {t('sys_saas_subscription')}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedSchool.subscription_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {selectedSchool.subscription_status || t('sys_status_unknown')}
                            </span>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{t('sys_expiration_date')}</p>
                                  <p className="text-lg font-black text-white">{selectedSchool.subscription_end_date ? new Date(selectedSchool.subscription_end_date).toLocaleDateString() : t('sys_not_defined')}</p>
                              </div>
                              <div className="pt-4 border-t border-white/5 space-y-3">
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('sys_validate_cash_payment')}</p>
                                  <div className="flex flex-col gap-3">
                                      <div className="flex gap-3">
                                          <div className="flex-1">
                                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t('sys_months_purchased')}</label>
                                              <input type="number" id="sub_months" defaultValue={1} min={1} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" />
                                          </div>
                                          <div className="flex-1">
                                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t('sys_amount_fcfa_label')}</label>
                                              <input type="number" id="sub_amount" defaultValue={5000} min={0} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" />
                                          </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                            const m = parseInt((document.getElementById('sub_months') as HTMLInputElement).value) || 1;
                                            const a = parseInt((document.getElementById('sub_amount') as HTMLInputElement).value) || 0;
                                            handleRenewSubscription(m, a);
                                        }}
                                        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                                      >
                                          {t('sys_confirm_payment_btn')}
                                      </button>
                                  </div>
                              </div>
                          </div>
                        </section>
                      </div>

                      {/* Right: Subject Permissions (authorized for this school) */}
                      <div className="lg:col-span-2 space-y-8">
                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-10">
                            <div>
                              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                                <BookOpen className="w-8 h-8 text-amber-500" /> {t('sys_authorized_registry')}
                              </h3>
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">{t('sys_auth_reg_desc')}</p>
                            </div>
                            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                              {schoolSubjects.length} {t('sys_modules_active')}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {globalSubjects.map(subj => {
                                const isActive = schoolSubjects.includes(subj.id);
                                return (
                                    <button
                                      key={subj.id}
                                      onClick={() => toggleSchoolSubject(subj.id)}
                                      className={`p-8 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${isActive ? 'bg-amber-500/5 border-amber-500 shadow-xl shadow-amber-500/5' : 'bg-slate-950/50 border-slate-800 opacity-40 hover:opacity-100 hover:border-slate-600'}`}
                                    >
                                        <div>
                                            <p className={`font-black uppercase text-base tracking-tight ${isActive ? 'text-amber-500' : 'text-slate-300'}`}>{subj.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-widest">{subj.section} • {subj.level}</p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isActive ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' : 'border-slate-800 group-hover:border-slate-600'}`}>
                                            {isActive ? <CheckCircle className="w-6 h-6" /> : <Plus className="w-5 h-5 text-slate-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                          </div>
                        </section>

                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-10">
                            <div>
                              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                                <Lock className="w-8 h-8 text-rose-500" /> Modules de l'Application
                              </h3>
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Désactivez silencieusement des modules pour cette école. L'utilisateur ne verra aucune trace de cette restriction.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {AVAILABLE_MODULES.map(mod => {
                                const isDisabled = disabledModules.includes(mod.key);
                                return (
                                    <button
                                      key={mod.key}
                                      onClick={() => handleToggleModule(mod.key)}
                                      className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${isDisabled ? 'bg-rose-500/5 border-rose-500/40 opacity-60' : 'bg-slate-950/50 border-slate-800 hover:border-emerald-600'}`}
                                    >
                                        <p className={`font-black uppercase text-sm tracking-tight ${isDisabled ? 'text-rose-400 line-through' : 'text-slate-300'}`}>{mod.label}</p>
                                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isDisabled ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-800 group-hover:border-emerald-600'}`}>
                                            {isDisabled ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-slate-700 group-hover:text-emerald-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                          </div>
                        </section>

                        <div className="flex justify-end pt-10">
                          <button
                            onClick={() => setSelectedSchool(null)}
                            className="px-16 py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-amber-500 hover:scale-105 transition-all"
                          >
                            {t('sys_finalize_config')}
                          </button>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Add School Modal */}
      {isAdding && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 md:p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-2xl max-h-[90vh] bg-slate-900 border-white/10 shadow-2xl p-0 flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh]">
                  <div className="p-6 md:p-10 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                      <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">{t('sys_deploy_school_title')}</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">{t('sys_deploy_school_desc')}</p>
                  </div>
                  <form onSubmit={handleAddSchool} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-1">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_school_full_name')}</label>
                          <input required className="input-field w-full text-xl py-5" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} placeholder={t('sys_school_name_placeholder')} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_city_neighborhood')}</label>
                            <input required className="input-field w-full" value={newSchool.address} onChange={e => setNewSchool({...newSchool, address: e.target.value})} placeholder={t('sys_address_placeholder')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_bp_box')}</label>
                            <input className="input-field w-full" value={newSchool.bp} onChange={e => setNewSchool({...newSchool, bp: e.target.value})} placeholder={t('sys_bp_placeholder')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_email_contact')}</label>
                            <input type="email" className="input-field w-full" value={newSchool.contact_email} onChange={e => setNewSchool({...newSchool, contact_email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_phone_contact')}</label>
                            <PhoneInput
                                international
                                defaultCountry="CM"
                                limitMaxLength={true}
                                className="input-field w-full flex items-center phone-input-glass text-amber-500 font-mono"
                                value={newSchool.contact_phone}
                                onChange={val => setNewSchool({...newSchool, contact_phone: val || ''})}
                            />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('sys_advanced_config')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_academic_structure')}</label>
                              <select
                                  className="input-field w-full"
                                  value={newSchool.term_structure}
                                  onChange={e => setNewSchool({...newSchool, term_structure: e.target.value})}
                              >
                                  <option value="3_TERMS_2_SEQS">{t('sys_term_3_2seq')}</option>
                                  <option value="3_TERMS_NO_SEQS">{t('sys_term_3_noseq')}</option>
                                  <option value="2_SEMESTERS_2_SEQS">{t('sys_term_2sem_2seq')}</option>
                                  <option value="2_SEMESTERS_3_SEQS">{t('sys_term_2sem_3seq')}</option>
                              </select>
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                              <div className="relative flex items-center">
                                  <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={newSchool.allow_founder_term_edit === 1}
                                      onChange={(e) => setNewSchool({...newSchool, allow_founder_term_edit: e.target.checked ? 1 : 0})}
                                  />
                                  <div className="w-10 h-6 bg-slate-800 rounded-full peer peer-checked:bg-amber-500 transition-all duration-300"></div>
                                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4"></div>
                              </div>
                              <div>
                                  <div className="text-xs font-bold text-white">{t('sys_founder_edits_terms')}</div>
                                  <div className="text-[10px] text-slate-400">{t('sys_founder_edits_terms_desc')}</div>
                              </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                              <div className="relative flex items-center">
                                  <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={newSchool.requires_subject_code === 1}
                                      onChange={(e) => setNewSchool({...newSchool, requires_subject_code: e.target.checked ? 1 : 0})}
                                  />
                                  <div className="w-10 h-6 bg-slate-800 rounded-full peer peer-checked:bg-amber-500 transition-all duration-300"></div>
                                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4"></div>
                              </div>
                              <div>
                                  <div className="text-xs font-bold text-white">{t('sys_subject_code_required')}</div>
                                  <div className="text-[10px] text-slate-400">{t('sys_subject_code_required_desc')}</div>
                              </div>
                          </label>
                        </div>
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">{t('cancel')}</button>
                          <button type="submit" className="btn-primary flex-[2] py-5 flex items-center justify-center gap-3">
                              <ExternalLink className="w-5 h-5" /> {t('sys_init_school_btn')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add Founder Modal */}
      {isAddingFounder && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 md:p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-md max-h-[90vh] bg-slate-900 border-white/10 shadow-2xl p-0 flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh]">
                  <div className="p-6 md:p-10 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">{t('sys_create_founder_title')}</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">{t('sys_founder_owner_for')} {selectedSchool?.name}</p>
                  </div>
                  <form onSubmit={handleAddFounder} className="p-6 md:p-10 space-y-6 overflow-y-auto flex-1">
                      {founderError && (
                          <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl text-rose-500 text-sm font-bold">
                              {founderError}
                          </div>
                      )}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_full_name')}</label>
                          <input required className="input-field w-full" value={newFounder.fullName} onChange={e => setNewFounder({...newFounder, fullName: e.target.value})} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_username_login')}</label>
                          <input required className="input-field w-full" value={newFounder.username} onChange={e => setNewFounder({...newFounder, username: e.target.value})} placeholder="admin_name" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_login_password')}</label>
                          <input required type="password" className="input-field w-full font-mono" value={newFounder.password} onChange={e => setNewFounder({...newFounder, password: e.target.value})} />
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAddingFounder(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('cancel')}</button>
                          <button type="submit" className="btn-primary flex-[2] py-4">{t('sys_create_founder_btn')}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add Subject Modal */}
      {isAddingSubject && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 md:p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-xl max-h-[90vh] bg-slate-900 border-white/10 shadow-2xl p-0 flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh]">
                  <div className="p-6 md:p-10 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic text-amber-500">{t('sys_add_global_subj')}</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">{t('sys_add_subj_desc')}</p>
                  </div>
                  <form onSubmit={handleAddSubject} className="p-6 md:p-10 space-y-6 overflow-y-auto flex-1">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_subj_name')}</label>
                          <input required className="input-field w-full" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder={t('sys_subject_name_placeholder')} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_subj_domain')}</label>
                            <input required className="input-field w-full" value={newSubject.domain} onChange={e => setNewSubject({...newSubject, domain: e.target.value})} placeholder={t('sys_subject_domain_placeholder')} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_section')}</label>
                            <select className="input-field w-full" value={newSubject.section} onChange={e => setNewSubject({...newSubject, section: e.target.value})}>
                                <option value="FRANCOPHONE">{t('sys_section_francophone_opt')}</option>
                                <option value="ANGLOPHONE">{t('sys_section_anglophone_opt')}</option>
                            </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_subj_level')}</label>
                          <select className="input-field w-full" value={newSubject.level} onChange={e => setNewSubject({...newSubject, level: e.target.value})}>
                              <option value="MATERNELLE">{t('sys_level_maternelle_opt')}</option>
                              <option value="PRIMAIRE">{t('sys_level_primaire_opt')}</option>
                              <option value="COLLEGE">{t('sys_level_college_opt')}</option>
                              <option value="LYCEE">{t('sys_level_lycee_opt')}</option>
                          </select>
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAddingSubject(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">{t('cancel')}</button>
                          <button type="submit" className="btn-primary flex-[2] py-4">{t('sys_register_subj_btn')}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Password Confirmation Modal */}
      {confirmPasswordModal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[300] p-4 md:p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-md max-h-[90vh] bg-slate-900 border-white/10 shadow-2xl p-0 flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh]">
                  <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic text-rose-500">{confirmPasswordModal.title}</h2>
                      <p className="text-slate-400 text-xs font-bold mt-2 leading-relaxed">{confirmPasswordModal.description}</p>
                  </div>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!confirmPasswordInput.trim()) return;
                      confirmPasswordModal.onConfirm(confirmPasswordInput);
                  }} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                      {confirmPasswordError && (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold uppercase tracking-wide">
                              {confirmPasswordError}
                          </div>
                      )}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('sys_enter_admin_password')}</label>
                          <input
                              required
                              type="password"
                              className="input-field w-full font-mono text-center text-lg"
                              value={confirmPasswordInput}
                              onChange={e => {
                                  setConfirmPasswordInput(e.target.value);
                                  setConfirmPasswordError('');
                              }}
                              placeholder="••••••••"
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button
                              type="button"
                              onClick={() => {
                                  setConfirmPasswordModal({ ...confirmPasswordModal, isOpen: false });
                                  setConfirmPasswordInput('');
                                  setConfirmPasswordError('');
                              }}
                              className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all"
                          >
                              {t('cancel')}
                          </button>
                          <button
                              type="submit"
                              className="btn-primary flex-[2] py-4 bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10"
                          >
                              {t('sys_confirm')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default SystemAdmin;
