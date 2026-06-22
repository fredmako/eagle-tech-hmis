import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, BellOff, Check, CheckSquare, Calendar, PhoneCall, ShieldAlert, Clock } from 'lucide-react';

export default function NotificationBell({ user, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const style = {};

      // Vertical positioning
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 400 && rect.top > 400) {
        style.bottom = '100%';
        style.marginBottom = '10px';
      } else {
        style.top = '100%';
        style.marginTop = '10px';
      }

      // Horizontal positioning
      const spaceRight = window.innerWidth - rect.left;
      if (spaceRight < 320) {
        style.right = '0';
      } else {
        style.left = '0';
      }

      setDropdownStyle(style);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Set up polling interval for real-time notifications (every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000);

    // Event listener to close dropdown on click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Query notifications from database
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Enforce role-based and user-based frontend targeting filters
        const rolesList = user.role ? user.role.split(',').map(r => r.trim().toLowerCase()) : [];
        
        const filtered = data.filter(n => {
          // If targeted to a specific user, ensure match
          if (n.user_id && n.user_id !== user.id) return false;
          // If targeted to a specific role, ensure user holds that role
          if (n.target_role) {
            const targetRoleLower = n.target_role.toLowerCase();
            if (!rolesList.includes(targetRoleLower)) return false;
          }
          return true;
        });

        setNotifications(filtered);
        setUnreadCount(filtered.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Update locally first for snappiness
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      // Update locally
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      // Update each to true
      await Promise.all(unreadIds.map(id => 
        supabase.from('notifications').update({ is_read: true }).eq('id', id)
      ));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);

    // Deep link routing based on notification content/title
    const titleLower = notif.title.toLowerCase();
    const msgLower = notif.message.toLowerCase();

    if (titleLower.includes('ticket') || msgLower.includes('ticket') || msgLower.includes('support')) {
      localStorage.setItem('egesa_active_admin_subtab', 'help_desk');
      onNavigate('admin');
    } else if (titleLower.includes('roster') || msgLower.includes('shift') || msgLower.includes('duty')) {
      localStorage.setItem('egesa_active_admin_subtab', 'roster');
      onNavigate('admin');
    } else if (titleLower.includes('role') || msgLower.includes('clearance') || msgLower.includes('roles')) {
      localStorage.setItem('egesa_active_admin_subtab', 'role_requests');
      onNavigate('admin');
    } else if (titleLower.includes('attendance') || msgLower.includes('clock-in') || msgLower.includes('clock-out')) {
      localStorage.setItem('egesa_active_admin_subtab', 'roster');
      onNavigate('admin');
    } else if (titleLower.includes('procurement') || msgLower.includes('inventory') || msgLower.includes('purchase')) {
      localStorage.setItem('egesa_active_admin_subtab', 'procurement');
      onNavigate('admin');
    } else if (titleLower.includes('profile') || msgLower.includes('branding')) {
      localStorage.setItem('egesa_active_admin_subtab', 'facility_profile');
      onNavigate('admin');
    }
  };

  // Helper to format timestamps
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Helper to choose corresponding notification type icon
  const getNotificationIcon = (notif) => {
    const text = (notif.title + ' ' + notif.message).toLowerCase();
    if (text.includes('ticket') || text.includes('support')) {
      return <PhoneCall size={14} className="text-rose-400 shrink-0" />;
    }
    if (text.includes('roster') || text.includes('shift') || text.includes('duty')) {
      return <Calendar size={14} className="text-teal-400 shrink-0" />;
    }
    if (text.includes('attendance') || text.includes('clock-in') || text.includes('clock-out')) {
      return <Clock size={14} className="text-amber-400 shrink-0" />;
    }
    return <ShieldAlert size={14} className="text-sky-400 shrink-0" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="relative p-1.5 rounded-lg text-slate-450 hover:text-slate-100 hover:bg-slate-800/60 transition active:scale-[0.97] cursor-pointer"
        aria-label="Toggle notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-extrabold text-white border border-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Drawer */}
      {isOpen && (
        <div 
          style={dropdownStyle}
          className="absolute w-[320px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[999] overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-850 bg-slate-950/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Alerts & Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[9.5px] font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare size={10} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-850/60 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="p-3 bg-slate-950 rounded-full text-slate-650 border border-slate-850/50 mb-2">
                  <BellOff size={18} />
                </div>
                <p className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">All Clear!</p>
                <p className="text-[9.5px] text-slate-500 max-w-[200px] mt-1 leading-relaxed">You don't have any incoming notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 text-left transition duration-200 cursor-pointer flex gap-2.5 relative items-start ${
                    notif.is_read 
                      ? 'bg-transparent hover:bg-slate-850/20 text-slate-400' 
                      : 'bg-teal-500/[0.02] hover:bg-teal-500/[0.05] text-slate-200'
                  }`}
                >
                  {/* Left Column Icon */}
                  <div className="mt-0.5">
                    {getNotificationIcon(notif)}
                  </div>

                  {/* Body details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className={`text-[10.5px] font-bold truncate ${notif.is_read ? 'text-slate-350' : 'text-slate-200'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[8px] text-slate-500 font-medium shrink-0 pt-0.5">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-450 leading-relaxed mt-0.5 font-sans break-words whitespace-normal line-clamp-3">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread circle dot indicator */}
                  {!notif.is_read && (
                    <span className="absolute right-3.5 bottom-3.5 h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
