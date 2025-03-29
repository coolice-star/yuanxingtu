// 当前时间更新
function updateStatusBarTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    const timeElements = document.querySelectorAll('.status-bar-time');
    timeElements.forEach(el => {
        el.textContent = timeString;
    });
}

// 初始化状态栏时间并每分钟更新
function initStatusBarTime() {
    updateStatusBarTime();
    setInterval(updateStatusBarTime, 60000);
}

// 底部导航栏激活状态
function setActiveTab(tabName) {
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 格式化时间（分:秒）
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// 番茄时钟计时器
class PomodoroTimer {
    constructor(options = {}) {
        this.workTime = options.workTime || 25 * 60; // 默认25分钟
        this.shortBreakTime = options.shortBreakTime || 5 * 60; // 默认5分钟
        this.longBreakTime = options.longBreakTime || 15 * 60; // 默认15分钟
        this.longBreakInterval = options.longBreakInterval || 4; // 默认4个番茄后长休息
        
        this.currentTime = this.workTime;
        this.isRunning = false;
        this.timerInterval = null;
        this.mode = 'work'; // 'work', 'shortBreak', 'longBreak'
        this.completedPomodoros = 0;
        this.callbacks = {
            onTick: () => {},
            onComplete: () => {},
            onStateChange: () => {}
        };
    }
    
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.timerInterval = setInterval(() => {
            this.currentTime--;
            this.callbacks.onTick(this.currentTime, this.getProgress());
            
            if (this.currentTime <= 0) {
                this.complete();
            }
        }, 1000);
        
        this.callbacks.onStateChange(this.isRunning, this.mode);
    }
    
    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.callbacks.onStateChange(this.isRunning, this.mode);
    }
    
    reset() {
        this.pause();
        this.setTimeForCurrentMode();
        this.callbacks.onTick(this.currentTime, this.getProgress());
    }
    
    complete() {
        this.pause();
        
        if (this.mode === 'work') {
            this.completedPomodoros++;
            
            if (this.completedPomodoros % this.longBreakInterval === 0) {
                this.mode = 'longBreak';
            } else {
                this.mode = 'shortBreak';
            }
        } else {
            this.mode = 'work';
        }
        
        this.setTimeForCurrentMode();
        this.callbacks.onComplete(this.mode, this.completedPomodoros);
    }
    
    setTimeForCurrentMode() {
        switch (this.mode) {
            case 'work':
                this.currentTime = this.workTime;
                break;
            case 'shortBreak':
                this.currentTime = this.shortBreakTime;
                break;
            case 'longBreak':
                this.currentTime = this.longBreakTime;
                break;
        }
    }
    
    getProgress() {
        let totalTime;
        switch (this.mode) {
            case 'work':
                totalTime = this.workTime;
                break;
            case 'shortBreak':
                totalTime = this.shortBreakTime;
                break;
            case 'longBreak':
                totalTime = this.longBreakTime;
                break;
        }
        
        return (totalTime - this.currentTime) / totalTime * 100;
    }
    
    setMode(mode) {
        if (this.isRunning) {
            this.pause();
        }
        
        this.mode = mode;
        this.setTimeForCurrentMode();
        this.callbacks.onTick(this.currentTime, this.getProgress());
        this.callbacks.onStateChange(this.isRunning, this.mode);
    }
}

// 任务管理
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
    }
    
    loadTasks() {
        const savedTasks = localStorage.getItem('pomodoro-tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    }
    
    saveTasks() {
        localStorage.setItem('pomodoro-tasks', JSON.stringify(this.tasks));
    }
    
    addTask(task) {
        const newTask = {
            id: Date.now().toString(),
            title: task.title,
            description: task.description || '',
            estimatedPomodoros: task.estimatedPomodoros || 1,
            completedPomodoros: 0,
            createdAt: new Date().toISOString(),
            completed: false
        };
        
        this.tasks.push(newTask);
        this.saveTasks();
        return newTask;
    }
    
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return null;
        
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
        this.saveTasks();
        return this.tasks[taskIndex];
    }
    
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
    }
    
    getTask(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }
    
    getAllTasks() {
        return [...this.tasks];
    }
    
    getActiveTasks() {
        return this.tasks.filter(task => !task.completed);
    }
    
    getCompletedTasks() {
        return this.tasks.filter(task => task.completed);
    }
    
    incrementPomodoro(taskId) {
        const task = this.getTask(taskId);
        if (!task) return null;
        
        task.completedPomodoros++;
        this.saveTasks();
        return task;
    }
}

// 统计数据管理
class StatsManager {
    constructor() {
        this.stats = this.loadStats();
    }
    
    loadStats() {
        const savedStats = localStorage.getItem('pomodoro-stats');
        return savedStats ? JSON.parse(savedStats) : {
            totalPomodoros: 0,
            totalWorkTime: 0, // 秒
            dailyStats: {}
        };
    }
    
    saveStats() {
        localStorage.setItem('pomodoro-stats', JSON.stringify(this.stats));
    }
    
    recordPomodoro(duration = 25 * 60) {
        const today = new Date().toISOString().split('T')[0];
        
        // 更新总计数据
        this.stats.totalPomodoros++;
        this.stats.totalWorkTime += duration;
        
        // 更新每日数据
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = {
                pomodoros: 0,
                workTime: 0
            };
        }
        
        this.stats.dailyStats[today].pomodoros++;
        this.stats.dailyStats[today].workTime += duration;
        
        this.saveStats();
    }
    
    getDailyStats(date = new Date()) {
        const dateString = date.toISOString().split('T')[0];
        return this.stats.dailyStats[dateString] || { pomodoros: 0, workTime: 0 };
    }
    
    getWeeklyStats() {
        const result = { pomodoros: 0, workTime: 0, days: [] };
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayStats = this.stats.dailyStats[dateString] || { pomodoros: 0, workTime: 0 };
            
            result.pomodoros += dayStats.pomodoros;
            result.workTime += dayStats.workTime;
            result.days.push({
                date: dateString,
                pomodoros: dayStats.pomodoros,
                workTime: dayStats.workTime
            });
        }
        
        return result;
    }
    
    getMonthlyStats() {
        const result = { pomodoros: 0, workTime: 0, days: [] };
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = date.toISOString().split('T')[0];
            const dayStats = this.stats.dailyStats[dateString] || { pomodoros: 0, workTime: 0 };
            
            result.pomodoros += dayStats.pomodoros;
            result.workTime += dayStats.workTime;
            result.days.push({
                date: dateString,
                pomodoros: dayStats.pomodoros,
                workTime: dayStats.workTime
            });
        }
        
        return result;
    }
    
    getTotalStats() {
        return {
            totalPomodoros: this.stats.totalPomodoros,
            totalWorkTime: this.stats.totalWorkTime
        };
    }
}

// 设置管理
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('pomodoro-settings');
        return savedSettings ? JSON.parse(savedSettings) : {
            workTime: 25 * 60,
            shortBreakTime: 5 * 60,
            longBreakTime: 15 * 60,
            longBreakInterval: 4,
            autoStartBreaks: true,
            autoStartPomodoros: false,
            notifications: true,
            sounds: true,
            darkMode: false
        };
    }
    
    saveSettings() {
        localStorage.setItem('pomodoro-settings', JSON.stringify(this.settings));
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        return this.settings;
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initStatusBarTime();
    
    // 初始化底部导航栏点击事件
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            setActiveTab(tabName);
            // 在实际应用中，这里会处理页面切换逻辑
        });
    });
}); 