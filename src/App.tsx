import { useState } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Plus,
  Search,
  Bell,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Filter
} from 'lucide-react'

// Mock Initial Data
interface Project {
  id: string
  name: string
  client: string
  cpi: number // Cost Performance Index
  spi: number // Schedule Performance Index
  progress: number
  status: 'Em Andamento' | 'Planejamento' | 'Concluído' | 'Atrasado'
  dueDate: string
  teamCount: number
}

interface Task {
  id: string
  text: string
  completed: boolean
  priority: 'Baixa' | 'Média' | 'Alta'
  project: string
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'team'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  
  // States
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Fluir - Consulting Site Builder',
      client: 'Fluir Consultoria',
      cpi: 1.08,
      spi: 1.02,
      progress: 85,
      status: 'Em Andamento',
      dueDate: '25/06/2026',
      teamCount: 3
    },
    {
      id: '2',
      name: 'Implementação Lean - Fábrica Metalúrgica',
      client: 'Metalúrgica Silva',
      cpi: 0.95,
      spi: 0.88,
      progress: 45,
      status: 'Atrasado',
      dueDate: '10/08/2026',
      teamCount: 5
    },
    {
      id: '3',
      name: 'Mapeamento de Fluxo de Valor (VSM)',
      client: 'Logística RS',
      cpi: 1.00,
      spi: 1.00,
      progress: 100,
      status: 'Concluído',
      dueDate: '15/05/2026',
      teamCount: 2
    },
    {
      id: '4',
      name: 'Normalização de Tempos de Processos',
      client: 'Indústria Têxtil Canoas',
      cpi: 1.12,
      spi: 1.05,
      progress: 15,
      status: 'Planejamento',
      dueDate: '30/09/2026',
      teamCount: 4
    }
  ])

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Revisar escopo e cronograma do projeto Fluir', completed: true, priority: 'Alta', project: 'Fluir' },
    { id: '2', text: 'Realizar dinâmica de VSM no chão de fábrica', completed: false, priority: 'Alta', project: 'Fábrica Metalúrgica' },
    { id: '3', text: 'Ajustar variáveis de cálculo de lead time', completed: false, priority: 'Média', project: 'Normalização de Tempos' },
    { id: '4', text: 'Homologar cronoanálise de processos', completed: true, priority: 'Baixa', project: 'Normalização de Tempos' },
    { id: '5', text: 'Reunião de alinhamento com a diretoria', completed: false, priority: 'Média', project: 'Fluir' }
  ])

  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'Baixa' | 'Média' | 'Alta'>('Média')

  // Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjClient, setNewProjClient] = useState('')
  const [newProjStatus, setNewProjStatus] = useState<'Em Andamento' | 'Planejamento' | 'Concluído' | 'Atrasado'>('Planejamento')

  // Handlers
  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t))
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      priority: newTaskPriority,
      project: 'Geral'
    }
    setTasks([newTask, ...tasks])
    setNewTaskText('')
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjName.trim() || !newProjClient.trim()) return
    const newProj: Project = {
      id: Date.now().toString(),
      name: newProjName,
      client: newProjClient,
      cpi: 1.00,
      spi: 1.00,
      progress: 0,
      status: newProjStatus,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      teamCount: 1
    }
    setProjects([...projects, newProj])
    setNewProjName('')
    setNewProjClient('')
    setIsModalOpen(false)
  }

  // Derived metrics
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.client.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = statusFilter === 'todos' || p.status === statusFilter
    return matchesSearch && matchesFilter
  })

  const averageCPI = parseFloat((projects.reduce((acc, p) => acc + p.cpi, 0) / projects.length).toFixed(2))
  const averageSPI = parseFloat((projects.reduce((acc, p) => acc + p.spi, 0) / projects.length).toFixed(2))
  const completedProjects = projects.filter(p => p.status === 'Concluído').length

  return (
    <div className="flex min-h-screen bg-[#0d0e12] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#12141c] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-none">
              PMP Dashboard
            </h1>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Gestão e Controle
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'projects', label: 'Projetos (EAP)', icon: FolderKanban },
            { id: 'tasks', label: 'Quadro de Tarefas', icon: CheckSquare },
            { id: 'team', label: 'Equipe de Trabalho', icon: Users },
          ].map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-[#0d0e12]/40 text-xs text-slate-500 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Sincronizado
          </div>
          <span>Repositório: GitHub</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-20 border-b border-slate-800 bg-[#12141c]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar projetos, clientes ou tarefas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-indigo-500"></span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/10">
                MS
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-200 leading-tight">Márcio Stefenon</p>
                <p className="text-xs text-slate-500">Gerente de Projetos (GP)</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Active Tab: Visão Geral */}
          {activeTab === 'overview' && (
            <>
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Painel Executivo PMP <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Métricas de valor agregado, status e indicadores de desempenho (EVM).
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" /> Novo Projeto
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* KPI 1 */}
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-600/5 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-indigo-600/10 transition-colors"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Total de Projetos</span>
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{projects.length}</span>
                    <span className="text-xs text-emerald-400 font-medium flex items-center">+1 ativo</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Volume de projetos na carteira</p>
                </div>

                {/* KPI 2 */}
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-600/5 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-emerald-600/10 transition-colors"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">CPI (Índice de Custo)</span>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${averageCPI >= 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{averageCPI}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${averageCPI >= 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {averageCPI >= 1 ? 'No Orçamento' : 'Acima do Custo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Média ponderada do portfólio</p>
                </div>

                {/* KPI 3 */}
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-blue-600/5 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-blue-600/10 transition-colors"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">SPI (Índice de Prazo)</span>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${averageSPI >= 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{averageSPI}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${averageSPI >= 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {averageSPI >= 1 ? 'No Prazo' : 'Em Atraso'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Índice de aderência ao cronograma</p>
                </div>

                {/* KPI 4 */}
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-purple-600/5 rounded-full blur-2xl -mr-4 -mt-4 group-hover:bg-purple-600/10 transition-colors"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Projetos Concluídos</span>
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {Math.round((completedProjects / projects.length) * 100)}%
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{completedProjects} de {projects.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Taxa de entrega com sucesso</p>
                </div>
              </div>

              {/* Main Overview Dashboard Grid */}
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Column 1 & 2: Project status */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white">Status dos Projetos</h3>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <select 
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-lg py-1 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="todos">Todos os Status</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Planejamento">Planejamento</option>
                          <option value="Atrasado">Atrasado</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>
                    </div>

                    {/* Project List */}
                    <div className="space-y-4">
                      {filteredProjects.map(proj => (
                        <div key={proj.id} className="bg-[#181a24] border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                              <h4 className="font-semibold text-slate-200">{proj.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">Cliente: {proj.client}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-center ${
                              proj.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400' :
                              proj.status === 'Em Andamento' ? 'bg-indigo-500/10 text-indigo-400' :
                              proj.status === 'Atrasado' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/30 text-slate-400'
                            }`}>
                              {proj.status}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Progresso do Escopo</span>
                              <span className="font-semibold text-slate-200">{proj.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${proj.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Indicators Row */}
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">CPI (Custo)</p>
                              <p className={`text-sm font-bold mt-0.5 ${proj.cpi >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{proj.cpi}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">SPI (Prazo)</p>
                              <p className={`text-sm font-bold mt-0.5 ${proj.spi >= 1 ? 'text-blue-400' : 'text-yellow-400'}`}>{proj.spi}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Entrega Prevista</p>
                              <p className="text-sm font-semibold text-slate-400 mt-0.5">{proj.dueDate}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {filteredProjects.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          Nenhum projeto encontrado com os filtros selecionados.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 3: Task list & EVM summary */}
                <div className="space-y-6">
                  {/* Task list Card */}
                  <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Minhas Tarefas</h3>
                    
                    {/* Add Task Form */}
                    <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Nova tarefa..."
                        value={newTaskText}
                        onChange={e => setNewTaskText(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <select
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                      </select>
                      <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 rounded-xl p-2.5 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </form>

                    {/* Tasks Container */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {tasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            task.completed 
                              ? 'bg-slate-800/20 border-slate-800/60 opacity-60' 
                              : 'bg-[#181a24] border-slate-800 hover:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTask(task.id)}
                              className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                            />
                            <span className={`text-xs font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {task.text}
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            task.priority === 'Alta' ? 'bg-red-500/10 text-red-400' :
                            task.priority === 'Média' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-700/30 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EVM Reference card */}
                  <div className="bg-gradient-to-br from-indigo-900/40 via-[#12141c] to-[#12141c] border border-indigo-500/20 rounded-2xl p-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-400" /> Referências PMP (EVM)
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      O gerenciamento do Valor Agregado compara o planejado com o realizado:
                    </p>
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-2 text-xs">
                        <div className="h-4 w-4 shrink-0 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">≥</div>
                        <p className="text-slate-300">
                          <strong>CPI / SPI ≥ 1.0:</strong> Desempenho dentro ou melhor do que o planejado.
                        </p>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <div className="h-4 w-4 shrink-0 rounded bg-red-500/10 text-red-400 flex items-center justify-center font-bold">&lt;</div>
                        <p className="text-slate-300">
                          <strong>CPI / SPI &lt; 1.0:</strong> Projeto estourando custos ou atrasado.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Active Tab: Projects */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Projetos & Estrutura Analítica (EAP)</h2>
                  <p className="text-slate-400 text-sm mt-1">Gerencie todos os projetos ativos e seus respectivos cronogramas.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Criar Novo Projeto
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-[#12141c] border border-slate-800 p-6 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white">{proj.name}</h3>
                        <p className="text-xs text-slate-500">Cliente: {proj.client}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        proj.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400' :
                        proj.status === 'Em Andamento' ? 'bg-indigo-500/10 text-indigo-400' :
                        proj.status === 'Atrasado' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/30 text-slate-400'
                      }`}>
                        {proj.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Progresso Geral</span>
                        <span className="font-semibold text-slate-200">{proj.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${proj.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-xl text-center">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">CPI (Desempenho de Custo)</p>
                        <p className={`text-base font-extrabold mt-0.5 ${proj.cpi >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{proj.cpi}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">SPI (Desempenho de Prazo)</p>
                        <p className={`text-base font-extrabold mt-0.5 ${proj.spi >= 1 ? 'text-blue-400' : 'text-yellow-400'}`}>{proj.spi}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-500" /> Fim planejado: {proj.dueDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-500" /> {proj.teamCount} membros
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Tab: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Tarefas & Atividades</h2>
                <p className="text-slate-400 text-sm mt-1">Controle de tarefas operacionais diárias do time de consultoria.</p>
              </div>

              <div className="bg-[#12141c] border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-white text-lg">Quadro de Atividades</h3>
                  
                  {/* Task Form */}
                  <form onSubmit={handleAddTask} className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar tarefa rápida..."
                      value={newTaskText}
                      onChange={e => setNewTaskText(e.target.value)}
                      className="bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-2 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="Baixa">Prioridade Baixa</option>
                      <option value="Média">Prioridade Média</option>
                      <option value="Alta">Prioridade Alta</option>
                    </select>
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      Adicionar
                    </button>
                  </form>
                </div>

                <div className="space-y-3">
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        task.completed 
                          ? 'bg-slate-800/10 border-slate-800/50 opacity-60' 
                          : 'bg-[#181a24] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                          className="h-5 w-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                        />
                        <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Projeto: {task.project}</span>
                        <span className={`text-xs px-2.5 py-1 rounded font-semibold ${
                          task.priority === 'Alta' ? 'bg-red-500/10 text-red-400' :
                          task.priority === 'Média' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-700/30 text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Team */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Equipe do Projeto</h2>
                <p className="text-slate-400 text-sm mt-1">Lista de consultores e especialistas alocados no portfólio de projetos.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: 'Márcio Stefenon', role: 'Gerente do Projeto (GP)', email: 'marcio.stefenon@fluirconsultoria.eng.br', initial: 'MS', projectsCount: 4 },
                  { name: 'Roberto Alencar', role: 'Consultor Lean Manufacturing', email: 'roberto.alencar@fluirconsultoria.eng.br', initial: 'RA', projectsCount: 2 },
                  { name: 'Mariana Duarte', role: 'Analista de Processos & Tempo', email: 'mariana.duarte@fluirconsultoria.eng.br', initial: 'MD', projectsCount: 3 },
                ].map(member => (
                  <div key={member.name} className="bg-[#12141c] border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/20">
                      {member.initial}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{member.name}</h3>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">{member.role}</p>
                      <p className="text-xs text-slate-500 mt-1">{member.email}</p>
                    </div>
                    <div className="w-full pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                      <span>Projetos Alocados:</span>
                      <span className="font-bold text-slate-200">{member.projectsCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#12141c] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Novo Projeto PMP</h3>
            <p className="text-xs text-slate-400 mb-6">Insira os dados iniciais do projeto para integrá-lo ao portfólio.</p>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome do Projeto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consultoria de Mapeamento VSM"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empresa Exemplo Ltda"
                  value={newProjClient}
                  onChange={e => setNewProjClient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Status Inicial</label>
                <select
                  value={newProjStatus}
                  onChange={e => setNewProjStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Planejamento">Planejamento</option>
                  <option value="Em Andamento">Em Andamento</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-xs text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-indigo-600/10 transition-colors"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
