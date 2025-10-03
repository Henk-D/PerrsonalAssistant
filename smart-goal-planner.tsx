import React, { useState, useEffect } from 'react';
import { Calendar, Target, Clock, TrendingUp, Lightbulb, CheckCircle, Plus, Edit2, Trash2, Brain, ListChecks, Settings, Download, Upload, MessageSquare, Zap } from 'lucide-react';

const GoalPlanner = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [goals, setGoals] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [insights, setInsights] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showGoalBreakdownModal, setShowGoalBreakdownModal] = useState(false);
  const [selectedGoalForBreakdown, setSelectedGoalForBreakdown] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    enabled: false
  });

  // 初始化数据
  useEffect(() => {
    const savedGoals = localStorage.getItem('goals');
    const savedActivities = localStorage.getItem('dailyActivities');
    const savedTasks = localStorage.getItem('tasks');
    const savedApiSettings = localStorage.getItem('apiSettings');
    
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedActivities) setDailyActivities(JSON.parse(savedActivities));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedApiSettings) setApiSettings(JSON.parse(savedApiSettings));
  }, []);

  useEffect(() => {
    localStorage.setItem('goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('dailyActivities', JSON.stringify(dailyActivities));
  }, [dailyActivities]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('apiSettings', JSON.stringify(apiSettings));
  }, [apiSettings]);

  // 生成智能日程
  const generateSchedule = () => {
    const newSchedule = [];
    const sortedActivities = [...dailyActivities].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const sortedTasks = [...tasks].filter(t => !t.completed).sort((a, b) => b.priority - a.priority);
    
    let currentTime = 480;
    
    sortedActivities.forEach(activity => {
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      const activityStart = hours * 60 + minutes;
      
      if (activityStart > currentTime && sortedTasks.length > 0) {
        const availableTime = activityStart - currentTime;
        if (availableTime >= 30) {
          const task = sortedTasks.shift();
          newSchedule.push({
            type: 'task',
            item: task,
            startTime: currentTime,
            duration: Math.min(availableTime, task.estimatedTime || 60)
          });
        }
      }
      
      newSchedule.push({
        type: 'activity',
        item: activity,
        startTime: activityStart,
        duration: activity.duration
      });
      
      currentTime = activityStart + activity.duration;
    });
    
    setSchedule(newSchedule);
    generateBasicInsights();
  };

  // 基础洞察生成
  const generateBasicInsights = () => {
    const newInsights = [];
    
    const taskNames = tasks.map(t => t.name.toLowerCase());
    const duplicates = taskNames.filter((name, index) => taskNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      newInsights.push({
        type: 'automation',
        title: '发现重复任务',
        description: `检测到 ${duplicates.length} 个重复任务，建议创建模板或自动化流程`,
        priority: 'high'
      });
    }
    
    const totalTaskTime = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    const totalActivityTime = dailyActivities.reduce((sum, a) => sum + a.duration, 0);
    const availableTime = 960 - totalActivityTime;
    
    if (totalTaskTime > availableTime) {
      newInsights.push({
        type: 'warning',
        title: '任务时间超载',
        description: `今日任务需要 ${Math.round(totalTaskTime/60)} 小时，但只有 ${Math.round(availableTime/60)} 小时可用。建议重新评估优先级`,
        priority: 'high'
      });
    }
    
    if (tasks.filter(t => t.category === '会议').length > 3) {
      newInsights.push({
        type: 'efficiency',
        title: '会议密集',
        description: '今日会议较多，建议合并相关会议或改用异步沟通',
        priority: 'medium'
      });
    }
    
    setInsights(newInsights);
  };

  // Claude AI 洞察生成
  const generateAIInsights = async () => {
    if (!apiSettings.enabled) {
      alert('请先在设置中启用并配置 Claude API');
      return;
    }

    setIsGeneratingInsights(true);
    
    try {
      const prompt = `作为一个专业的效率顾问，请分析以下用户的目标、任务和日程安排，提供深度洞察和建议：

目标列表：
${goals.map(g => `- ${g.name} (${g.type}, 进度: ${g.progress}%)`).join('\n')}

日常活动：
${dailyActivities.map(a => `- ${a.name} at ${a.startTime}, ${a.duration}分钟`).join('\n')}

待办任务：
${tasks.filter(t => !t.completed).map(t => `- ${t.name} (优先级: ${t.priority}, 预计: ${t.estimatedTime}分钟)`).join('\n')}

请提供以下分析：
1. 识别可以自动化或优化的重复性工作
2. 时间管理建议
3. 目标对齐度分析（任务是否支持目标）
4. 效率提升的具体行动建议
5. 潜在的时间陷阱或浪费

请以JSON格式返回，格式如下：
{
  "insights": [
    {
      "type": "automation/efficiency/warning/success",
      "title": "标题",
      "description": "详细描述",
      "priority": "high/medium/low",
      "actionable": "具体可执行的建议"
    }
  ]
}

只返回JSON，不要其他内容。`;

      const response = await fetch(apiSettings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: apiSettings.model,
          max_tokens: 2000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const aiInsights = JSON.parse(responseText);
      
      setInsights(aiInsights.insights || []);
      alert('✨ AI 洞察生成成功！');
    } catch (error) {
      console.error('AI洞察生成失败:', error);
      alert('AI洞察生成失败: ' + error.message);
      generateBasicInsights();
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // 导出数据
  const exportData = () => {
    const data = {
      goals,
      dailyActivities,
      tasks,
      schedule,
      insights,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goal-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.goals) setGoals(data.goals);
        if (data.dailyActivities) setDailyActivities(data.dailyActivities);
        if (data.tasks) setTasks(data.tasks);
        if (data.schedule) setSchedule(data.schedule);
        if (data.insights) setInsights(data.insights);
        alert('✅ 数据导入成功！');
      } catch (error) {
        alert('❌ 数据导入失败: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // 导出为 .ics 日历文件
  const exportToCalendar = () => {
    if (schedule.length === 0) {
      alert('请先生成日程安排');
      return;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//智能目标管理系统//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:我的智能日程
X-WR-TIMEZONE:Asia/Shanghai
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
END:STANDARD
END:VTIMEZONE
`;

    schedule.forEach((item, index) => {
      const startTime = new Date(today);
      startTime.setHours(Math.floor(item.startTime / 60), item.startTime % 60, 0);
      const endTime = new Date(startTime.getTime() + item.duration * 60000);
      
      const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent += `BEGIN:VEVENT
UID:${Date.now()}-${index}@goalplanner
DTSTAMP:${formatDate(new Date())}
DTSTART;TZID=Asia/Shanghai:${formatDate(startTime)}
DTEND;TZID=Asia/Shanghai:${formatDate(endTime)}
SUMMARY:${item.item.name}
DESCRIPTION:${item.type === 'task' ? '任务' : '日常活动'}${item.item.preparation ? '\\n准备: ' + item.item.preparation : ''}${item.item.guidance ? '\\n指导: ' + item.item.guidance : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${dateStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ 日历文件已导出！可以导入到 macOS 日历、Google Calendar 等应用');
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const addGoal = (goal) => {
    if (editingItem) {
      setGoals(goals.map(g => g.id === editingItem.id ? { ...goal, id: editingItem.id } : g));
    } else {
      setGoals([...goals, { ...goal, id: Date.now(), progress: 0, createdAt: new Date().toISOString() }]);
    }
    setShowGoalModal(false);
    setEditingItem(null);
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleGoalBreakdown = (goal) => {
    setSelectedGoalForBreakdown(goal);
    setShowGoalBreakdownModal(true);
  };

  const applyBreakdownSuggestions = (suggestions) => {
    const newGoals = suggestions.map(suggestion => ({
      ...suggestion,
      id: Date.now() + Math.random(),
      progress: 0,
      createdAt: new Date().toISOString(),
      parentGoalId: selectedGoalForBreakdown.id
    }));
    setGoals([...goals, ...newGoals]);
    setShowGoalBreakdownModal(false);
    setSelectedGoalForBreakdown(null);
    alert(`✅ 已添加 ${newGoals.length} 个子目标！`);
  };

  const addActivity = (activity) => {
    if (editingItem) {
      setDailyActivities(dailyActivities.map(a => a.id === editingItem.id ? { ...activity, id: editingItem.id } : a));
    } else {
      setDailyActivities([...dailyActivities, { ...activity, id: Date.now() }]);
    }
    setShowActivityModal(false);
    setEditingItem(null);
  };

  const deleteActivity = (id) => {
    setDailyActivities(dailyActivities.filter(a => a.id !== id));
  };

  const addTask = (task) => {
    if (editingItem) {
      setTasks(tasks.map(t => t.id === editingItem.id ? { ...task, id: editingItem.id } : t));
    } else {
      setTasks([...tasks, { ...task, id: Date.now(), completed: false, createdAt: new Date().toISOString() }]);
    }
    setShowTaskModal(false);
    setEditingItem(null);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Target className="w-8 h-8 text-indigo-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">智能目标管理</h1>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* 底部标签栏 */}
          <div className="flex border-t border-gray-200">
            {[
              { id: 'dashboard', icon: Calendar, label: '仪表板' },
              { id: 'goals', icon: Target, label: '目标' },
              { id: 'schedule', icon: Clock, label: '日程' },
              { id: 'insights', icon: Lightbulb, label: '洞察' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 text-xs transition ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                <tab.icon className="w-5 h-5 mb-1" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 仪表板视图 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="活跃目标" value={goals.length} icon={Target} color="blue" />
              <StatCard title="今日任务" value={tasks.filter(t => !t.completed).length} icon={ListChecks} color="green" />
              <StatCard
                title="完成率"
                value={tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) + '%' : '0%'}
                icon={TrendingUp}
                color="purple"
              />
              <StatCard title="效率建议" value={insights.length} icon={Brain} color="orange" />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">快速操作</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowGoalModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加目标</span>
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowTaskModal(true);
                  }}
                  className="flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加任务</span>
                </button>
                <button
                  onClick={generateSchedule}
                  className="flex items-center justify-center space-x-2 p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                >
                  <Brain className="w-4 h-4" />
                  <span>生成日程</span>
                </button>
                <button
                  onClick={generateAIInsights}
                  disabled={isGeneratingInsights || !apiSettings.enabled}
                  className="flex items-center justify-center space-x-2 p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 text-sm"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isGeneratingInsights ? '分析中' : 'AI洞察'}</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">今日重点任务</h2>
              {tasks.filter(t => !t.completed).slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                    <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">暂无待办任务，添加一些任务开始吧！</p>
              )}
            </div>

            {insights.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">效率洞察</h2>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex items-center space-x-1 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>AI反馈</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {insights.slice(0, 3).map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 目标视图 */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">我的目标</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowGoalModal(true);
                }}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>新建</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => {
                    setEditingItem(goal);
                    setShowGoalModal(true);
                  }}
                  onDelete={() => {
                    if (window.confirm('确定要删除这个目标吗？')) {
                      deleteGoal(goal.id);
                    }
                  }}
                  onBreakdown={handleGoalBreakdown}
                />
              ))}
              {goals.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">还没有目标，开始设定你的第一个目标吧！</p>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowGoalModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    创建目标
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 日程视图 */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">智能日程</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowActivityModal(true);
                  }}
                  className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">活动</span>
                </button>
                {schedule.length > 0 && (
                  <button
                    onClick={exportToCalendar}
                    className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">导出</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">日常固定活动</h3>
              {dailyActivities.length > 0 ? (
                <div className="space-y-2">
                  {dailyActivities.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{activity.name}</p>
                          <p className="text-sm text-gray-500">{activity.startTime} · {activity.duration} 分钟</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingItem(activity);
                            setShowActivityModal(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('确定要删除这个活动吗？')) {
                              deleteActivity(activity.id);
                            }
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">添加你的日常活动，如起床、吃饭、运动等</p>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowActivityModal(true);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                  >
                    添加活动
                  </button>
                </div>
              )}
            </div>

            {schedule.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">今日时间表</h3>
                <div className="space-y-2">
                  {schedule.map((item, index) => (
                    <div key={index} className={`flex items-center p-3 rounded-lg ${
                      item.type === 'task' ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'bg-gray-50 border-l-4 border-gray-300'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.item.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatTime(item.startTime)} - {formatTime(item.startTime + item.duration)}
                          {item.type === 'task' && item.item.preparation && (
                            <span className="block sm:inline sm:ml-2 text-xs text-indigo-600 mt-1 sm:mt-0">📋 {item.item.preparation}</span>
                          )}
                        </p>
                      </div>
                      {item.type === 'task' && (
                        <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded flex-shrink-0 ml-2">任务</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">添加任务和活动后，点击生成日程</p>
                <button
                  onClick={generateSchedule}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  生成智能日程
                </button>
              </div>
            )}
          </div>
        )}

        {/* 洞察视图 */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">效率洞察</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">反馈</span>
                </button>
                <button
                  onClick={generateAIInsights}
                  disabled={isGeneratingInsights || !apiSettings.enabled}
                  className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 text-sm"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isGeneratingInsights ? '生成中' : '生成'}</span>
                </button>
              </div>
            </div>
            
            {insights.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                    <InsightCard insight={insight} detailed />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">生成日程后将显示个性化效率建议</p>
                <button
                  onClick={generateAIInsights}
                  disabled={!apiSettings.enabled}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300"
                >
                  {apiSettings.enabled ? '使用 AI 生成深度洞察' : '请先在设置中启用 AI'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showSettingsModal && (
        <SettingsModal
          apiSettings={apiSettings}
          onSave={(settings) => {
            setApiSettings(settings);
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
          onExport={exportData}
          onImport={importData}
        />
      )}

      {showFeedbackModal && (
        <FeedbackModal
          apiSettings={apiSettings}
          goals={goals}
          tasks={tasks}
          dailyActivities={dailyActivities}
          insights={insights}
          onClose={() => setShowFeedbackModal(false)}
          onInsightsUpdate={setInsights}
        />
      )}

      {showGoalModal && (
        <GoalModal
          goal={editingItem}
          onSave={addGoal}
          onClose={() => {
            setShowGoalModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          activity={editingItem}
          onSave={addActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showTaskModal && (
        <TaskModal
          task={editingItem}
          goals={goals}
          onSave={addTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showGoalBreakdownModal && selectedGoalForBreakdown && (
        <GoalBreakdownModal
          goal={selectedGoalForBreakdown}
          apiSettings={apiSettings}
          onApply={applyBreakdownSuggestions}
          onClose={() => {
            setShowGoalBreakdownModal(false);
            setSelectedGoalForBreakdown(null);
          }}
        />
      )}
    </div>
  );
};

// 组件定义
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

const GoalCard = ({ goal, onEdit, onDelete, onBreakdown }) => {
  const typeColors = {
    '长期': 'bg-purple-100 text-purple-700',
    '年度': 'bg-blue-100 text-blue-700',
    '季度': 'bg-green-100 text-green-700',
    '月度': 'bg-yellow-100 text-yellow-700',
    '周': 'bg-orange-100 text-orange-700'
  };

  const canBreakdown = ['长期', '年度', '季度'].includes(goal.type);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 text-xs rounded ${typeColors[goal.type] || 'bg-gray-100 text-gray-700'}`}>
              {goal.type}
            </span>
            {goal.category && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {goal.category}
              </span>
            )}
            {goal.parentGoalId && (
              <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                子目标
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">{goal.name}</h3>
          {goal.description && (
            <p className="text-gray-600 text-sm mb-3 break-words">{goal.description}</p>
          )}
        </div>
        <div className="flex space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
          {canBreakdown && onBreakdown && (
            <button 
              onClick={() => onBreakdown(goal)} 
              className="p-2 hover:bg-purple-100 rounded transition"
              title="AI分解目标"
            >
              <Brain className="w-4 h-4 text-purple-600" />
            </button>
          )}
          <button 
            onClick={onEdit} 
            className="p-2 hover:bg-gray-100 rounded transition"
            title="编辑"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-2 hover:bg-red-100 rounded transition"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>进度</span>
          <span>{goal.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${goal.progress || 0}%` }}
          />
        </div>
        {goal.deadline && (
          <p className="text-sm text-gray-500">截止日期: {goal.deadline}</p>
        )}
      </div>
    </div>
  );
};

const TaskItem = ({ task, onToggle }) => {
  const priorityColors = {
    3: 'text-red-600',
    2: 'text-yellow-600',
    1: 'text-gray-600'
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <button
        onClick={() => onToggle(task.id)}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
          task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm sm:text-base truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>
          {task.name}
        </p>
        {task.preparation && !task.completed && (
          <p className="text-xs text-gray-500 mt-1 truncate">📋 {task.preparation}</p>
        )}
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {task.priority && (
          <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority === 3 ? '高' : task.priority === 2 ? '中' : '低'}
          </span>
        )}
        {task.estimatedTime && (
          <span className="text-xs text-gray-500 hidden sm:inline">{task.estimatedTime}分</span>
        )}
      </div>
    </div>
  );
};

const InsightCard = ({ insight, detailed }) => {
  const typeColors = {
    automation: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-red-50 border-red-200 text-red-700',
    efficiency: 'bg-green-50 border-green-200 text-green-700',
    success: 'bg-purple-50 border-purple-200 text-purple-700'
  };

  return (
    <div className={`p-4 rounded-lg border ${typeColors[insight.type] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        <Lightbulb className="w-5 h-5 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1 break-words">{insight.title}</h4>
          <p className={`text-sm break-words ${detailed ? '' : 'line-clamp-2'}`}>{insight.description}</p>
          {detailed && insight.actionable && (
            <div className="mt-3 p-3 bg-white bg-opacity-50 rounded">
              <p className="text-sm font-medium mb-1">💡 可执行建议：</p>
              <p className="text-sm break-words">{insight.actionable}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 模态框组件
const SettingsModal = ({ apiSettings, onSave, onClose, onExport, onImport }) => {
  const [formData, setFormData] = useState(apiSettings);
  const fileInputRef = React.useRef(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-lg sm:text-xl font-bold">系统设置</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-6">
          {/* Claude AI 设置 */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
              <Zap className="w-5 h-5 mr-2 text-purple-600" />
              Claude AI 配置
            </h4>
            <div className="space-y-4 bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="apiEnabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="apiEnabled" className="text-sm font-medium">
                  启用 Claude AI 智能分析
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint
                </label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="https://api.anthropic.com/v1/messages"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="claude-sonnet-4-20250514"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="bg-purple-100 p-3 rounded text-xs">
                <p className="font-medium mb-1">💡 提示：</p>
                <p>• API 调用在浏览器中进行，无需 API Key（已内置）</p>
                <p>• 启用后可使用真正的 AI 分析和个性化建议</p>
              </div>
            </div>
          </div>

          {/* 数据管理 */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
              <Download className="w-5 h-5 mr-2 text-indigo-600" />
              数据管理
            </h4>
            <div className="space-y-3 bg-indigo-50 p-4 rounded-lg">
              <button
                onClick={onExport}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Download className="w-5 h-5" />
                <span>导出所有数据（JSON）</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm"
              >
                <Upload className="w-5 h-5" />
                <span>导入数据</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImport}
                className="hidden"
              />

              <div className="bg-indigo-100 p-3 rounded text-xs">
                <p className="font-medium mb-1">📱 跨设备使用：</p>
                <p>• 导出后保存到 iCloud Drive</p>
                <p>• 在其他设备导入即可同步</p>
              </div>
            </div>
          </div>

          {/* 日历集成 */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center text-sm sm:text-base">
              <Calendar className="w-5 h-5 mr-2 text-green-600" />
              日历集成
            </h4>
            <div className="bg-green-50 p-4 rounded-lg text-xs sm:text-sm space-y-2">
              <p>在"日程"页面可导出 .ics 文件，支持：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>macOS 日历</li>
                <li>Google Calendar</li>
                <li>Outlook</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedbackModal = ({ apiSettings, goals, tasks, dailyActivities, insights, onClose, onInsightsUpdate }) => {
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState('');

  const handleSubmit = async () => {
    if (!feedback.trim() || !apiSettings.enabled) return;

    setIsProcessing(true);
    setResponse('');

    try {
      const prompt = `我是一个效率管理系统的用户，现在向你反馈我的情况和需求。

当前状态：
- 目标: ${goals.length}个
- 待办任务: ${tasks.filter(t => !t.completed).length}个
- 日常活动: ${dailyActivities.length}个
- 当前洞察数: ${insights.length}个

用户反馈：
${feedback}

请基于用户的反馈：
1. 分析用户的实际需求和痛点
2. 提供针对性的改进建议
3. 生成更新后的效率洞察（如果需要）

返回JSON格式：
{
  "analysis": "对用户反馈的分析",
  "suggestions": ["建议1", "建议2"],
  "updatedInsights": [
    {
      "type": "automation/efficiency/warning/success",
      "title": "标题",
      "description": "描述",
      "priority": "high/medium/low",
      "actionable": "可执行建议"
    }
  ]
}

只返回JSON，不要其他内容。`;

      const apiResponse = await fetch(apiSettings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: apiSettings.model,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API请求失败: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(responseText);

      setResponse(result.analysis);
      
      if (result.updatedInsights && result.updatedInsights.length > 0) {
        onInsightsUpdate(result.updatedInsights);
      }

      if (result.suggestions && result.suggestions.length > 0) {
        setResponse(prev => prev + '\n\n建议：\n' + result.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n'));
      }

    } catch (error) {
      console.error('处理反馈失败:', error);
      setResponse('抱歉，处理反馈时出现错误: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-lg sm:text-xl font-bold">AI 反馈与建议</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {!apiSettings.enabled && (
          <div className="mx-4 sm:mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ 请先在设置中启用 Claude AI 功能
            </p>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              您的反馈或问题
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="例如：我总是完不成计划的任务，有什么建议吗？"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              rows="5"
              disabled={!apiSettings.enabled}
            />
          </div>

          {response && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-2 text-sm sm:text-base">AI 回复：</h4>
              <p className="text-sm text-indigo-800 whitespace-pre-wrap break-words">{response}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            关闭
          </button>
          <button
            onClick={handleSubmit}
            disabled={!feedback.trim() || isProcessing || !apiSettings.enabled}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 text-sm"
          >
            {isProcessing ? '分析中...' : '提交反馈'}
          </button>
        </div>
      </div>
    </div>
  );
};

const GoalModal = ({ goal, onSave, onClose }) => {
  const [formData, setFormData] = useState(goal || {
    name: '',
    type: '月度',
    category: '',
    description: '',
    deadline: '',
    progress: 0
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold">{goal ? '编辑目标' : '新建目标'}</h3>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <input
            type="text"
            placeholder="目标名称"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="长期">长期目标</option>
            <option value="年度">年度目标</option>
            <option value="季度">季度目标</option>
            <option value="月度">月度目标</option>
            <option value="周">周目标</option>
          </select>
          <input
            type="text"
            placeholder="分类（如：健康、事业、学习）"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <textarea
            placeholder="目标描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            rows="3"
          />
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前进度: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            取消
          </button>
          <button
            onClick={() => formData.name && onSave(formData)}
            disabled={!formData.name}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const ActivityModal = ({ activity, onSave, onClose }) => {
  const [formData, setFormData] = useState(activity || {
    name: '',
    startTime: '08:00',
    duration: 60
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold">{activity ? '编辑活动' : '新建日常活动'}</h3>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <input
            type="text"
            placeholder="活动名称（如：晨练、午餐）"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              持续时间（分钟）
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-4 sm:p-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            取消
          </button>
          <button
            onClick={() => formData.name && onSave(formData)}
            disabled={!formData.name}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskModal = ({ task, goals, onSave, onClose }) => {
  const [formData, setFormData] = useState(task || {
    name: '',
    goalId: '',
    category: '',
    priority: 2,
    estimatedTime: 60,
    preparation: '',
    guidance: ''
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold">{task ? '编辑任务' : '新建任务'}</h3>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <input
            type="text"
            placeholder="任务名称"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          
          <select
            value={formData.goalId}
            onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            <option value="">选择关联目标（可选）</option>
            {goals.map(goal => (
              <option key={goal.id} value={goal.id}>{goal.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="任务分类（如：会议、学习、运动）"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="1">低</option>
              <option value="2">中</option>
              <option value="3">高</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预计用时（分钟）
            </label>
            <input
              type="number"
              min="15"
              step="15"
              value={formData.estimatedTime}
              onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 准备事项（需要的信息、文件、工具）
            </label>
            <textarea
              placeholder="例如：需要准备项目文档、参考资料链接、设计稿等"
              value={formData.preparation}
              onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 工作指导（步骤提示、注意事项）
            </label>
            <textarea
              placeholder="例如：先review上次的进度，然后focus在核心功能，最后做code review"
              value={formData.guidance}
              onChange={(e) => setFormData({ ...formData, guidance: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              rows="3"
            />
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            取消
          </button>
          <button
            onClick={() => formData.name && onSave(formData)}
            disabled={!formData.name}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-300 text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const GoalBreakdownModal = ({ goal, apiSettings, onApply, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [error, setError] = useState('');

  const generateBreakdown = async () => {
    if (!apiSettings.enabled) {
      setError('请先在设置中启用 Claude AI');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const prompt = `作为一个目标管理专家，请帮我将以下大目标分解为更小、更可执行的子目标。

目标信息：
- 名称: ${goal.name}
- 类型: ${goal.type}
- 分类: ${goal.category || '未分类'}
- 描述: ${goal.description || '无'}
- 截止日期: ${goal.deadline || '无'}

请将这个${goal.type}分解为适当粒度的子目标，遵循以下原则：
1. 如果是长期目标，分解为3-5个年度目标
2. 如果是年度目标，分解为4-6个季度目标
3. 如果是季度目标，分解为3-4个月度目标
4. 每个子目标应该是SMART原则的（具体、可衡量、可实现、相关、有时限）
5. 子目标之间应有逻辑关系，形成实现主目标的路径
6. 为每个子目标设定合理的截止日期

请以JSON格式返回，格式如下：
{
  "analysis": "对主目标的分析和分解思路",
  "subGoals": [
    {
      "name": "子目标名称",
      "type": "年度/季度/月度/周",
      "category": "分类",
      "description": "详细描述",
      "deadline": "YYYY-MM-DD",
      "keyActions": ["关键行动1", "关键行动2"]
    }
  ]
}

只返回JSON，不要其他内容。`;

      const response = await fetch(apiSettings.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: apiSettings.model,
          max_tokens: 2500,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(responseText);

      setSuggestions(result.subGoals || []);
      setSelectedSuggestions(result.subGoals.map((_, index) => index));

    } catch (err) {
      console.error('生成分解方案失败:', err);
      setError('生成失败: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSuggestion = (index) => {
    setSelectedSuggestions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleApply = () => {
    const selected = suggestions.filter((_, index) => selectedSuggestions.includes(index));
    onApply(selected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">AI 目标分解</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                主目标: <span className="font-medium">{goal.name}</span> ({goal.type})
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              ) : (
                <>
                  <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6 text-sm">
                    使用 AI 将这个{goal.type}分解为更小、更可执行的子目标
                  </p>
                  <button
                    onClick={generateBreakdown}
                    disabled={isGenerating || !apiSettings.enabled}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 text-sm"
                  >
                    {isGenerating ? (
                      <span className="flex items-center space-x-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <span>AI 分析中...</span>
                      </span>
                    ) : '开始分解'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2 text-sm">✨ AI 建议</h4>
                <p className="text-xs sm:text-sm text-purple-800">
                  已生成 {suggestions.length} 个子目标建议。请选择你想要添加的子目标：
                </p>
              </div>

              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      selectedSuggestions.includes(index)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => toggleSuggestion(index)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.includes(index)}
                        onChange={() => toggleSuggestion(index)}
                        className="mt-1 w-5 h-5 text-purple-600 rounded flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                            {suggestion.type}
                          </span>
                          {suggestion.category && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {suggestion.category}
                            </span>
                          )}
                          {suggestion.deadline && (
                            <span className="text-xs text-gray-500">
                              📅 {suggestion.deadline}
                            </span>
                          )}
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base break-words">{suggestion.name}</h5>
                        {suggestion.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{suggestion.description}</p>
                        )}
                        {suggestion.keyActions && suggestion.keyActions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">关键行动:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {suggestion.keyActions.map((action, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span className="break-words">{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  取消
                </button>
                <button
                  onClick={generateBreakdown}
                  className="px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm"
                >
                  重新生成
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedSuggestions.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 text-sm"
                >
                  添加 {selectedSuggestions.length} 个
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalPlanner;
          