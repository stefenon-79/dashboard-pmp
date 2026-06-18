import { useState, useMemo } from 'react'
import {
  BarChart, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  LayoutDashboard, FolderKanban,
  Search, Layers, Sparkles, Filter, Clock,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Timer
} from 'lucide-react'
import rawData from './data/pmp-data.json'

// --- Types ---
interface PmpRecord {
  anoAtual: string
  anoReal: string
  mesProg: string
  prazoEntrega: string
  dataLiberacao: string
  projeto: string
  cliente: string
  lc: string
  cjEquipamento: string
  conjGeral: string
  equipamento: string
  kits: string
  etapa: string
  progSemana: string
  realSemana: string
  statusAuto: string
  reprogSemana: string
  reprogRealSemana: string
  statusManual: string
  observacao: string
  avanco: string
  statusGeral: string
  realizadoSemana: string
  programado: string
}

const data: PmpRecord[] = rawData as PmpRecord[]

// --- Color palette ---
const STATUS_COLORS: Record<string, string> = {
  'Concluído': '#10b981',
  'Em Produção': '#6366f1',
  'Atrasado': '#ef4444',
  '0': '#475569'
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8', '#7c3aed',
  '#4f46e5', '#4338ca', '#3730a3', '#6d28d9', '#5b21b6',
  '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8'
]

// --- Helpers ---
function normalizeEtapa(etapa: string): string {
  const e = etapa.trim().toLowerCase()
  if (e.includes('corte perfis')) return 'Corte Perfis'
  if (e.includes('corte')) return 'Corte'
  if (e.includes('caldeiraria') || e.includes('calderaria')) return 'Caldeiraria'
  if (e.includes('usinagem estrutura')) return 'Usinagem Estrutura'
  if (e.includes('usinagem acess')) return 'Usinagem Acessórios'
  if (e.includes('usinagem cilindros') || e.includes('usinagem de cilindros') || e.includes('usinagem rolos') || e.includes('cilindros/rolos')) return 'Usinagem Cilindros'
  if (e.includes('pre cdi') || e.includes('pré cdi')) return 'Pré CDI'
  if (e.includes('cdi')) return 'CDI'
  if (e.includes('acabamento')) return 'Acabamento'
  if (e.includes('montagem piping')) return 'Montagem Piping'
  if (e.includes('montagem caixa')) return 'Montagem Cx Entrada'
  if (e.includes('montagem rolos')) return 'Montagem Rolos'
  if (e.includes('montagem acess')) return 'Montagem Acessórios'
  if (e.includes('montagem 1')) return 'Montagem 1'
  if (e.includes('montagem 2')) return 'Montagem 2'
  if (e.includes('montagem')) return 'Montagem'
  if (e.includes('terceiriz') || e.includes('terceiros')) return 'Terceirização'
  if (e.includes('prepara')) return 'Preparação'
  if (e.includes('anodiza')) return 'Anodização'
  if (e.includes('revestimento rolos')) return 'Revestimento Rolos'
  if (e.includes('revestimento caldeiraria')) return 'Revestimento Caldeiraria'
  if (e.includes('balanceamento')) return 'Balanceamento'
  if (e.includes('grav')) return 'Grav. Laser'
  if (e.includes('solda')) return 'Solda Alumínio'
  if (e.includes('expans')) return 'Expansão de Tubos'
  return etapa.trim() || 'Outros'
}

// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leadtime'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [clienteFilter, setClienteFilter] = useState('todos')
  const [etapaFilter, setEtapaFilter] = useState('todos')

  // Lead time filters
  const [ltGroupBy, setLtGroupBy] = useState<'cliente' | 'conjGeral' | 'equipamento'>('cliente')
  const [ltClienteFilter, setLtClienteFilter] = useState('todos')

  // --- Computed data ---
  const uniqueClientes = useMemo(() => {
    const set = new Set(data.map(d => d.cliente).filter(Boolean))
    return Array.from(set).sort()
  }, [])

  const uniqueEtapas = useMemo(() => {
    const set = new Set(data.map(d => normalizeEtapa(d.etapa)).filter(e => e !== 'Outros'))
    return Array.from(set).sort()
  }, [])

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter(d => {
      const matchSearch = searchQuery === '' ||
        d.projeto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.equipamento.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.kits.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = statusFilter === 'todos' || d.statusGeral === statusFilter
      const matchCliente = clienteFilter === 'todos' || d.cliente === clienteFilter
      const matchEtapa = etapaFilter === 'todos' || normalizeEtapa(d.etapa) === etapaFilter
      return matchSearch && matchStatus && matchCliente && matchEtapa
    })
  }, [searchQuery, statusFilter, clienteFilter, etapaFilter])

  // KPIs
  const totalKits = filtered.length
  const concluidos = filtered.filter(d => d.statusGeral === 'Concluído').length
  const emProducao = filtered.filter(d => d.statusGeral === 'Em Produção').length
  const atrasados = filtered.filter(d => d.statusGeral === 'Atrasado').length
  const pctConcluido = totalKits > 0 ? Math.round((concluidos / totalKits) * 100) : 0

  // Chart: Status distribution
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => {
      const s = d.statusGeral || 'Indefinido'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([k]) => k !== '0' && k !== 'Indefinido')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  // Chart: Pareto de Etapas Atrasadas
  const paretoEtapasData = useMemo(() => {
    const atrasadosList = filtered.filter(d => d.statusGeral === 'Atrasado')
    const counts: Record<string, number> = {}
    atrasadosList.forEach(d => {
      const e = normalizeEtapa(d.etapa)
      counts[e] = (counts[e] || 0) + 1
    })
    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    
    const total = sorted.reduce((sum, item) => sum + item.value, 0)
    let acc = 0
    return sorted.map(item => {
      acc += item.value
      return {
        name: item.name,
        'Quantidade': item.value,
        'Pct Acumulado': total > 0 ? Math.round((acc / total) * 100) : 0
      }
    })
  }, [filtered])

  // Chart: Kits por Etapa
  const etapaChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => {
      const e = normalizeEtapa(d.etapa)
      counts[e] = (counts[e] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15)
  }, [filtered])

  // Delayed items table
  const delayedItems = useMemo(() => {
    return filtered
      .filter(d => d.statusGeral === 'Atrasado')
      .slice(0, 20)
  }, [filtered])

  // --- Lead Time Calculation ---
  const leadTimeData = useMemo(() => {
    // Filter by client if selected
    const ltFiltered = ltClienteFilter === 'todos'
      ? data
      : data.filter(d => d.cliente === ltClienteFilter)

    // Group by the selected dimension
    const groups: Record<string, PmpRecord[]> = {}
    ltFiltered.forEach(d => {
      let key = ''
      if (ltGroupBy === 'cliente') key = d.cliente
      else if (ltGroupBy === 'conjGeral') key = d.conjGeral
      else key = d.equipamento
      if (!key || key.trim() === '') return
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    })

    // Calculate lead time for each group
    const results: { name: string; ltProgramado: number; ltRealizado: number; desvio: number; count: number }[] = []

    Object.entries(groups).forEach(([name, records]) => {
      // Get numeric week values, accounting for year
      const programadoWeeks: number[] = []
      const realizadoWeeks: number[] = []

      records.forEach(r => {
        const anoAtual = parseInt(r.anoAtual) || 0
        const anoReal = parseInt(r.anoReal) || 0
        const prog = parseInt(r.programado) || 0
        const real = parseInt(r.realizadoSemana) || 0

        if (prog > 0 && anoAtual > 0) {
          programadoWeeks.push(anoAtual * 52 + prog)
        }
        if (real > 0 && anoReal > 0) {
          realizadoWeeks.push(anoReal * 52 + real)
        }
      })

      if (programadoWeeks.length >= 2 && realizadoWeeks.length >= 2) {
        const ltProg = Math.max(...programadoWeeks) - Math.min(...programadoWeeks)
        const ltReal = Math.max(...realizadoWeeks) - Math.min(...realizadoWeeks)

        if (ltProg > 0 || ltReal > 0) {
          results.push({
            name: name.length > 30 ? name.substring(0, 27) + '...' : name,
            ltProgramado: ltProg,
            ltRealizado: ltReal,
            desvio: ltReal - ltProg,
            count: records.length
          })
        }
      }
    })

    return results
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [ltGroupBy, ltClienteFilter])

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1c28] border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
              <span>{p.name}:</span>
              <span className="font-bold">
                {p.name === 'Pct Acumulado' ? `${p.value}%` : p.value}
              </span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // --- Sidebar tabs ---
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'leadtime', label: 'Lead Time', icon: Timer },
  ]

  return (
    <div className="flex min-h-screen bg-[#0d0e12] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#12141c] flex flex-col shrink-0">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-none">
              PMP Dashboard
            </h1>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Hergen</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {tabs.map(item => {
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
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p className="flex items-center gap-2 text-slate-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {data.length.toLocaleString()} registros carregados
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-[#12141c]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar projeto, cliente, kit..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar Dados
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto space-y-6">

          {/* ================== OVERVIEW TAB ================== */}
          {activeTab === 'overview' && (
            <>
              {/* Title */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Painel Executivo PMP <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">Plano Mestre de Produção — visão consolidada do status de produção.</p>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Filter className="h-4 w-4" /> Filtros:
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
                  <option value="todos">Status: Todos</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Em Produção">Em Produção</option>
                  <option value="Atrasado">Atrasado</option>
                </select>
                <select value={clienteFilter} onChange={e => setClienteFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
                  <option value="todos">Cliente: Todos</option>
                  {uniqueClientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={etapaFilter} onChange={e => setEtapaFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
                  <option value="todos">Etapa: Todas</option>
                  {uniqueEtapas.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {(statusFilter !== 'todos' || clienteFilter !== 'todos' || etapaFilter !== 'todos' || searchQuery) && (
                  <button onClick={() => { setStatusFilter('todos'); setClienteFilter('todos'); setEtapaFilter('todos'); setSearchQuery('') }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline">Limpar filtros</button>
                )}
              </div>

              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Total de Kits" value={totalKits.toLocaleString()} icon={<FolderKanban className="h-5 w-5" />} color="indigo" sub="Registros filtrados" />
                <KpiCard label="Concluídos" value={`${pctConcluido}%`} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" sub={`${concluidos.toLocaleString()} kits finalizados`} />
                <KpiCard label="Em Produção" value={emProducao.toLocaleString()} icon={<Loader2 className="h-5 w-5" />} color="blue" sub="Kits ativos na fábrica" />
                <KpiCard label="Atrasados" value={atrasados.toLocaleString()} icon={<AlertTriangle className="h-5 w-5" />} color="red" sub={`${totalKits > 0 ? Math.round((atrasados / totalKits) * 100) : 0}% do total filtrado`} />
              </div>

              {/* Charts row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Status chart */}
                <ChartCard title="Distribuição por Status">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusChartData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Kits" radius={[0, 6, 6, 0]}>
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Pareto Etapas Atrasadas */}
                <ChartCard title="Pareto de Etapas mais Atrasadas">
                  {paretoEtapasData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={paretoEtapasData} margin={{ left: -10, right: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Qtd Itens', angle: -90, position: 'insideLeft', fill: '#94a3b8', style: { textAnchor: 'middle' }, offset: 0 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" domain={[0, 100]} unit="%" tick={{ fill: '#ef4444', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar yAxisId="left" dataKey="Quantidade" fill="#6366f1" name="Qtd Atrasos" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="Pct Acumulado" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-xs text-slate-500">
                      Nenhum item atrasado com os filtros aplicados.
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Etapa chart - full width */}
              <ChartCard title="Kits por Etapa Produtiva">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={etapaChartData} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Kits" radius={[6, 6, 0, 0]}>
                      {etapaChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Delayed items table */}
              {delayedItems.length > 0 && (
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-400" /> Itens Atrasados ({atrasados})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3 text-left font-semibold">Projeto</th>
                          <th className="py-3 px-3 text-left font-semibold">Cliente</th>
                          <th className="py-3 px-3 text-left font-semibold">Equipamento</th>
                          <th className="py-3 px-3 text-left font-semibold">Kit</th>
                          <th className="py-3 px-3 text-left font-semibold">Etapa</th>
                          <th className="py-3 px-3 text-center font-semibold">Sem. Prog.</th>
                          <th className="py-3 px-3 text-center font-semibold">Sem. Real</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delayedItems.map((item, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-slate-200">{item.projeto}</td>
                            <td className="py-2.5 px-3 text-slate-300">{item.cliente}</td>
                            <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">{item.equipamento}</td>
                            <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate">{item.kits}</td>
                            <td className="py-2.5 px-3"><span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{normalizeEtapa(item.etapa)}</span></td>
                            <td className="py-2.5 px-3 text-center text-blue-400 font-semibold">{item.programado}</td>
                            <td className="py-2.5 px-3 text-center text-red-400 font-semibold">{item.realizadoSemana || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================== LEAD TIME TAB ================== */}
          {activeTab === 'leadtime' && (
            <>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" /> Lead Time — Programado vs Realizado
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Comparação do lead time planejado contra o realizado (em semanas). 
                  Cálculo: (semana da última etapa) − (semana da primeira etapa) por agrupamento.
                </p>
              </div>

              {/* Lead time controls */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Filter className="h-4 w-4" /> Controles:
                </div>
                <select value={ltGroupBy} onChange={e => setLtGroupBy(e.target.value as any)} className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
                  <option value="cliente">Agrupar por: Cliente</option>
                  <option value="conjGeral">Agrupar por: Conjunto Geral</option>
                  <option value="equipamento">Agrupar por: Equipamento</option>
                </select>
                <select value={ltClienteFilter} onChange={e => setLtClienteFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500">
                  <option value="todos">Cliente: Todos</option>
                  {uniqueClientes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Lead Time Chart */}
              <ChartCard title={`Lead Time por ${ltGroupBy === 'cliente' ? 'Cliente' : ltGroupBy === 'conjGeral' ? 'Conjunto Geral' : 'Equipamento'} (semanas)`}>
                {leadTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, leadTimeData.length * 40)}>
                    <BarChart data={leadTimeData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Semanas', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={180} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      <Bar dataKey="ltProgramado" name="LT Programado" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="ltRealizado" name="LT Realizado" radius={[0, 4, 4, 0]} barSize={14}>
                        {leadTimeData.map((entry, i) => (
                          <Cell key={i} fill={entry.desvio > 0 ? '#ef4444' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-sm">
                    Sem dados suficientes para calcular o lead time com os filtros atuais.
                  </div>
                )}
              </ChartCard>

              {/* Lead Time Table */}
              {leadTimeData.length > 0 && (
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">Detalhamento do Lead Time</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3 text-left font-semibold">
                            {ltGroupBy === 'cliente' ? 'Cliente' : ltGroupBy === 'conjGeral' ? 'Conjunto Geral' : 'Equipamento'}
                          </th>
                          <th className="py-3 px-3 text-center font-semibold">LT Programado (sem)</th>
                          <th className="py-3 px-3 text-center font-semibold">LT Realizado (sem)</th>
                          <th className="py-3 px-3 text-center font-semibold">Desvio (sem)</th>
                          <th className="py-3 px-3 text-center font-semibold">Kits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadTimeData.map((item, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-slate-200">{item.name}</td>
                            <td className="py-2.5 px-3 text-center text-blue-400 font-semibold">{item.ltProgramado}</td>
                            <td className="py-2.5 px-3 text-center font-semibold" style={{ color: item.desvio > 0 ? '#ef4444' : '#10b981' }}>
                              {item.ltRealizado}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                item.desvio > 0 ? 'bg-red-500/10 text-red-400' :
                                item.desvio < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-400'
                              }`}>
                                {item.desvio > 0 ? '+' : ''}{item.desvio}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-400">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// --- Reusable components ---
function KpiCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub: string }) {
  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'bg-indigo-600/5' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'bg-emerald-600/5' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'bg-blue-600/5' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'bg-red-600/5' },
  }
  const c = colorMap[color] || colorMap.indigo
  return (
    <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 h-24 w-24 ${c.glow} rounded-full blur-2xl -mr-4 -mt-4 group-hover:opacity-150 transition-opacity`}></div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <div className={`h-9 w-9 rounded-xl ${c.bg} ${c.text} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-extrabold text-white">{value}</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
      <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
