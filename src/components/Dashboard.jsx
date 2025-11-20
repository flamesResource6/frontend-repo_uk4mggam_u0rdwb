import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { AlarmClock, BookOpen, CalendarDays, CheckSquare, MessageCircle, NotebookPen, Play, Siren, StopCircle, Timer, Volume2, Zap } from 'lucide-react'

const WidgetCard = ({ title, children, actions }) => (
  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-slate-100 font-semibold">{title}</h3>
      <div className="flex gap-2">{actions}</div>
    </div>
    {children}
  </div>
)

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('pref:dark') === '1' || true)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('pref:dark', dark ? '1' : '0')
  }, [dark])
  return { dark, setDark }
}

function EmergencyButton() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    let audio
    if (active) {
      audio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_9f4b5ef4a7.mp3?filename=police-siren-2022-10874.mp3')
      audio.loop = true
      audio.volume = 1
      audio.play().catch(() => {})
    }
    return () => { if (audio) { audio.pause(); audio.currentTime = 0 } }
  }, [active])

  return (
    <button onClick={() => setActive(v => !v)} className={`w-full py-3 rounded-lg font-bold text-white transition ${active ? 'bg-red-600 animate-pulse' : 'bg-red-500 hover:bg-red-600'}`}>
      {active ? 'STOP EMERGENCY' : 'EMERGENCY SIREN'}
    </button>
  )
}

function FocusTimer() {
  const [seconds, setSeconds] = useState(25*60)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState('work')

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (seconds <= 0) {
      const next = mode === 'work' ? 5*60 : 25*60
      const nextMode = mode === 'work' ? 'break' : 'work'
      setMode(nextMode)
      setSeconds(next)
      setRunning(false)
      api.createFocusSession({ started_at: new Date().toISOString(), duration_minutes: (mode === 'work' ? 25 : 5), type: mode })
      new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play().catch(()=>{})
    }
  }, [seconds, mode])

  const mm = String(Math.floor(seconds/60)).padStart(2,'0')
  const ss = String(seconds%60).padStart(2,'0')

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-4xl font-mono text-slate-100">{mm}:{ss}</div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(true)} className="px-3 py-2 bg-green-600 text-white rounded">Start</button>
        <button onClick={() => setRunning(false)} className="px-3 py-2 bg-yellow-600 text-white rounded">Pause</button>
        <button onClick={() => { setRunning(false); setSeconds(mode==='work'?25*60:5*60) }} className="px-3 py-2 bg-slate-600 text-white rounded">Reset</button>
      </div>
      <div className="flex gap-2 text-xs">
        <button onClick={() => { setMode('work'); setSeconds(25*60); setRunning(false) }} className={`px-2 py-1 rounded ${mode==='work'?'bg-blue-600 text-white':'bg-slate-700 text-slate-200'}`}>Work 25</button>
        <button onClick={() => { setMode('break'); setSeconds(5*60); setRunning(false) }} className={`px-2 py-1 rounded ${mode==='break'?'bg-blue-600 text-white':'bg-slate-700 text-slate-200'}`}>Break 5</button>
      </div>
    </div>
  )
}

function QuickAddTask({ onAdded }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const add = async () => {
    if (!title) return
    await api.createAssignment({ title, due_date: due ? new Date(due).toISOString() : null, priority: 'medium', subtasks: [] })
    setTitle(''); setDue('')
    onAdded?.()
  }
  return (
    <div className="flex gap-2">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New assignment..." className="flex-1 bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-100" />
      <input type="date" value={due} onChange={e=>setDue(e.target.value)} className="bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-100" />
      <button onClick={add} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
    </div>
  )
}

function Chatbot() {
  const [q, setQ] = useState('What assignments are due?')
  const [a, setA] = useState('')
  const ask = async () => {
    const res = await api.chatbot(q)
    setA(res.answer)
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={q} onChange={e=>setQ(e.target.value)} className="flex-1 bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-100" />
        <button onClick={ask} className="px-3 py-2 bg-indigo-600 text-white rounded">Ask</button>
      </div>
      {a && <p className="text-slate-200 text-sm">{a}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { dark, setDark } = useDarkMode()
  const [assignments, setAssignments] = useState([])
  const [notes, setNotes] = useState([])
  const [courses, setCourses] = useState([])
  const [sessions, setSessions] = useState([])

  const refresh = async () => {
    const [a, n, c, s] = await Promise.all([
      api.getAssignments({ completed: false }),
      api.getNotes(),
      api.getCourses(),
      api.getSchedule(),
    ])
    setAssignments(a)
    setNotes(n)
    setCourses(c)
    setSessions(s)
  }

  useEffect(() => { refresh() }, [])

  const nextClasses = useMemo(() => {
    const today = new Date().getDay() - 1 // convert to 0=Mon
    const todaySessions = sessions.filter(s => s.weekday === today)
    return todaySessions.sort((a,b) => (a.start_time||'').localeCompare(b.start_time||''))
  }, [sessions])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Campus Companion</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setDark(d=>!d)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded">{dark? 'Dark' : 'Light'}</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <WidgetCard title="Emergency" actions={<Volume2 className="w-4 h-4 text-red-400" />}>
            <EmergencyButton />
          </WidgetCard>

          <WidgetCard title="Focus Timer" actions={<Timer className="w-4 h-4 text-blue-400" />}>
            <FocusTimer />
          </WidgetCard>

          <WidgetCard title="Chatbot" actions={<MessageCircle className="w-4 h-4 text-emerald-400" />}>
            <Chatbot />
          </WidgetCard>

          <WidgetCard title="Upcoming Classes" actions={<CalendarDays className="w-4 h-4 text-amber-400" />}>
            <ul className="space-y-2">
              {nextClasses.length === 0 && <li className="text-slate-400 text-sm">No classes added yet.</li>}
              {nextClasses.map(s => (
                <li key={s._id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded p-2">
                  <span>{s.start_time} - {s.end_time}</span>
                  <span className="text-slate-400 text-sm">{s.location || 'TBA'}</span>
                </li>
              ))}
            </ul>
          </WidgetCard>

          <WidgetCard title="Assignments" actions={<CheckSquare className="w-4 h-4 text-pink-400" />}>
            <div className="space-y-3">
              <QuickAddTask onAdded={refresh} />
              <ul className="space-y-2">
                {assignments.length === 0 && <li className="text-slate-400 text-sm">No assignments yet.</li>}
                {assignments.slice(0,5).map(t => (
                  <li key={t._id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded p-2">
                    <span>{t.title}</span>
                    <span className="text-slate-400 text-xs">{t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </WidgetCard>

          <WidgetCard title="Quick Notes" actions={<NotebookPen className="w-4 h-4 text-violet-400" />}>
            <QuickNote onAdded={async ()=> setNotes(await api.getNotes())} />
            <ul className="mt-3 space-y-2">
              {notes.slice(0,5).map(n => (
                <li key={n._id} className="bg-slate-900/60 border border-slate-800 rounded p-2">
                  <p className="text-sm font-medium">{n.title}</p>
                </li>
              ))}
            </ul>
          </WidgetCard>
        </div>
      </div>
    </div>
  )
}

function QuickNote({ onAdded }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const add = async () => {
    if (!title && !content) return
    await api.createNote({ title, content })
    setTitle(''); setContent('')
    onAdded?.()
  }
  return (
    <div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-100 mb-2" />
      <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Write a quick note..." className="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-100" rows={3} />
      <div className="mt-2 flex justify-end">
        <button onClick={add} className="px-3 py-2 bg-violet-600 text-white rounded">Save</button>
      </div>
    </div>
  )
}
