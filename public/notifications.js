/**
 * Notifications UI Controller
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.currentFilter = 'all';
        this.userId = this.getUserId();
        this.apiBaseUrl = 'http://localhost:3006/api';
        this.wsClient = null;
        this.unreadCount = 0;

        this.init();
    }

    getUserId() {
        // Get user ID from session storage or cookie
        return sessionStorage.getItem('userId') || 'demo-user-123';
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotifications();
        this.connectWebSocket();
        this.startPeriodicRefresh();
    }

    setupEventListeners() {
        // Mark all as read
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderNotifications();
            });
        });

        // Settings modal
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideSettings());
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideSettings());
        }

        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Notification bell
        const bellBtn = document.getElementById('bellBtn');
        if (bellBtn) {
            bellBtn.addEventListener('click', () => this.toggleDropdown());
        }

        const closeDropdownBtn = document.getElementById('closeDropdownBtn');
        if (closeDropdownBtn) {
            closeDropdownBtn.addEventListener('click', () => this.hideDropdown());
        }
    }

    async loadNotifications() {
        try {
            this.showLoading();

            const response = await fetch(
                `${this.apiBaseUrl}/notifications/user/${this.userId}?limit=50`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const data = await response.json();
            this.notifications = data.data || [];
            this.unreadCount = data.unreadCount || 0;

            this.hideLoading();
            this.renderNotifications();
            this.updateBellBadge();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.hideLoading();
            this.showError('Failed to load notifications');
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        let filteredNotifications = this.notifications;

        // Apply filters
        if (this.currentFilter === 'unread') {
            filteredNotifications = this.notifications.filter(n => n.status !== 'read');
        } else if (this.currentFilter !== 'all') {
            filteredNotifications = this.notifications.filter(n => n.type === this.currentFilter);
        }

        if (filteredNotifications.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        container.innerHTML = filteredNotifications.map(notification => `
            <div class="notification-item ${notification.status !== 'read' ? 'unread' : ''}"
                 data-id="${notification._id || notification.id}">
                <div class="notification-header">
                    <div>
                        <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                        <span class="notification-type ${notification.type}">${notification.type}</span>
                    </div>
                </div>
                <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                <div class="notification-footer">
                    <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
                    <div class="notification-actions">
                        ${notification.status !== 'read' ?
                            `<button class="action-btn mark-read-btn" data-id="${notification._id || notification.id}">
                                Mark as Read
                            </button>` : ''}
                        <button class="action-btn delete-btn" data-id="${notification._id || notification.id}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to action buttons
        container.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(btn.dataset.id);
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(btn.dataset.id);
            });
        });

        // Click to mark as read
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const notification = this.notifications.find(n => (n._id || n.id) === id);
                if (notification && notification.status !== 'read') {
                    this.markAsRead(id);
                }
            });
        });
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/notifications/${notificationId}/read`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to mark as read');
            }

            // Update local state
            const notification = this.notifications.find(n => (n._id || n.id) === notificationId);
            if (notification) {
                notification.status = 'read';
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.renderNotifications();
                this.updateBellBadge();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/notifications/user/${this.userId}/read-all`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to mark all as read');
            }

            // Update local state
            this.notifications.forEach(n => n.status = 'read');
            this.unreadCount = 0;
            this.renderNotifications();
            this.updateBellBadge();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    async deleteNotification(notificationId) {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            // Remove from local state
            this.notifications = this.notifications.filter(n => (n._id || n.id) !== notificationId);
            this.renderNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }

    connectWebSocket() {
        // Use the existing WebSocket client if available
        if (typeof WebSocketClient !== 'undefined') {
            this.wsClient = new WebSocketClient();

            // Listen for new notifications
            this.wsClient.on('notification', (data) => {
                this.handleNewNotification(data);
            });

            // Listen for notification updates
            this.wsClient.on('notification.update', (data) => {
                this.handleNotificationUpdate(data);
            });
        }
    }

    handleNewNotification(data) {
        console.log('New notification received:', data);

        // Add to notifications list
        this.notifications.unshift(data);
        this.unreadCount++;

        // Re-render and update badge
        this.renderNotifications();
        this.updateBellBadge();

        // Show browser notification
        this.showBrowserNotification(data);
    }

    handleNotificationUpdate(data) {
        console.log('Notification update received:', data);

        // Find and update notification
        const notification = this.notifications.find(
            n => (n._id || n.id) === data.notificationId
        );

        if (notification) {
            Object.assign(notification, data);
            this.renderNotifications();
        }
    }

    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/notification-icon.png',
                tag: notification._id || notification.id
            });
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }

    updateBellBadge() {
        const badge = document.getElementById('bellBadge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.classList.toggle('hidden', this.unreadCount === 0);
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                this.renderDropdown();
            }
        }
    }

    hideDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    renderDropdown() {
        const dropdownList = document.getElementById('dropdownList');
        if (!dropdownList) return;

        const recentNotifications = this.notifications.slice(0, 5);

        if (recentNotifications.length === 0) {
            dropdownList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No notifications</div>';
            return;
        }

        dropdownList.innerHTML = recentNotifications.map(notification => `
            <div class="dropdown-item ${notification.status !== 'read' ? 'unread' : ''}">
                <div style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(notification.title)}</div>
                <div style="font-size: 13px; color: #666;">${this.escapeHtml(notification.message)}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">${this.formatTime(notification.createdAt)}</div>
            </div>
        `).join('');
    }

    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            this.loadSettings();
            modal.style.display = 'flex';
        }
    }

    hideSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async loadSettings() {
        try {
            const response = await fetch(
                `${this.apiBaseUrl}/preferences/${this.userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const preferences = data.preferences;

                // Update form fields
                document.getElementById('emailEnabled').checked = preferences.channels?.email?.enabled ?? true;
                document.getElementById('smsEnabled').checked = preferences.channels?.sms?.enabled ?? false;
                document.getElementById('pushEnabled').checked = preferences.channels?.push?.enabled ?? true;
                document.getElementById('inAppEnabled').checked = preferences.channels?.inApp?.enabled ?? true;

                document.getElementById('surveyNotif').checked = preferences.categories?.survey ?? true;
                document.getElementById('responseNotif').checked = preferences.categories?.response ?? true;
                document.getElementById('systemNotif').checked = preferences.categories?.system ?? true;
                document.getElementById('accountNotif').checked = preferences.categories?.account ?? true;
                document.getElementById('marketingNotif').checked = preferences.categories?.marketing ?? false;

                document.getElementById('quietHoursEnabled').checked = preferences.quietHours?.enabled ?? false;
                document.getElementById('quietStart').value = preferences.quietHours?.start || '22:00';
                document.getElementById('quietEnd').value = preferences.quietHours?.end || '08:00';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            const preferences = {
                channels: {
                    email: { enabled: document.getElementById('emailEnabled').checked },
                    sms: { enabled: document.getElementById('smsEnabled').checked },
                    push: { enabled: document.getElementById('pushEnabled').checked },
                    inApp: { enabled: document.getElementById('inAppEnabled').checked }
                },
                categories: {
                    survey: document.getElementById('surveyNotif').checked,
                    response: document.getElementById('responseNotif').checked,
                    system: document.getElementById('systemNotif').checked,
                    account: document.getElementById('accountNotif').checked,
                    marketing: document.getElementById('marketingNotif').checked
                },
                quietHours: {
                    enabled: document.getElementById('quietHoursEnabled').checked,
                    start: document.getElementById('quietStart').value,
                    end: document.getElementById('quietEnd').value
                }
            };

            const response = await fetch(
                `${this.apiBaseUrl}/preferences/${this.userId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(preferences)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            this.hideSettings();
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        }
    }

    startPeriodicRefresh() {
        // Refresh notifications every 30 seconds
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'block';
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'none';
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'block';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'none';
    }

    showError(message) {
        alert(message); // TODO: Implement better error UI
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }

        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }

        // Format as date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();

    // Request notification permission
    window.notificationManager.requestNotificationPermission();
});
