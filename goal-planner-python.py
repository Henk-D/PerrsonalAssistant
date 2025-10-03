import streamlit as st
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import anthropic
import openai
import requests

# 页面配置
st.set_page_config(
    page_title="智能目标管理系统",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 自定义 CSS
st.markdown("""
<style>
    .main {
        background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
    }
    .stButton>button {
        width: 100%;
    }
    .goal-card {
        background: white;
        padding: 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
    }
    .stat-card {
        background: white;
        padding: 1rem;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        text-align: center;
    }
    .insight-card {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        border-left: 4px solid;
    }
    .insight-automation {
        background: #dbeafe;
        border-color: #3b82f6;
    }
    .insight-warning {
        background: #fee2e2;
        border-color: #ef4444;
    }
    .insight-efficiency {
        background: #d1fae5;
        border-color: #10b981;
    }
    .insight-success {
        background: #e9d5ff;
        border-color: #a855f7;
    }
</style>
""", unsafe_allow_html=True)

# 数据文件路径
DATA_FILE = "goal_planner_data.json"

# 数据结构初始化
def init_session_state():
    """初始化 session state"""
    if 'goals' not in st.session_state:
        st.session_state.goals = []
    if 'tasks' not in st.session_state:
        st.session_state.tasks = []
    if 'weekly_tasks' not in st.session_state:
        st.session_state.weekly_tasks = []  # 新增周任务列表
    if 'activities' not in st.session_state:
        st.session_state.activities = []
    if 'insights' not in st.session_state:
        st.session_state.insights = []
    if 'schedule' not in st.session_state:
        st.session_state.schedule = []
    if 'weekly_schedule' not in st.session_state:
        st.session_state.weekly_schedule = {}  # 新增七日日程字典
    if 'api_enabled' not in st.session_state:
        st.session_state.api_enabled = False
    if 'ai_provider' not in st.session_state:
        st.session_state.ai_provider = "claude"
    if 'api_configs' not in st.session_state:
        st.session_state.api_configs = {
            'claude': {'api_key': '', 'model': 'claude-3-5-sonnet-20241022'},
            'openai': {'api_key': '', 'model': 'gpt-4o'},
            'qwen': {'api_key': '', 'model': 'qwen-max', 'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1'},
            'deepseek': {'api_key': '', 'model': 'deepseek-chat', 'base_url': 'https://api.deepseek.com/v1'}
        }

# 数据持久化
def save_data():
    """保存数据到文件"""
    data = {
        'goals': st.session_state.goals,
        'tasks': st.session_state.tasks,
        'weekly_tasks': st.session_state.get('weekly_tasks', []),
        'activities': st.session_state.activities,
        'insights': st.session_state.insights,
        'schedule': st.session_state.schedule,
        'weekly_schedule': st.session_state.get('weekly_schedule', {}),
        'saved_at': datetime.now().isoformat()
    }
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_data():
    """从文件加载数据"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                st.session_state.goals = data.get('goals', [])
                st.session_state.tasks = data.get('tasks', [])
                st.session_state.weekly_tasks = data.get('weekly_tasks', [])
                st.session_state.activities = data.get('activities', [])
                st.session_state.insights = data.get('insights', [])
                st.session_state.schedule = data.get('schedule', [])
                st.session_state.weekly_schedule = data.get('weekly_schedule', {})
        except Exception as e:
            st.error(f"加载数据失败: {str(e)}")

# AI API 调用类
class AIClient:
    """统一的AI客户端类，支持多个提供商"""
    
    @staticmethod
    def call_ai_api(prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """调用选定的AI API"""
        if not st.session_state.api_enabled:
            st.warning("请先在设置中启用AI API")
            return None
            
        provider = st.session_state.ai_provider
        config = st.session_state.api_configs.get(provider, {})
        api_key = config.get('api_key', '')
        
        if not api_key:
            st.warning(f"请先在设置中配置 {provider.upper()} API Key")
            return None
        
        try:
            if provider == 'claude':
                return AIClient._call_claude(prompt, max_tokens, config)
            elif provider == 'openai':
                return AIClient._call_openai(prompt, max_tokens, config)
            elif provider == 'qwen':
                return AIClient._call_qwen(prompt, max_tokens, config)
            elif provider == 'deepseek':
                return AIClient._call_deepseek(prompt, max_tokens, config)
            else:
                st.error(f"不支持的AI提供商: {provider}")
                return None
        except Exception as e:
            st.error(f"{provider.upper()} API 调用失败: {str(e)}")
            return None
    
    @staticmethod
    def _call_claude(prompt: str, max_tokens: int, config: Dict) -> str:
        """调用Claude API"""
        client = anthropic.Anthropic(api_key=config['api_key'])
        message = client.messages.create(
            model=config['model'],
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    
    @staticmethod
    def _call_openai(prompt: str, max_tokens: int, config: Dict) -> str:
        """调用OpenAI API"""
        client = openai.OpenAI(api_key=config['api_key'])
        response = client.chat.completions.create(
            model=config['model'],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    @staticmethod
    def _call_qwen(prompt: str, max_tokens: int, config: Dict) -> str:
        """调用通义千问API"""
        client = openai.OpenAI(
            api_key=config['api_key'],
            base_url=config['base_url']
        )
        response = client.chat.completions.create(
            model=config['model'],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    @staticmethod
    def _call_deepseek(prompt: str, max_tokens: int, config: Dict) -> str:
        """调用DeepSeek API"""
        client = openai.OpenAI(
            api_key=config['api_key'],
            base_url=config['base_url']
        )
        response = client.chat.completions.create(
            model=config['model'],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

# 生成智能日程
def generate_schedule():
    """生成智能日程"""
    schedule = []
    activities = sorted(st.session_state.activities, key=lambda x: x['startTime'])
    tasks = sorted(
        [t for t in st.session_state.tasks if not t['completed']], 
        key=lambda x: x['priority'], 
        reverse=True
    )
    
    current_time = 480  # 8:00 AM in minutes
    
    for activity in activities:
        hours, minutes = map(int, activity['startTime'].split(':'))
        activity_start = hours * 60 + minutes
        
        # 在活动之前安排任务
        if activity_start > current_time and tasks:
            available_time = activity_start - current_time
            if available_time >= 30:
                task = tasks.pop(0)
                schedule.append({
                    'type': 'task',
                    'item': task,
                    'startTime': current_time,
                    'duration': min(available_time, task['estimatedTime'])
                })
        
        # 添加活动
        schedule.append({
            'type': 'activity',
            'item': activity,
            'startTime': activity_start,
            'duration': activity['duration']
        })
        
        current_time = activity_start + activity['duration']
    
    st.session_state.schedule = schedule
    generate_basic_insights()

# 生成基础洞察
def generate_basic_insights():
    """生成基础效率洞察"""
    insights = []
    
    # 检测重复任务
    task_names = [t['name'].lower() for t in st.session_state.tasks]
    duplicates = len(task_names) - len(set(task_names))
    if duplicates > 0:
        insights.append({
            'type': 'automation',
            'title': '发现重复任务',
            'description': f'检测到 {duplicates} 个重复任务，建议创建模板或自动化流程',
            'priority': 'high'
        })
    
    # 检测时间超载
    total_task_time = sum(t['estimatedTime'] for t in st.session_state.tasks)
    total_activity_time = sum(a['duration'] for a in st.session_state.activities)
    available_time = 960 - total_activity_time
    
    if total_task_time > available_time:
        insights.append({
            'type': 'warning',
            'title': '任务时间超载',
            'description': f'今日任务需要 {total_task_time//60} 小时，但只有 {available_time//60} 小时可用。建议重新评估优先级',
            'priority': 'high'
        })
    
    # 检测会议密集
    meeting_count = len([t for t in st.session_state.tasks if t['category'] == '会议'])
    if meeting_count > 3:
        insights.append({
            'type': 'efficiency',
            'title': '会议密集',
            'description': '今日会议较多，建议合并相关会议或改用异步沟通',
            'priority': 'medium'
        })
    
    st.session_state.insights = insights

# 生成 AI 洞察
def generate_ai_insights():
    """使用 Claude AI 生成深度洞察"""
    prompt = f"""作为一个专业的效率顾问，请分析以下用户的目标、任务和日程安排，提供深度洞察和建议：

目标列表：
{chr(10).join([f"- {g['name']} ({g['type']}, 进度: {g['progress']}%)" for g in st.session_state.goals])}

日常活动：
{chr(10).join([f"- {a['name']} at {a['startTime']}, {a['duration']}分钟" for a in st.session_state.activities])}

待办任务：
{chr(10).join([f"- {t['name']} (优先级: {t['priority']}, 预计: {t['estimatedTime']}分钟)" for t in st.session_state.tasks if not t['completed']])}

请提供以下分析：
1. 识别可以自动化或优化的重复性工作
2. 时间管理建议
3. 目标对齐度分析（任务是否支持目标）
4. 效率提升的具体行动建议
5. 潜在的时间陷阱或浪费

请以JSON格式返回，格式如下：
{{
  "insights": [
    {{
      "type": "automation/efficiency/warning/success",
      "title": "标题",
      "description": "详细描述",
      "priority": "high/medium/low",
      "actionable": "具体可执行的建议"
    }}
  ]
}}

只返回JSON，不要其他内容。"""
    
    with st.spinner('AI 正在分析中...'):
        response = AIClient.call_ai_api(prompt, max_tokens=2000)
        if response:
            try:
                # 去除可能的 markdown 代码块标记
                response = response.replace('```json', '').replace('```', '').strip()
                result = json.loads(response)
                st.session_state.insights = result.get('insights', [])
                st.success('✨ AI 洞察生成成功！')
            except Exception as e:
                st.error(f"解析 AI 响应失败: {str(e)}")

# AI 目标分解
def ai_goal_breakdown(goal: Dict):
    """使用 AI 分解目标"""
    prompt = f"""作为一个目标管理专家，请帮我将以下大目标分解为更小、更可执行的子目标。

目标信息：
- 名称: {goal['name']}
- 类型: {goal['type']}
- 分类: {goal.get('category', '未分类')}
- 描述: {goal.get('description', '无')}
- 截止日期: {goal.get('deadline', '无')}

请将这个{goal['type']}分解为适当粒度的子目标，遵循以下原则：
1. 如果是长期目标，分解为3-5个年度目标
2. 如果是年度目标，分解为4-6个季度目标
3. 如果是季度目标，分解为3-4个月度目标
4. 如果是月度目标，分解为4-5个周任务
5. 如果是周任务，分解为每天的具体行动（包括建议的执行日期和时间）
6. 每个子目标应该是SMART原则的（具体、可衡量、可实现、相关、有时限）
7. 子目标之间应有逻辑关系，形成实现主目标的路径
8. 为每个子目标设定合理的截止日期和预计完成时间

请以JSON格式返回，格式如下：
{{
  "analysis": "对主目标的分析和分解思路",
  "subGoals": [
    {{
      "name": "子目标名称",
      "type": "年度/季度/月度/周",
      "category": "分类",
      "description": "详细描述",
      "deadline": "YYYY-MM-DD",
      "estimatedTime": 60,
      "priority": 2,
      "keyActions": ["关键行动1", "关键行动2"]
    }}
  ]
}}

只返回JSON，不要其他内容。"""
    
    with st.spinner('AI 正在分析目标...'):
        response = AIClient.call_ai_api(prompt, max_tokens=2500)
        if response:
            try:
                response = response.replace('```json', '').replace('```', '').strip()
                result = json.loads(response)
                return result
            except Exception as e:
                st.error(f"解析 AI 响应失败: {str(e)}")
                return None
    return None

# 获取近七日的周任务
def get_weekly_tasks_for_next_7_days():
    """获取未来7天内需要完成的周任务"""
    today = datetime.now().date()
    seven_days_later = today + timedelta(days=7)
    
    upcoming_tasks = []
    for task in st.session_state.weekly_tasks:
        if task.get('completed'):
            continue
        
        # 检查任务是否在未来7天内
        task_date = task.get('scheduledDate')
        if task_date:
            try:
                task_datetime = datetime.fromisoformat(task_date).date()
                if today <= task_datetime <= seven_days_later:
                    upcoming_tasks.append(task)
            except:
                pass
    
    return sorted(upcoming_tasks, key=lambda x: x.get('scheduledDate', ''))

# 生成七日智能日程
def generate_weekly_schedule():
    """生成未来7天的智能日程安排"""
    weekly_schedule = {}
    
    # 获取未来7天的日期
    base_date = datetime.now().date()
    
    for day_offset in range(7):
        current_date = base_date + timedelta(days=day_offset)
        date_str = current_date.isoformat()
        
        # 获取这一天的周任务
        day_weekly_tasks = [
            t for t in st.session_state.weekly_tasks 
            if t.get('scheduledDate') == date_str and not t.get('completed')
        ]
        
        # 获取这一天的普通任务
        day_tasks = [
            t for t in st.session_state.tasks 
            if t.get('scheduledDate') == date_str and not t.get('completed')
        ]
        
        # 合并所有任务并排序
        all_tasks = day_weekly_tasks + day_tasks
        all_tasks = sorted(all_tasks, key=lambda x: x.get('priority', 1), reverse=True)
        
        # 生成这一天的时间表
        schedule = []
        activities = sorted(st.session_state.activities, key=lambda x: x['startTime'])
        
        current_time = 480  # 8:00 AM in minutes
        
        for activity in activities:
            hours, minutes = map(int, activity['startTime'].split(':'))
            activity_start = hours * 60 + minutes
            
            # 在活动之前安排任务
            if activity_start > current_time and all_tasks:
                available_time = activity_start - current_time
                while available_time >= 30 and all_tasks:
                    task = all_tasks.pop(0)
                    task_duration = task.get('estimatedTime', 60)
                    actual_duration = min(available_time, task_duration)
                    
                    schedule.append({
                        'type': 'task',
                        'item': task,
                        'startTime': current_time,
                        'duration': actual_duration
                    })
                    
                    current_time += actual_duration
                    available_time -= actual_duration
            
            # 添加活动
            schedule.append({
                'type': 'activity',
                'item': activity,
                'startTime': activity_start,
                'duration': activity['duration']
            })
            
            current_time = activity_start + activity['duration']
        
        # 安排剩余任务
        while all_tasks and current_time < 1320:  # 22:00
            task = all_tasks.pop(0)
            task_duration = task.get('estimatedTime', 60)
            
            schedule.append({
                'type': 'task',
                'item': task,
                'startTime': current_time,
                'duration': task_duration
            })
            
            current_time += task_duration
        
        weekly_schedule[date_str] = schedule
    
    st.session_state.weekly_schedule = weekly_schedule
    return weekly_schedule

# 导出日程到iCalendar格式
def export_to_icalendar(schedule_dict: Dict) -> str:
    """将日程导出为iCalendar格式的字符串"""
    
    # iCalendar头部
    ical_content = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//智能目标管理系统//Goal Planner v1.0//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:智能目标管理日程",
        "X-WR-TIMEZONE:Asia/Shanghai",
    ]
    
    # 为每个日期的每个事项创建事件
    for date_str, schedule in schedule_dict.items():
        for item in schedule:
            event_date = datetime.fromisoformat(date_str)
            start_time = format_time(item['startTime'])
            end_time = format_time(item['startTime'] + item['duration'])
            
            # 创建datetime对象
            start_datetime = datetime.combine(
                event_date.date(),
                datetime.strptime(start_time, '%H:%M').time()
            )
            end_datetime = datetime.combine(
                event_date.date(),
                datetime.strptime(end_time, '%H:%M').time()
            )
            
            # 转换为UTC时间字符串格式
            dtstart = start_datetime.strftime('%Y%m%dT%H%M%S')
            dtend = end_datetime.strftime('%Y%m%dT%H%M%S')
            
            # 创建唯一ID
            uid = f"{dtstart}-{item['type']}-{hash(item['item']['name'])}@goalplanner"
            
            # 事件名称和描述
            if item['type'] == 'task':
                task_item = item['item']
                summary = f"🎯 {task_item['name']}"
                description = f"类型: 任务\\n"
                description += f"优先级: {task_item.get('priority', 2)}\\n"
                if task_item.get('preparation'):
                    description += f"准备: {task_item['preparation']}\\n"
                if task_item.get('guidance'):
                    description += f"指导: {task_item['guidance']}\\n"
            else:
                activity_item = item['item']
                summary = f"⏰ {activity_item['name']}"
                description = "类型: 日常活动"
            
            # 添加事件
            ical_content.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}",
                f"DTSTART:{dtstart}",
                f"DTEND:{dtend}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{description}",
                "STATUS:CONFIRMED",
                "TRANSP:OPAQUE",
                "END:VEVENT",
            ])
    
    # iCalendar结尾
    ical_content.append("END:VCALENDAR")
    
    return "\n".join(ical_content)

# 格式化时间
def format_time(minutes: int) -> str:
    """将分钟转换为时间格式"""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"

# 主应用
def main():
    init_session_state()
    load_data()
    
    # 侧边栏
    with st.sidebar:
        st.title("🎯 智能目标管理")
        
        page = st.radio(
            "导航",
            ["📊 仪表板", "🎯 目标", "📅 日程", "💡 洞察", "⚙️ 设置"],
            label_visibility="collapsed"
        )
        
        st.divider()
        
        # 快速操作
        st.subheader("快速操作")
        if st.button("➕ 添加目标"):
            st.session_state.show_goal_modal = True
        if st.button("📝 添加任务"):
            st.session_state.show_task_modal = True
        if st.button("🧠 生成今日日程"):
            generate_schedule()
            save_data()
            st.success("今日日程已生成！")
        if st.button("📅 生成七日日程"):
            generate_weekly_schedule()
            save_data()
            st.success("七日日程已生成！")
        if st.button("✨ AI洞察"):
            if st.session_state.api_enabled:
                generate_ai_insights()
                save_data()
            else:
                st.warning("请先在设置中启用AI API")
    
    # 主内容区域
    if page == "📊 仪表板":
        show_dashboard()
    elif page == "🎯 目标":
        show_goals()
    elif page == "📅 日程":
        show_schedule()
    elif page == "💡 洞察":
        show_insights()
    elif page == "⚙️ 设置":
        show_settings()

def show_dashboard():
    """显示仪表板"""
    st.title("📊 仪表板")
    
    # 统计卡片
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown('<div class="stat-card">', unsafe_allow_html=True)
        st.metric("活跃目标", len(st.session_state.goals))
        st.markdown('</div>', unsafe_allow_html=True)
    
    with col2:
        active_tasks = len([t for t in st.session_state.tasks if not t['completed']])
        st.markdown('<div class="stat-card">', unsafe_allow_html=True)
        st.metric("今日任务", active_tasks)
        st.markdown('</div>', unsafe_allow_html=True)
    
    with col3:
        if st.session_state.tasks:
            completion_rate = len([t for t in st.session_state.tasks if t['completed']]) / len(st.session_state.tasks) * 100
        else:
            completion_rate = 0
        st.markdown('<div class="stat-card">', unsafe_allow_html=True)
        st.metric("完成率", f"{completion_rate:.0f}%")
        st.markdown('</div>', unsafe_allow_html=True)
    
    with col4:
        st.markdown('<div class="stat-card">', unsafe_allow_html=True)
        st.metric("效率建议", len(st.session_state.insights))
        st.markdown('</div>', unsafe_allow_html=True)
    
    st.divider()
    
    # 今日重点任务
    st.subheader("📋 今日重点任务")
    active_tasks = [t for t in st.session_state.tasks if not t['completed']][:5]
    
    if active_tasks:
        for task in active_tasks:
            col1, col2 = st.columns([0.1, 0.9])
            with col1:
                if st.checkbox("", key=f"task_check_{task['id']}", value=task['completed']):
                    task['completed'] = True
                    save_data()
                    st.rerun()
            with col2:
                priority_color = {1: "🟢", 2: "🟡", 3: "🔴"}
                st.write(f"{priority_color[task['priority']]} **{task['name']}** ({task['estimatedTime']}分钟)")
                if task.get('preparation'):
                    st.caption(f"📋 {task['preparation']}")
    else:
        st.info("暂无待办任务，添加一些任务开始吧！")
    
    st.divider()
    
    # 最新洞察
    if st.session_state.insights:
        st.subheader("💡 效率洞察")
        for insight in st.session_state.insights[:3]:
            show_insight_card(insight)

def show_goals():
    """显示目标页面"""
    st.title("🎯 我的目标")
    
    col1, col2 = st.columns([0.8, 0.2])
    with col2:
        if st.button("➕ 新建目标", use_container_width=True):
            st.session_state.show_goal_modal = True
    
    st.divider()
    
    if st.session_state.goals:
        for goal in st.session_state.goals:
            show_goal_card(goal)
    else:
        st.info("还没有目标，开始设定你的第一个目标吧！")
    
    # 目标创建/编辑模态框
    if st.session_state.get('show_goal_modal', False):
        show_goal_modal()
    
    # AI 分解模态框
    if st.session_state.get('show_breakdown_modal', False):
        show_breakdown_modal()

def show_goal_card(goal: Dict):
    """显示目标卡片"""
    st.markdown('<div class="goal-card">', unsafe_allow_html=True)
    
    col1, col2 = st.columns([0.85, 0.15])
    
    with col1:
        # 标签
        type_colors = {
            '长期': '🟣', '年度': '🔵', '季度': '🟢', '月度': '🟡', '周': '🟠'
        }
        st.write(f"{type_colors.get(goal['type'], '⚪')} **{goal['type']}** | {goal.get('category', '未分类')}")
        if goal.get('parentGoalId'):
            st.caption("📌 子目标")
        
        # 名称和描述
        st.subheader(goal['name'])
        if goal.get('description'):
            st.write(goal['description'])
        
        # 进度条
        st.progress(goal['progress'] / 100, text=f"进度: {goal['progress']}%")
        
        if goal.get('deadline'):
            st.caption(f"📅 截止日期: {goal['deadline']}")
    
    with col2:
        # 操作按钮
        can_breakdown = goal['type'] in ['长期', '年度', '季度', '月度', '周']
        
        if can_breakdown and st.button("🧠", key=f"breakdown_{goal['id']}", help="AI分解"):
            st.session_state.selected_goal = goal
            st.session_state.show_breakdown_modal = True
            st.rerun()
        
        if st.button("✏️", key=f"edit_{goal['id']}", help="编辑"):
            st.session_state.editing_goal = goal
            st.session_state.show_goal_modal = True
            st.rerun()
        
        if st.button("🗑️", key=f"delete_{goal['id']}", help="删除"):
            st.session_state.goals = [g for g in st.session_state.goals if g['id'] != goal['id']]
            save_data()
            st.rerun()
    
    st.markdown('</div>', unsafe_allow_html=True)

def show_goal_modal():
    """显示目标创建/编辑模态框"""
    st.subheader("新建目标" if 'editing_goal' not in st.session_state else "编辑目标")
    
    editing_goal = st.session_state.get('editing_goal', {})
    
    with st.form("goal_form"):
        name = st.text_input("目标名称*", value=editing_goal.get('name', ''))
        goal_type = st.selectbox(
            "目标类型*",
            ['长期', '年度', '季度', '月度', '周'],
            index=['长期', '年度', '季度', '月度', '周'].index(editing_goal.get('type', '月度'))
        )
        category = st.text_input("分类", value=editing_goal.get('category', ''), placeholder="如：健康、事业、学习")
        description = st.text_area("目标描述", value=editing_goal.get('description', ''))
        deadline = st.date_input("截止日期", value=None)
        progress = st.slider("当前进度 (%)", 0, 100, editing_goal.get('progress', 0))
        
        col1, col2 = st.columns(2)
        with col1:
            submitted = st.form_submit_button("保存", use_container_width=True)
        with col2:
            cancelled = st.form_submit_button("取消", use_container_width=True)
        
        if submitted and name:
            goal_data = {
                'id': editing_goal.get('id', datetime.now().timestamp()),
                'name': name,
                'type': goal_type,
                'category': category,
                'description': description,
                'deadline': deadline.isoformat() if deadline else '',
                'progress': progress,
                'createdAt': editing_goal.get('createdAt', datetime.now().isoformat())
            }
            
            if 'editing_goal' in st.session_state:
                # 更新现有目标
                st.session_state.goals = [
                    goal_data if g['id'] == editing_goal['id'] else g 
                    for g in st.session_state.goals
                ]
                del st.session_state.editing_goal
            else:
                # 添加新目标
                st.session_state.goals.append(goal_data)
            
            save_data()
            st.session_state.show_goal_modal = False
            st.success("目标已保存！")
            st.rerun()
        
        if cancelled:
            st.session_state.show_goal_modal = False
            if 'editing_goal' in st.session_state:
                del st.session_state.editing_goal
            st.rerun()

def show_breakdown_modal():
    """显示 AI 目标分解模态框"""
    goal = st.session_state.get('selected_goal')
    if not goal:
        return
    
    st.subheader(f"🧠 AI 目标分解: {goal['name']}")
    
    if 'breakdown_result' not in st.session_state:
        if st.button("开始分解", type="primary"):
            result = ai_goal_breakdown(goal)
            if result:
                st.session_state.breakdown_result = result
                st.rerun()
    else:
        result = st.session_state.breakdown_result
        
        st.info(f"💡 分析: {result.get('analysis', '')}")
        
        st.divider()
        st.write("**选择要添加的子目标：**")
        
        selected_indices = []
        for i, sub_goal in enumerate(result.get('subGoals', [])):
            with st.expander(f"{sub_goal['type']} - {sub_goal['name']}", expanded=True):
                col1, col2 = st.columns([0.1, 0.9])
                with col1:
                    if st.checkbox("", key=f"subgoal_{i}", value=True):
                        selected_indices.append(i)
                with col2:
                    st.write(f"**类型**: {sub_goal['type']}")
                    st.write(f"**分类**: {sub_goal.get('category', '')}")
                    st.write(f"**描述**: {sub_goal.get('description', '')}")
                    st.write(f"**截止日期**: {sub_goal.get('deadline', '')}")
                    if sub_goal.get('keyActions'):
                        st.write("**关键行动**:")
                        for action in sub_goal['keyActions']:
                            st.write(f"• {action}")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("取消", use_container_width=True):
                st.session_state.show_breakdown_modal = False
                del st.session_state.breakdown_result
                del st.session_state.selected_goal
                st.rerun()
        with col2:
            if st.button("重新生成", use_container_width=True):
                del st.session_state.breakdown_result
                st.rerun()
        with col3:
            if st.button(f"添加 {len(selected_indices)} 个目标", type="primary", use_container_width=True):
                for i in selected_indices:
                    sub_goal = result['subGoals'][i]
                    
                    # 如果是周类型，添加到weekly_tasks，否则添加到goals
                    if sub_goal['type'] == '周':
                        new_task = {
                            'id': datetime.now().timestamp() + i,
                            'name': sub_goal['name'],
                            'goalId': goal['id'],
                            'category': sub_goal.get('category', ''),
                            'description': sub_goal.get('description', ''),
                            'priority': sub_goal.get('priority', 2),
                            'estimatedTime': sub_goal.get('estimatedTime', 60),
                            'scheduledDate': sub_goal.get('deadline', ''),
                            'completed': False,
                            'createdAt': datetime.now().isoformat()
                        }
                        st.session_state.weekly_tasks.append(new_task)
                    else:
                        new_goal = {
                            'id': datetime.now().timestamp() + i,
                            'name': sub_goal['name'],
                            'type': sub_goal['type'],
                            'category': sub_goal.get('category', ''),
                            'description': sub_goal.get('description', ''),
                            'deadline': sub_goal.get('deadline', ''),
                            'progress': 0,
                            'createdAt': datetime.now().isoformat(),
                            'parentGoalId': goal['id']
                        }
                        st.session_state.goals.append(new_goal)
                
                save_data()
                st.session_state.show_breakdown_modal = False
                del st.session_state.breakdown_result
                del st.session_state.selected_goal
                st.success(f"✅ 已添加 {len(selected_indices)} 个子目标！")
                st.rerun()

def show_schedule():
    """显示日程页面"""
    st.title("📅 智能日程")
    
    # 选项卡：今日日程 vs 七日日程
    tab1, tab2, tab3 = st.tabs(["📋 今日日程", "📅 七日日程", "⏰ 日常活动"])
    
    with tab1:
        # 今日日程视图
        col1, col2 = st.columns([0.6, 0.4])
        with col1:
            st.subheader("今日时间安排")
        with col2:
            if st.button("🧠 生成今日日程", use_container_width=True):
                generate_schedule()
                save_data()
                st.success("今日日程已生成！")
                st.rerun()
        
        if st.session_state.schedule:
            for item in st.session_state.schedule:
                start_time = format_time(item['startTime'])
                end_time = format_time(item['startTime'] + item['duration'])
                
                if item['type'] == 'task':
                    with st.container():
                        st.markdown(
                            f"""<div style='background:#e0e7ff;padding:1rem;border-radius:0.5rem;border-left:4px solid #4f46e5;margin-bottom:0.5rem'>
                            <strong>🎯 {item['item']['name']}</strong><br>
                            <span style='color:#6b7280;font-size:0.875rem'>{start_time} - {end_time}</span>
                            </div>""",
                            unsafe_allow_html=True
                        )
                else:
                    st.write(f"⏰ **{item['item']['name']}** | {start_time} - {end_time}")
        else:
            st.info("点击'生成今日日程'按钮创建日程安排")
    
    with tab2:
        # 七日日程视图
        col1, col2, col3 = st.columns([0.4, 0.3, 0.3])
        with col1:
            st.subheader("未来七日安排")
        with col2:
            if st.button("🧠 生成七日日程", use_container_width=True):
                generate_weekly_schedule()
                save_data()
                st.success("七日日程已生成！")
                st.rerun()
        with col3:
            if st.button("� 导出到日历", use_container_width=True):
                if st.session_state.weekly_schedule:
                    ical_content = export_to_icalendar(st.session_state.weekly_schedule)
                    st.download_button(
                        label="下载 .ics 文件",
                        data=ical_content,
                        file_name=f"goal_planner_schedule_{datetime.now().strftime('%Y%m%d')}.ics",
                        mime="text/calendar",
                        use_container_width=True
                    )
                else:
                    st.warning("请先生成七日日程")
        
        st.divider()
        
        # 显示周任务摘要
        upcoming_weekly_tasks = get_weekly_tasks_for_next_7_days()
        if upcoming_weekly_tasks:
            with st.expander(f"📌 本周待办任务 ({len(upcoming_weekly_tasks)})", expanded=True):
                for task in upcoming_weekly_tasks:
                    priority_color = {1: "🟢", 2: "🟡", 3: "🔴"}
                    date_str = task.get('scheduledDate', '未设定')
                    st.write(f"{priority_color.get(task.get('priority', 2), '⚪')} **{task['name']}** - {date_str}")
        
        st.divider()
        
        # 显示七日日程
        if st.session_state.weekly_schedule:
            base_date = datetime.now().date()
            weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            
            for day_offset in range(7):
                current_date = base_date + timedelta(days=day_offset)
                date_str = current_date.isoformat()
                weekday = weekdays[current_date.weekday()]
                
                schedule = st.session_state.weekly_schedule.get(date_str, [])
                
                with st.expander(f"{weekday} - {current_date.strftime('%Y年%m月%d日')} ({len(schedule)} 项)", expanded=(day_offset == 0)):
                    if schedule:
                        for item in schedule:
                            start_time = format_time(item['startTime'])
                            end_time = format_time(item['startTime'] + item['duration'])
                            
                            if item['type'] == 'task':
                                task_item = item['item']
                                priority_emoji = {1: "🟢", 2: "🟡", 3: "🔴"}
                                st.markdown(
                                    f"""<div style='background:#f0f9ff;padding:0.75rem;border-radius:0.375rem;border-left:3px solid #0ea5e9;margin-bottom:0.5rem'>
                                    {priority_emoji.get(task_item.get('priority', 2), '⚪')} <strong>{task_item['name']}</strong><br>
                                    <span style='color:#6b7280;font-size:0.875rem'>⏰ {start_time} - {end_time} ({item['duration']}分钟)</span>
                                    </div>""",
                                    unsafe_allow_html=True
                                )
                            else:
                                st.write(f"⏰ **{item['item']['name']}** | {start_time} - {end_time}")
                    else:
                        st.info("该日暂无安排")
        else:
            st.info("点击'生成七日日程'按钮创建未来7天的日程安排")
    
    with tab3:
        # 日常活动管理
        col1, col2 = st.columns([0.8, 0.2])
        with col1:
            st.subheader("⏰ 日常固定活动")
        with col2:
            if st.button("➕ 添加活动", use_container_width=True):
                st.session_state.show_activity_modal = True
        
        if st.session_state.activities:
            activities = sorted(st.session_state.activities, key=lambda x: x['startTime'])
            for activity in activities:
                col1, col2, col3 = st.columns([0.6, 0.3, 0.1])
                with col1:
                    st.write(f"🕐 **{activity['name']}**")
                with col2:
                    st.write(f"{activity['startTime']} ({activity['duration']}分钟)")
                with col3:
                    if st.button("🗑️", key=f"del_act_{activity['id']}"):
                        st.session_state.activities = [
                            a for a in st.session_state.activities if a['id'] != activity['id']
                        ]
                        save_data()
                        st.rerun()
        else:
            st.info("添加你的日常活动，如起床、吃饭、运动等")
    
    # 活动模态框
    if st.session_state.get('show_activity_modal', False):
        show_activity_modal()

def show_activity_modal():
    """显示活动创建模态框"""
    st.subheader("新建日常活动")
    
    with st.form("activity_form"):
        name = st.text_input("活动名称*", placeholder="如：晨练、午餐")
        start_time = st.time_input("开始时间", value=None)
        duration = st.number_input("持续时间（分钟）", min_value=5, step=5, value=60)
        
        col1, col2 = st.columns(2)
        with col1:
            submitted = st.form_submit_button("保存", use_container_width=True)
        with col2:
            cancelled = st.form_submit_button("取消", use_container_width=True)
        
        if submitted and name and start_time:
            activity_data = {
                'id': datetime.now().timestamp(),
                'name': name,
                'startTime': start_time.strftime('%H:%M'),
                'duration': duration
            }
            st.session_state.activities.append(activity_data)
            save_data()
            st.session_state.show_activity_modal = False
            st.success("活动已添加！")
            st.rerun()
        
        if cancelled:
            st.session_state.show_activity_modal = False
            st.rerun()

def show_insights():
    """显示洞察页面"""
    st.title("💡 效率洞察与建议")
    
    col1, col2 = st.columns([0.8, 0.2])
    with col2:
        if st.button("🔄 重新生成", use_container_width=True):
            if st.session_state.api_enabled:
                generate_ai_insights()
                save_data()
            else:
                st.warning("请先在设置中启用AI API")
    
    st.divider()
    
    if st.session_state.insights:
        for insight in st.session_state.insights:
            show_insight_card(insight, detailed=True)
    else:
        st.info("生成日程后将显示个性化效率建议")
        if st.button("使用 AI 生成深度洞察", type="primary"):
            if st.session_state.api_enabled:
                generate_ai_insights()
                save_data()
            else:
                st.warning("请先在设置中启用AI API")

def show_insight_card(insight: Dict, detailed: bool = False):
    """显示洞察卡片"""
    type_class = f"insight-{insight['type']}"
    
    html = f"""
    <div class="insight-card {type_class}">
        <h4>💡 {insight['title']}</h4>
        <p>{insight['description']}</p>
    """
    
    if detailed and insight.get('actionable'):
        html += f"""
        <div style="background:rgba(255,255,255,0.5);padding:0.75rem;border-radius:0.375rem;margin-top:0.75rem">
            <strong>🎯 可执行建议：</strong><br>
            {insight['actionable']}
        </div>
        """
    
    html += "</div>"
    st.markdown(html, unsafe_allow_html=True)

def show_settings():
    """显示设置页面"""
    st.title("⚙️ 系统设置")
    
    # AI 配置
    st.subheader("🤖 AI 智能分析配置")
    
    # 启用/禁用 AI 功能
    api_enabled = st.checkbox(
        "启用 AI 智能分析",
        value=st.session_state.api_enabled,
        help="启用后可使用AI进行目标分解、效率洞察等功能"
    )
    st.session_state.api_enabled = api_enabled
    
    if api_enabled:
        # AI 提供商选择
        st.write("**选择 AI 提供商：**")
        provider_options = {
            'claude': '🔮 Claude (Anthropic)',
            'openai': '🧠 ChatGPT (OpenAI)', 
            'qwen': '🌟 通义千问 (阿里云)',
            'deepseek': '🚀 DeepSeek'
        }
        
        selected_provider = st.selectbox(
            "AI 提供商",
            options=list(provider_options.keys()),
            format_func=lambda x: provider_options[x],
            index=list(provider_options.keys()).index(st.session_state.ai_provider)
        )
        st.session_state.ai_provider = selected_provider
        
        # 当前选择的提供商配置
        current_config = st.session_state.api_configs[selected_provider]
        
        st.divider()
        
        # 根据不同提供商显示不同的配置界面
        if selected_provider == 'claude':
            st.write("**🔮 Claude 配置**")
            api_key = st.text_input(
                "Anthropic API Key",
                value=current_config['api_key'],
                type="password",
                help="在 https://console.anthropic.com 获取 API Key"
            )
            claude_models = [
                'claude-3-5-sonnet-20241022',
                'claude-3-5-haiku-20241022', 
                'claude-3-sonnet-20240229',
                'claude-3-haiku-20240307',
                'claude-3-opus-20240229'
            ]
            model_index = claude_models.index(current_config['model']) if current_config['model'] in claude_models else 0
            model = st.selectbox(
                "模型选择",
                claude_models,
                index=model_index
            )
            with st.expander("📊 模型性能对比", expanded=False):
                st.markdown("""
                **Claude 3.5 Sonnet** (推荐) - 最先进的模型，高质量推理
                **Claude 3.5 Haiku** - 快速响应，适合简单任务
                **Claude 3 Sonnet** - 平衡性能与成本
                **Claude 3 Haiku** - 最快速、最经济
                **Claude 3 Opus** - 最高质量，适合复杂任务
                """)
            st.info("💡 Claude 在文本分析、创意写作和复杂推理方面表现出色")
            
        elif selected_provider == 'openai':
            st.write("**🧠 ChatGPT 配置**")
            api_key = st.text_input(
                "OpenAI API Key",
                value=current_config['api_key'],
                type="password",
                help="在 https://platform.openai.com 获取 API Key"
            )
            openai_models = [
                'gpt-4o',
                'gpt-4o-mini', 
                'gpt-4-turbo',
                'gpt-4',
                'gpt-3.5-turbo',
                'o1-preview',
                'o1-mini'
            ]
            model_index = openai_models.index(current_config['model']) if current_config['model'] in openai_models else 0
            model = st.selectbox(
                "模型选择",
                openai_models,
                index=model_index
            )
            with st.expander("� 模型性能对比", expanded=False):
                st.markdown("""
                **GPT-4o** (推荐) - 最新最强模型，多模态能力
                **GPT-4o Mini** - 轻量版，快速且经济
                **GPT-4 Turbo** - 高性能，支持更长上下文
                **GPT-4** - 经典高质量模型
                **GPT-3.5 Turbo** - 快速经济，基础任务
                **o1-preview** - 新推理模型，适合复杂问题
                **o1-mini** - 推理模型轻量版
                """)
            st.info("💡 OpenAI 在通用任务、编程和数学推理方面表现优秀")
            
        elif selected_provider == 'qwen':
            st.write("**🌟 通义千问配置**")
            api_key = st.text_input(
                "阿里云 API Key",
                value=current_config['api_key'],
                type="password",
                help="在阿里云控制台获取 API Key"
            )
            qwen_models = [
                'qwen-max',
                'qwen-plus',
                'qwen-turbo',
                'qwen2.5-72b-instruct',
                'qwen2.5-32b-instruct',
                'qwen2.5-14b-instruct',
                'qwen2.5-7b-instruct'
            ]
            model_index = qwen_models.index(current_config['model']) if current_config['model'] in qwen_models else 0
            model = st.selectbox(
                "模型选择",
                qwen_models,
                index=model_index
            )
            with st.expander("📊 模型性能对比", expanded=False):
                st.markdown("""
                **Qwen-Max** (推荐) - 最强模型，适合复杂任务
                **Qwen-Plus** - 平衡性能与成本
                **Qwen-Turbo** - 快速响应，日常任务
                **Qwen2.5-72B** - 开源最大模型
                **Qwen2.5-32B** - 中等规模，好性能
                **Qwen2.5-14B** - 轻量级，快速
                **Qwen2.5-7B** - 最轻量，超快速
                """)
            st.info("💡 通义千问在中文理解、文化背景和本土化场景中表现出色")
            
        elif selected_provider == 'deepseek':
            st.write("**🚀 DeepSeek 配置**")
            api_key = st.text_input(
                "DeepSeek API Key",
                value=current_config['api_key'],
                type="password",
                help="在 https://platform.deepseek.com 获取 API Key"
            )
            deepseek_models = [
                'deepseek-chat',
                'deepseek-coder',
                'deepseek-reasoner',
                'deepseek-v2.5'
            ]
            model_index = deepseek_models.index(current_config['model']) if current_config['model'] in deepseek_models else 0
            model = st.selectbox(
                "模型选择",
                deepseek_models,
                index=model_index
            )
            with st.expander("📊 模型性能对比", expanded=False):
                st.markdown("""
                **DeepSeek-Chat** (推荐) - 通用对话模型
                **DeepSeek-Coder** - 专业编程模型
                **DeepSeek-Reasoner** - 推理专用模型
                **DeepSeek-V2.5** - 最新版本，综合能力提升
                """)
            st.info("💡 DeepSeek 在数学、编程和逻辑推理方面表现优秀，性价比高")
        
        # 智能推荐
        st.divider()
        st.write("**🎯 场景推荐：**")
        
        scenario = st.selectbox(
            "选择你的主要使用场景",
            [
                "🎯 目标规划与分析",
                "💡 创意与洞察生成", 
                "📊 数据分析与总结",
                "🚀 快速日常任务",
                "💰 成本敏感场景",
                "🔬 复杂推理任务"
            ]
        )
        
        recommendations = {
            "🎯 目标规划与分析": {
                'claude': 'claude-3-5-sonnet-20241022',
                'openai': 'gpt-4o',
                'qwen': 'qwen-max',
                'deepseek': 'deepseek-chat'
            },
            "💡 创意与洞察生成": {
                'claude': 'claude-3-opus-20240229',
                'openai': 'gpt-4o',
                'qwen': 'qwen-max',
                'deepseek': 'deepseek-v2.5'
            },
            "📊 数据分析与总结": {
                'claude': 'claude-3-5-sonnet-20241022',
                'openai': 'gpt-4-turbo',
                'qwen': 'qwen-plus',
                'deepseek': 'deepseek-reasoner'
            },
            "🚀 快速日常任务": {
                'claude': 'claude-3-5-haiku-20241022',
                'openai': 'gpt-4o-mini',
                'qwen': 'qwen-turbo',
                'deepseek': 'deepseek-chat'
            },
            "💰 成本敏感场景": {
                'claude': 'claude-3-haiku-20240307',
                'openai': 'gpt-3.5-turbo',
                'qwen': 'qwen2.5-7b-instruct',
                'deepseek': 'deepseek-chat'
            },
            "🔬 复杂推理任务": {
                'claude': 'claude-3-opus-20240229',
                'openai': 'o1-preview',
                'qwen': 'qwen-max',
                'deepseek': 'deepseek-reasoner'
            }
        }
        
        recommended_model = recommendations[scenario][selected_provider]
        if st.button(f"📌 采用推荐模型: {recommended_model}", use_container_width=True):
            st.session_state.api_configs[selected_provider]['model'] = recommended_model
            st.success(f"✅ 已切换到推荐模型: {recommended_model}")
            st.rerun()
        
        # 保存配置
        st.session_state.api_configs[selected_provider]['api_key'] = api_key
        st.session_state.api_configs[selected_provider]['model'] = model
        
        # 测试连接
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔍 测试连接", use_container_width=True):
                if api_key:
                    with st.spinner(f"测试 {provider_options[selected_provider]} 连接..."):
                        test_response = AIClient.call_ai_api("请回复'连接成功'", max_tokens=50)
                        if test_response and "连接成功" in test_response:
                            st.success(f"✅ {provider_options[selected_provider]} 连接成功！")
                        elif test_response:
                            st.success(f"✅ {provider_options[selected_provider]} 连接成功！")
                        else:
                            st.error(f"❌ {provider_options[selected_provider]} 连接失败")
                else:
                    st.warning("请先输入 API Key")
        
        with col2:
            if st.button("� 保存配置", use_container_width=True):
                save_data()
                st.success("配置已保存！")
        
        st.divider()
        
        # 使用提示
        st.info(f"""
        🎯 **当前使用：{provider_options[selected_provider]}**
        
        **功能说明：**
        - 🧠 **AI 目标分解**：将大目标智能分解为可执行的小目标
        - 💡 **效率洞察**：分析你的任务和时间安排，提供个性化建议
        - 📊 **智能分析**：识别重复工作、时间浪费等效率问题
        
        **隐私保护：**
        - API Key 仅存储在本地浏览器中
        - 不会上传到任何服务器
        - 可随时更改或删除
        """)
        
        # 模型对比表
        with st.expander("📊 AI模型全面对比", expanded=False):
            st.markdown("""
            ### 🏆 顶级模型推荐 (2024最新)
            
            | 提供商 | 推荐模型 | 特点 | 适用场景 | 成本 |
            |--------|----------|------|----------|------|
            | 🔮 **Claude** | Claude-3.5-Sonnet | 顶级推理，创意强 | 复杂分析、创意写作 | ⭐⭐⭐ |  
            | 🧠 **OpenAI** | GPT-4o | 多模态，响应快 | 全能助手，图文理解 | ⭐⭐⭐⭐ |
            | 🌟 **通义千问** | Qwen-Max | 中文理解强 | 中文场景，本土化 | ⭐⭐ |
            | 🚀 **DeepSeek** | DeepSeek-V2.5 | 高性价比，推理强 | 数学、编程、推理 | ⭐ |
            
            ### ⚡ 高性价比模型
            
            | 模型 | 特点 | 速度 | 成本 | 推荐指数 |
            |------|------|------|------|----------|
            | Claude-3.5-Haiku | 快速，性价比高 | 🚀🚀🚀 | 💰 | ⭐⭐⭐⭐ |
            | GPT-4o-Mini | OpenAI轻量版 | 🚀🚀 | 💰 | ⭐⭐⭐⭐ |
            | Qwen-Turbo | 中文优化，快速 | 🚀🚀🚀 | 💰 | ⭐⭐⭐ |
            | DeepSeek-Chat | 极高性价比 | 🚀🚀 | 💰💰💰 | ⭐⭐⭐⭐⭐ |
            
            ### 🎯 专业用途模型
            
            **推理专家：**
            - `o1-preview` - OpenAI 推理模型，数学、逻辑强
            - `DeepSeek-Reasoner` - 专业推理，科学计算
            - `Claude-3-Opus` - 最高质量分析，创意无限
            
            **编程专家：**  
            - `DeepSeek-Coder` - 代码生成、调试专家
            - `GPT-4-Turbo` - 全栈开发，架构设计
            
            **中文专家：**
            - `Qwen2.5-72B` - 开源最强中文模型
            - `Qwen-Max` - 商用中文理解王者
            
            ### 💡 选择建议
            
            **新手推荐：** GPT-4o-Mini (平衡性能与成本)  
            **质量至上：** Claude-3.5-Sonnet (最佳推理能力)  
            **成本控制：** DeepSeek-Chat (极高性价比)  
            **中文场景：** Qwen-Max (本土化优势)  
            **复杂推理：** o1-preview (专业推理)
            """)
    
    st.divider()
    
    # 数据管理
    st.subheader("💾 数据管理")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📥 导出数据", use_container_width=True):
            data = {
                'goals': st.session_state.goals,
                'tasks': st.session_state.tasks,
                'activities': st.session_state.activities,
                'insights': st.session_state.insights,
                'schedule': st.session_state.schedule,
                'exportDate': datetime.now().isoformat()
            }
            
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            st.download_button(
                label="下载 JSON 文件",
                data=json_str,
                file_name=f"goal_planner_backup_{datetime.now().strftime('%Y%m%d')}.json",
                mime="application/json",
                use_container_width=True
            )
    
    with col2:
        uploaded_file = st.file_uploader("📤 导入数据", type=['json'])
        if uploaded_file is not None:
            try:
                data = json.load(uploaded_file)
                st.session_state.goals = data.get('goals', [])
                st.session_state.tasks = data.get('tasks', [])
                st.session_state.activities = data.get('activities', [])
                st.session_state.insights = data.get('insights', [])
                st.session_state.schedule = data.get('schedule', [])
                save_data()
                st.success("✅ 数据导入成功！")
                st.rerun()
            except Exception as e:
                st.error(f"❌ 数据导入失败: {str(e)}")
    
    st.info("""
    📱 **跨设备使用：**
    - 导出数据后保存到云存储（如 iCloud、Google Drive）
    - 在其他设备导入即可同步数据
    - 建议定期备份数据
    """)
    
    st.divider()
    
    # 日历集成说明
    st.subheader("📅 日历集成")
    
    st.success("""
    **导出日程到日历（已实现）：**
    
    1. 在"日程"页面生成七日日程
    2. 点击"导出到日历"按钮下载 .ics 文件
    3. 双击 .ics 文件自动导入到 macOS 日历
    
    **支持的日历应用：**
    - ✅ macOS 日历（推荐）
    - ✅ Google Calendar
    - ✅ Outlook
    - ✅ 任何支持 iCalendar 格式的应用
    
    **使用提示：**
    - 导出的日程包含所有任务和活动
    - 包含任务优先级、准备事项等详细信息
    - 可以在日历应用中直接编辑和管理
    """)
    
    st.divider()
    
    # 关于
    st.subheader("ℹ️ 关于")
    st.write("""
    **智能目标管理系统 v1.0**
    
    一个集成 AI 能力的目标管理和时间规划工具
    
    主要功能：
    - 多层级目标管理
    - AI 智能目标分解
    - 智能日程生成
    - 效率洞察分析
    - 跨设备数据同步
    """)

# 任务相关功能（补充）
def show_task_modal():
    """显示任务创建模态框"""
    st.subheader("新建任务")
    
    with st.form("task_form"):
        name = st.text_input("任务名称*")
        
        goal_options = ["无关联"] + [g['name'] for g in st.session_state.goals]
        goal_selection = st.selectbox("关联目标", goal_options)
        
        category = st.text_input("任务分类", placeholder="如：会议、学习、运动")
        
        priority = st.selectbox("优先级", ["低", "中", "高"])
        priority_map = {"低": 1, "中": 2, "高": 3}
        
        estimated_time = st.number_input("预计用时（分钟）", min_value=15, step=15, value=60)
        
        scheduled_date = st.date_input("计划日期", value=datetime.now().date())
        
        preparation = st.text_area(
            "📋 准备事项",
            placeholder="需要的信息、文件、工具等"
        )
        
        guidance = st.text_area(
            "💡 工作指导",
            placeholder="步骤提示、注意事项等"
        )
        
        col1, col2 = st.columns(2)
        with col1:
            submitted = st.form_submit_button("保存", use_container_width=True)
        with col2:
            cancelled = st.form_submit_button("取消", use_container_width=True)
        
        if submitted and name:
            goal_id = None
            if goal_selection != "无关联":
                goal = next((g for g in st.session_state.goals if g['name'] == goal_selection), None)
                if goal:
                    goal_id = goal['id']
            
            task_data = {
                'id': datetime.now().timestamp(),
                'name': name,
                'goalId': goal_id,
                'category': category,
                'priority': priority_map[priority],
                'estimatedTime': estimated_time,
                'scheduledDate': scheduled_date.isoformat() if scheduled_date else '',
                'preparation': preparation,
                'guidance': guidance,
                'completed': False,
                'createdAt': datetime.now().isoformat()
            }
            st.session_state.tasks.append(task_data)
            save_data()
            st.session_state.show_task_modal = False
            st.success("任务已添加！")
            st.rerun()
        
        if cancelled:
            st.session_state.show_task_modal = False
            st.rerun()

# 添加任务模态框触发
if 'show_task_modal' not in st.session_state:
    st.session_state.show_task_modal = False

if st.session_state.show_task_modal:
    show_task_modal()

# 运行主应用
if __name__ == "__main__":
    main()