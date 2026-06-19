import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList, PieChart, Pie,
  LineChart, Line, ReferenceLine
} from 'recharts'
import {
  LayoutDashboard, FolderKanban,
  Search, Layers, Sparkles, Filter, Clock,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Timer,
  Calendar, ChevronDown, ChevronRight
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leadtime' | 'gantt' | 'compliance' | 'occupancy'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

  // Status to handle sheet update process
  const [updateStatus, setUpdateStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })

  const handleUpdateData = async () => {
    setUpdateStatus({ type: 'loading', message: 'Lendo planilha Excel... (pode levar até 1 minuto)' })
    try {
      const res = await fetch('/api/update')
      const result = await res.json()
      if (result.success) {
        setUpdateStatus({ type: 'success', message: 'Dados atualizados com sucesso! Atualizando tela...' })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setUpdateStatus({ type: 'error', message: `Erro: ${result.error || 'Falha desconhecida'}` })
      }
    } catch (err: any) {
      setUpdateStatus({
        type: 'error',
        message: `Falha na rede. O botão de atualizar só funciona rodando localmente.`
      })
    }
  }
  const [statusFilter, setStatusFilter] = useState('todos')
  const [clienteFilter, setClienteFilter] = useState('todos')
  const [etapaFilter, setEtapaFilter] = useState('todos')

  // Lead time drilldown states
  const [selectedLtClient, setSelectedLtClient] = useState<string | null>(null)
  const [selectedLtEquipment, setSelectedLtEquipment] = useState<string | null>(null)
  const [ltClientSearch, setLtClientSearch] = useState('')

  const handleSelectClient = (clientName: string) => {
    setSelectedLtClient(clientName)
    setSelectedLtEquipment(null) // Reset equipment selection when client changes
  }

  // Gantt states
  const [ganttClienteFilter, setGanttClienteFilter] = useState<string>('')
  const [expandedEquipments, setExpandedEquipments] = useState<Record<string, boolean>>({})
  const [ganttStartWeek, setGanttStartWeek] = useState<number | null>(null)
  const [ganttEndWeek, setGanttEndWeek] = useState<number | null>(null)
  const [ganttStatusFilter, setGanttStatusFilter] = useState<string>('todos')

  // Reset and set default start/end weeks when client changes
  useEffect(() => {
    if (!ganttClienteFilter) return
    const clientRecords = data.filter(d => d.cliente === ganttClienteFilter)
    if (clientRecords.length === 0) {
      setGanttStartWeek(null)
      setGanttEndWeek(null)
      return
    }

    const allAbsWeeks: number[] = []
    clientRecords.forEach(r => {
      const anoAtual = parseInt(r.anoAtual) || 0
      const anoReal = parseInt(r.anoReal) || 0
      const prog = parseInt(r.programado) || 0
      const real = parseInt(r.realizadoSemana) || 0

      if (prog > 0 && anoAtual > 0) allAbsWeeks.push(anoAtual * 52 + prog)
      if (real > 0 && anoReal > 0) allAbsWeeks.push(anoReal * 52 + real)
    })

    if (allAbsWeeks.length > 0) {
      const minWeek = Math.min(...allAbsWeeks)
      const maxWeek = Math.max(...allAbsWeeks)
      setGanttStartWeek(minWeek)
      setGanttEndWeek(maxWeek)
    } else {
      setGanttStartWeek(null)
      setGanttEndWeek(null)
    }
  }, [ganttClienteFilter])



  const toggleExpand = (key: string) => {
    setExpandedEquipments(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }))
  }

  // Compliance (Atendimento ao Plano) states
  const [complianceStartWeek, setComplianceStartWeek] = useState<number | null>(null)
  const [complianceEndWeek, setComplianceEndWeek] = useState<number | null>(null)
  const [complianceMeta, setComplianceMeta] = useState<number>(85)
  const [complianceSelectedEtapas, setComplianceSelectedEtapas] = useState<string[]>([])
  const [complianceClienteFilter, setComplianceClienteFilter] = useState<string>('todos')
  const [etapaDropdownOpen, setEtapaDropdownOpen] = useState(false)

  // Occupancy (Ocupação) states
  const [occupancySelectedEtapas, setOccupancySelectedEtapas] = useState<string[]>([])
  const [occupancyClienteFilter, setOccupancyClienteFilter] = useState<string>('todos')
  const [occupancyDropdownOpen, setOccupancyDropdownOpen] = useState(false)

  // Local dynamic table states
  const [tblProj, setTblProj] = useState('todos')
  const [tblCli, setTblCli] = useState('todos')
  const [tblEquip, setTblEquip] = useState('todos')
  const [tblKit, setTblKit] = useState('todos')
  const [tblEtap, setTblEtap] = useState('todos')
  const [tblPage, setTblPage] = useState(1)

  // Reset table filters when statusFilter changes
  useEffect(() => {
    setTblProj('todos')
    setTblCli('todos')
    setTblEquip('todos')
    setTblKit('todos')
    setTblEtap('todos')
    setTblPage(1)
  }, [statusFilter])

  const ITEMS_PER_PAGE = 15

  // --- Computed data ---
  const uniqueClientes = useMemo(() => {
    const set = new Set(data.map(d => d.cliente).filter(Boolean))
    return Array.from(set).sort()
  }, [])

  // Set default client for Gantt once uniqueClientes is calculated
  useEffect(() => {
    if (uniqueClientes.length > 0 && !ganttClienteFilter) {
      setGanttClienteFilter(uniqueClientes[0])
    }
  }, [uniqueClientes, ganttClienteFilter])

  const uniqueEtapas = useMemo(() => {
    const set = new Set(data.map(d => normalizeEtapa(d.etapa)).filter(e => e !== 'Outros'))
    return Array.from(set).sort()
  }, [])

  // Base filtered data (Search, Cliente, and Etapa - independent of statusFilter, for global stats & donut)
  const baseFiltered = useMemo(() => {
    return data.filter(d => {
      const matchSearch = searchQuery === '' ||
        d.projeto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.equipamento.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.kits.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCliente = clienteFilter === 'todos' || d.cliente === clienteFilter
      const matchEtapa = etapaFilter === 'todos' || normalizeEtapa(d.etapa) === etapaFilter
      return matchSearch && matchCliente && matchEtapa
    })
  }, [searchQuery, clienteFilter, etapaFilter])

  // Filtered data (applied statusFilter, for the table)
  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return baseFiltered
    return baseFiltered.filter(d => d.statusGeral === statusFilter)
  }, [baseFiltered, statusFilter])

  // KPIs (computed from baseFiltered so values don't collapse to 100%/0% on click)
  const totalKits = baseFiltered.length
  const concluidos = baseFiltered.filter(d => d.statusGeral === 'Concluído').length
  const emProducao = baseFiltered.filter(d => d.statusGeral === 'Em Produção').length
  const atrasados = baseFiltered.filter(d => d.statusGeral === 'Atrasado').length
  const pctConcluido = totalKits > 0 ? Math.round((concluidos / totalKits) * 100) : 0
  const pctEmProducao = totalKits > 0 ? Math.round((emProducao / totalKits) * 100) : 0
  const pctAtrasados = totalKits > 0 ? Math.round((atrasados / totalKits) * 100) : 0

  // Chart: Status distribution (excluding Concluído to show only active pipeline)
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    baseFiltered.forEach(d => {
      const s = d.statusGeral || 'Indefinido'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([k]) => k !== '0' && k !== 'Indefinido' && k !== 'Concluído')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [baseFiltered])

  // Chart: Pareto de Etapas (Atrasados or Em Produção or Concluído)
  const paretoEtapasData = useMemo(() => {
    const activeStatus = statusFilter === 'todos' ? 'Atrasado' : statusFilter
    const listToCount = baseFiltered.filter(d => d.statusGeral === activeStatus)
    
    const counts: Record<string, number> = {}
    listToCount.forEach(d => {
      const e = normalizeEtapa(d.etapa)
      if (e && e !== 'Outros') {
        counts[e] = (counts[e] || 0) + 1
      }
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
    }).slice(0, 10)
  }, [baseFiltered, statusFilter])

  const paretoTitle = useMemo(() => {
    const activeStatus = statusFilter === 'todos' ? 'Atrasado' : statusFilter
    if (activeStatus === 'Atrasado') return "Pareto de Etapas mais Atrasadas"
    if (activeStatus === 'Em Produção') return "Pareto de Etapas em Produção"
    if (activeStatus === 'Concluído') return "Pareto de Etapas Concluídas"
    return "Pareto de Etapas"
  }, [statusFilter])

  const paretoColor = useMemo(() => {
    const activeStatus = statusFilter === 'todos' ? 'Atrasado' : statusFilter
    return STATUS_COLORS[activeStatus] || '#6366f1'
  }, [statusFilter])

  // Dynamic table filtered list (takes filtered, which respects statusFilter, and applies local column filters)
  // If stage is CDI or Pré CDI, it implements tracking logic for all active stages of those delayed kits
  const filteredTableItems = useMemo(() => {
    if (tblEtap === 'CDI' || tblEtap === 'Pré CDI') {
      const targetStage = tblEtap
      
      // Group all active records (Atrasado or Em Produção) by kit key
      const activeRecordsByKit = new Map<string, PmpRecord[]>()
      data.forEach(d => {
        if (d.statusGeral === 'Atrasado' || d.statusGeral === 'Em Produção') {
          const key = `${d.projeto}|||${d.kits}`
          if (!activeRecordsByKit.has(key)) {
            activeRecordsByKit.set(key, [])
          }
          activeRecordsByKit.get(key)!.push(d)
        }
      })
      
      // Identify kits that have an 'Atrasado' record in the target stage (CDI or Pré CDI)
      const targetKits = new Set<string>()
      activeRecordsByKit.forEach((records, key) => {
        const hasDelayedTarget = records.some(r => r.statusGeral === 'Atrasado' && normalizeEtapa(r.etapa) === targetStage)
        if (hasDelayedTarget) {
          targetKits.add(key)
        }
      })
      
      // Build the list of records based on the user's rule:
      // - If the kit only has 1 active stage: keep it (it is the CDI / Pré CDI row itself)
      // - If the kit repeats: keep only the records in OTHER stages (excluding CDI / Pré CDI)
      const trackingList: PmpRecord[] = []
      targetKits.forEach(key => {
        const records = activeRecordsByKit.get(key) || []
        if (records.length === 1) {
          trackingList.push(records[0])
        } else if (records.length > 1) {
          records.forEach(r => {
            if (normalizeEtapa(r.etapa) !== targetStage) {
              trackingList.push(r)
            }
          })
        }
      })
      
      // Apply table filters on the tracking list
      return trackingList.filter(d => {
        const matchProj = tblProj === 'todos' || d.projeto === tblProj
        const matchCli = tblCli === 'todos' || d.cliente === tblCli
        const matchEquip = tblEquip === 'todos' || d.equipamento === tblEquip
        const matchKit = tblKit === 'todos' || d.kits === tblKit
        return matchProj && matchCli && matchEquip && matchKit
      })
    }

    // Normal filtering for other stages
    return filtered.filter(d => {
      const matchProj = tblProj === 'todos' || d.projeto === tblProj
      const matchCli = tblCli === 'todos' || d.cliente === tblCli
      const matchEquip = tblEquip === 'todos' || d.equipamento === tblEquip
      const matchKit = tblKit === 'todos' || d.kits === tblKit
      const matchEtap = tblEtap === 'todos' || normalizeEtapa(d.etapa) === tblEtap
      return matchProj && matchCli && matchEquip && matchKit && matchEtap
    })
  }, [filtered, data, tblProj, tblCli, tblEquip, tblKit, tblEtap])

  const totalTablePages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTableItems.length / ITEMS_PER_PAGE))
  }, [filteredTableItems])

  const paginatedTable = useMemo(() => {
    return filteredTableItems.slice((tblPage - 1) * ITEMS_PER_PAGE, tblPage * ITEMS_PER_PAGE)
  }, [filteredTableItems, tblPage])

  // Unique options for the dynamic table column dropdowns
  const uniqueTableProj = useMemo(() => {
    const list = filtered.map(d => d.projeto).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [filtered])

  const uniqueTableCli = useMemo(() => {
    const list = filtered.map(d => d.cliente).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [filtered])

  const uniqueTableEquip = useMemo(() => {
    const list = filtered.map(d => d.equipamento).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [filtered])

  const uniqueTableKits = useMemo(() => {
    const list = filtered.map(d => d.kits).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [filtered])

  const uniqueTableEtapas = useMemo(() => {
    const list = filtered.map(d => normalizeEtapa(d.etapa)).filter(Boolean)
    return Array.from(new Set(list)).sort()
  }, [filtered])

  const tableTitle = useMemo(() => {
    if (tblEtap === 'CDI' || tblEtap === 'Pré CDI') {
      return `Rastreamento de Kits — Atrasos em ${tblEtap} (${filteredTableItems.length})`
    }
    if (statusFilter === 'todos') return `Todos os Itens (${filteredTableItems.length})`
    if (statusFilter === 'Atrasado') return `Itens Atrasados (${filteredTableItems.length})`
    if (statusFilter === 'Em Produção') return `Itens Em Produção (${filteredTableItems.length})`
    if (statusFilter === 'Concluído') return `Itens Concluídos (${filteredTableItems.length})`
    return `Itens (${filteredTableItems.length})`
  }, [statusFilter, tblEtap, filteredTableItems])

  const tableIcon = useMemo(() => {
    if (statusFilter === 'Atrasado') return <AlertTriangle className="h-5 w-5 text-red-400" />
    if (statusFilter === 'Em Produção') return <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
    if (statusFilter === 'Concluído') return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    return <FolderKanban className="h-5 w-5 text-indigo-400" />
  }, [statusFilter])

  // --- Lead Time Calculations ---
  
  // 1. Group records by equipment and identify those 100% completed
  const completedEquipments = useMemo(() => {
    const groups: Record<string, { client: string; projeto: string; name: string; records: PmpRecord[] }> = {}
    
    data.forEach(r => {
      const key = `${r.projeto}|||${r.equipamento}`
      if (!groups[key]) {
        groups[key] = {
          client: r.cliente || 'Sem Cliente',
          projeto: r.projeto,
          name: r.equipamento || 'Sem Nome',
          records: []
        }
      }
      groups[key].records.push(r)
    })

    const results: Record<string, {
      key: string;
      client: string;
      projeto: string;
      name: string;
      ltProgramado: number;
      ltRealizado: number;
      desvio: number;
      records: PmpRecord[];
    }> = {}

    Object.entries(groups).forEach(([key, info]) => {
      const total = info.records.length
      const completed = info.records.filter(r => r.statusGeral === 'Concluído').length

      // Equipment is 100% completed if all its records/stages are completed
      if (total > 0 && total === completed) {
        const progWeeks: number[] = []
        const realWeeks: number[] = []

        info.records.forEach(r => {
          const anoAtual = parseInt(r.anoAtual) || 0
          const anoReal = parseInt(r.anoReal) || 0
          const prog = parseInt(r.programado) || 0
          const real = parseInt(r.realizadoSemana) || 0

          if (prog > 0 && anoAtual > 0) {
            progWeeks.push(anoAtual * 52 + prog)
          }
          if (real > 0 && anoReal > 0) {
            realWeeks.push(anoReal * 52 + real)
          }
        })

        if (progWeeks.length > 0 && realWeeks.length > 0) {
          const ltProg = Math.max(1, Math.max(...progWeeks) - Math.min(...progWeeks))
          const ltReal = Math.max(1, Math.max(...realWeeks) - Math.min(...realWeeks))
          results[key] = {
            key,
            client: info.client,
            projeto: info.projeto,
            name: info.name,
            ltProgramado: ltProg,
            ltRealizado: ltReal,
            desvio: ltReal - ltProg,
            records: info.records
          }
        }
      }
    })

    return results
  }, [])

  // 2. Aggregate average lead times by client for their completed equipments
  const ltClientsData = useMemo(() => {
    const clientMap: Record<string, { name: string; totalLtProg: number; totalLtReal: number; count: number }> = {}

    Object.values(completedEquipments).forEach(eq => {
      const cli = eq.client
      if (!clientMap[cli]) {
        clientMap[cli] = {
          name: cli,
          totalLtProg: 0,
          totalLtReal: 0,
          count: 0
        }
      }
      clientMap[cli].totalLtProg += eq.ltProgramado
      clientMap[cli].totalLtReal += eq.ltRealizado
      clientMap[cli].count++
    })

    const results = Object.values(clientMap).map(c => {
      const avgProg = c.count > 0 ? parseFloat((c.totalLtProg / c.count).toFixed(1)) : 0
      const avgReal = c.count > 0 ? parseFloat((c.totalLtReal / c.count).toFixed(1)) : 0
      return {
        name: c.name,
        completedCount: c.count,
        ltProgramado: avgProg,
        ltRealizado: avgReal,
        desvio: parseFloat((avgReal - avgProg).toFixed(1))
      }
    })

    // Sort by number of completed equipments desc, then by client name
    return results.sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name))
  }, [completedEquipments])

  // Filter clients list based on search term
  const filteredLtClients = useMemo(() => {
    if (!ltClientSearch) return ltClientsData
    const query = ltClientSearch.toLowerCase()
    return ltClientsData.filter(c => c.name.toLowerCase().includes(query))
  }, [ltClientsData, ltClientSearch])

  // 3. Get completed equipments for the selected client
  const selectedClientEquipmentsLtData = useMemo(() => {
    if (!selectedLtClient) return []
    return Object.values(completedEquipments)
      .filter(eq => eq.client === selectedLtClient)
      .map(eq => ({
        key: eq.key,
        name: eq.name,
        projeto: eq.projeto,
        ltProgramado: eq.ltProgramado,
        ltRealizado: eq.ltRealizado,
        desvio: eq.desvio,
        count: eq.records.length
      }))
      .sort((a, b) => b.ltRealizado - a.ltRealizado)
  }, [completedEquipments, selectedLtClient])

  // 4. Calculate stage-level lead times for the selected equipment
  const selectedEquipmentStagesLtData = useMemo(() => {
    if (!selectedLtEquipment || !completedEquipments[selectedLtEquipment]) return []
    
    const eq = completedEquipments[selectedLtEquipment]
    const stageGroups: Record<string, PmpRecord[]> = {}

    eq.records.forEach(r => {
      const stage = normalizeEtapa(r.etapa)
      if (!stageGroups[stage]) {
        stageGroups[stage] = []
      }
      stageGroups[stage].push(r)
    })

    const results = Object.entries(stageGroups).map(([stageName, records]) => {
      const progWeeks: number[] = []
      const realWeeks: number[] = []

      records.forEach(r => {
        const anoAtual = parseInt(r.anoAtual) || 0
        const anoReal = parseInt(r.anoReal) || 0
        const prog = parseInt(r.programado) || 0
        const real = parseInt(r.realizadoSemana) || 0

        if (prog > 0 && anoAtual > 0) {
          progWeeks.push(anoAtual * 52 + prog)
        }
        if (real > 0 && anoReal > 0) {
          realWeeks.push(anoReal * 52 + real)
        }
      })

      const ltProg = progWeeks.length > 0 ? Math.max(1, Math.max(...progWeeks) - Math.min(...progWeeks)) : 0
      const ltReal = realWeeks.length > 0 ? Math.max(1, Math.max(...realWeeks) - Math.min(...realWeeks)) : 0
      const minProg = progWeeks.length > 0 ? Math.min(...progWeeks) : Infinity

      return {
        name: stageName,
        ltProgramado: ltProg,
        ltRealizado: ltReal,
        desvio: ltReal - ltProg,
        minProg
      }
    })

    // Sort chronologically by the minimum programmed week
    return results.sort((a, b) => a.minProg - b.minProg)
  }, [completedEquipments, selectedLtEquipment])

  // --- Gantt Data Processing ---
  const ganttData = useMemo(() => {
    if (!ganttClienteFilter) return { weekList: [], fullWeekList: [], equipments: [], minWeek: 0, maxWeek: 0 }

    const clientRecords = data.filter(d => d.cliente === ganttClienteFilter)
    if (clientRecords.length === 0) return { weekList: [], fullWeekList: [], equipments: [], minWeek: 0, maxWeek: 0 }

    // 1. Gather all absolute weeks to define axis limits
    const allAbsWeeks: number[] = []
    clientRecords.forEach(r => {
      const anoAtual = parseInt(r.anoAtual) || 0
      const anoReal = parseInt(r.anoReal) || 0
      const prog = parseInt(r.programado) || 0
      const real = parseInt(r.realizadoSemana) || 0

      if (prog > 0 && anoAtual > 0) allAbsWeeks.push(anoAtual * 52 + prog)
      if (real > 0 && anoReal > 0) allAbsWeeks.push(anoReal * 52 + real)
    })

    if (allAbsWeeks.length === 0) return { weekList: [], fullWeekList: [], equipments: [], minWeek: 0, maxWeek: 0 }

    const minWeek = Math.min(...allAbsWeeks)
    const maxWeek = Math.max(...allAbsWeeks)
    
    // Generate full list of weeks for dropdowns
    const fullRange = Math.min(156, maxWeek - minWeek + 1)
    const fullWeekList: { abs: number; number: number; year: number }[] = []
    for (let i = 0; i < fullRange; i++) {
      const abs = minWeek + i
      const year = Math.floor(abs / 52)
      let num = abs % 52
      if (num === 0) num = 52
      fullWeekList.push({ abs, number: num, year })
    }

    // Determine cropped range
    const startAbs = ganttStartWeek !== null ? ganttStartWeek : minWeek
    const endAbs = ganttEndWeek !== null ? ganttEndWeek : maxWeek

    const croppedRange = Math.max(1, endAbs - startAbs + 1)
    const weekList: { abs: number; number: number; year: number }[] = []
    for (let i = 0; i < croppedRange; i++) {
      const abs = startAbs + i
      const year = Math.floor(abs / 52)
      let num = abs % 52
      if (num === 0) num = 52
      weekList.push({ abs, number: num, year })
    }

    // 2. Group by equipment: projeto|||equipamento
    const equipGroups: Record<string, { client: string; projeto: string; name: string; records: PmpRecord[] }> = {}
    clientRecords.forEach(r => {
      const key = `${r.projeto}|||${r.equipamento}`
      if (!equipGroups[key]) {
        equipGroups[key] = {
          client: r.cliente,
          projeto: r.projeto,
          name: r.equipamento || 'Sem Nome',
          records: []
        }
      }
      equipGroups[key].records.push(r)
    })

    const equipments = Object.entries(equipGroups).map(([key, info]) => {
      const totalRecords = info.records.length
      const completedRecords = info.records.filter(r => r.statusGeral === 'Concluído').length
      const completionPct = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0
      
      const hasDelayed = info.records.some(r => r.statusGeral === 'Atrasado')
      const hasInProduction = info.records.some(r => r.statusGeral === 'Em Produção')
      
      let overallStatus = 'Em Produção'
      if (completionPct === 100) overallStatus = 'Concluído'
      else if (hasDelayed) overallStatus = 'Atrasado'
      else if (hasInProduction) overallStatus = 'Em Produção'

      // Group records of this equipment by normalized stage
      const stageGroups: Record<string, PmpRecord[]> = {}
      info.records.forEach(r => {
        const s = normalizeEtapa(r.etapa)
        if (!stageGroups[s]) {
          stageGroups[s] = []
        }
        stageGroups[s].push(r)
      })

      let stages = Object.entries(stageGroups).map(([stageName, records]) => {
        const progWeeks: number[] = []
        const realWeeks: number[] = []

        records.forEach(r => {
          const anoAtual = parseInt(r.anoAtual) || 0
          const anoReal = parseInt(r.anoReal) || 0
          const prog = parseInt(r.programado) || 0
          const real = parseInt(r.realizadoSemana) || 0

          if (prog > 0 && anoAtual > 0) progWeeks.push(anoAtual * 52 + prog)
          if (real > 0 && anoReal > 0) realWeeks.push(anoReal * 52 + real)
        })

        const minProg = progWeeks.length > 0 ? Math.min(...progWeeks) : null
        const maxProg = progWeeks.length > 0 ? Math.max(...progWeeks) : null
        const minReal = realWeeks.length > 0 ? Math.min(...realWeeks) : null
        const maxReal = realWeeks.length > 0 ? Math.max(...realWeeks) : null

        const stageTotal = records.length
        const stageCompleted = records.filter(r => r.statusGeral === 'Concluído').length
        const stagePct = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0
        const stageHasDelayed = records.some(r => r.statusGeral === 'Atrasado')

        let stageStatus = 'Em Produção'
        if (stagePct === 100) stageStatus = 'Concluído'
        else if (stageHasDelayed) stageStatus = 'Atrasado'

        return {
          name: stageName,
          minProg,
          maxProg,
          minReal,
          maxReal,
          status: stageStatus,
          recordsCount: stageTotal
        }
      })

      // Apply Gantt Status Filter on stages
      if (ganttStatusFilter !== 'todos') {
        stages = stages.filter(s => s.status === ganttStatusFilter)
      }

      // Sort stages chronologically by programmed start week
      stages.sort((a, b) => {
        const startA = a.minProg !== null ? a.minProg : Infinity
        const startB = b.minProg !== null ? b.minProg : Infinity
        return startA - startB
      })

      return {
        key,
        projeto: info.projeto,
        name: info.name,
        completionPct,
        status: overallStatus,
        stages
      }
    }).filter(eq => eq.stages.length > 0) // Hide equipments with no matching stages

    // Sort equipments by project ID, then name
    equipments.sort((a, b) => a.projeto.localeCompare(b.projeto) || a.name.localeCompare(b.name))

    return {
      weekList,
      fullWeekList,
      equipments,
      minWeek: startAbs, // Use startAbs for left positioning offset!
      maxWeek: endAbs
    }
  }, [ganttClienteFilter, ganttStartWeek, ganttEndWeek, ganttStatusFilter])

  // Global week range calculation for selectors
  const globalWeekRange = useMemo(() => {
    const allAbsWeeks: number[] = []
    data.forEach(r => {
      const anoAtual = parseInt(r.anoAtual) || 0
      const anoReal = parseInt(r.anoReal) || 0
      const prog = parseInt(r.programado) || 0
      const real = parseInt(r.realizadoSemana) || 0

      if (prog > 0 && anoAtual > 0) allAbsWeeks.push(anoAtual * 52 + prog)
      if (real > 0 && anoReal > 0) allAbsWeeks.push(anoReal * 52 + real)
    })
    
    if (allAbsWeeks.length === 0) return { weekList: [], minWeek: 0, maxWeek: 0 }
    
    const minWeek = Math.min(...allAbsWeeks)
    const maxWeek = Math.max(...allAbsWeeks)
    const range = Math.min(156, maxWeek - minWeek + 1)
    const weekList: { abs: number; number: number; year: number }[] = []
    for (let i = 0; i < range; i++) {
      const abs = minWeek + i
      const year = Math.floor(abs / 52)
      let num = abs % 52
      if (num === 0) num = 52
      weekList.push({ abs, number: num, year })
    }
    return { weekList, minWeek, maxWeek }
  }, [])

  // Initialize compliance filters on mount or when stages load
  useEffect(() => {
    if (globalWeekRange.weekList.length > 0) {
      if (complianceStartWeek === null) setComplianceStartWeek(globalWeekRange.minWeek)
      if (complianceEndWeek === null) setComplianceEndWeek(globalWeekRange.maxWeek)
    }
  }, [globalWeekRange, complianceStartWeek, complianceEndWeek])

  useEffect(() => {
    if (uniqueEtapas.length > 0 && complianceSelectedEtapas.length === 0) {
      setComplianceSelectedEtapas(uniqueEtapas)
    }
  }, [uniqueEtapas])

  useEffect(() => {
    if (uniqueEtapas.length > 0 && occupancySelectedEtapas.length === 0) {
      setOccupancySelectedEtapas(uniqueEtapas)
    }
  }, [uniqueEtapas])

  // --- Compliance (Atendimento ao Plano) Calculations ---
  const complianceChartData = useMemo(() => {
    const startWeek = complianceStartWeek !== null ? complianceStartWeek : globalWeekRange.minWeek
    const endWeek = complianceEndWeek !== null ? complianceEndWeek : globalWeekRange.maxWeek
    
    if (startWeek === 0 || endWeek === 0 || complianceSelectedEtapas.length === 0) return []

    // 1. Generate range of visible weeks
    const visibleWeeks: number[] = []
    const range = Math.max(1, endWeek - startWeek + 1)
    for (let i = 0; i < range; i++) {
      visibleWeeks.push(startWeek + i)
    }

    // 2. Filter records based on selected client and stages
    const filteredRecords = data.filter(r => {
      const matchClient = complianceClienteFilter === 'todos' || r.cliente === complianceClienteFilter
      const matchStage = complianceSelectedEtapas.includes(normalizeEtapa(r.etapa))
      return matchClient && matchStage
    })

    // 3. For each week, calculate compliance percentage
    return visibleWeeks.map(absWeek => {
      const year = Math.floor(absWeek / 52)
      let weekNumber = absWeek % 52
      if (weekNumber === 0) weekNumber = 52

      // Find records programmed for this specific absolute week
      const progRecords = filteredRecords.filter(r => {
        const anoAtual = parseInt(r.anoAtual) || 0
        const prog = parseInt(r.programado) || 0
        return (anoAtual * 52 + prog) === absWeek
      })

      const total = progRecords.length
      const completed = progRecords.filter(r => r.statusGeral === 'Concluído').length

      return {
        absWeek,
        semanaLabel: `S${weekNumber} ('${String(year).substring(2)})`,
        semanaShort: `S${weekNumber}`,
        'Atendimento': total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : null,
        totalProgramados: total,
        totalConcluidos: completed
      }
    })
  }, [complianceStartWeek, complianceEndWeek, complianceSelectedEtapas, complianceClienteFilter, globalWeekRange])

  const complianceGradientOffset = useMemo(() => {
    const values = complianceChartData
      .map(d => d.Atendimento)
      .filter((v): v is number => v !== null)
    if (values.length === 0) return 0
    const maxVal = Math.max(...values)
    const minVal = Math.min(...values)
    if (maxVal === minVal) {
      return maxVal >= complianceMeta ? 100 : 0
    }
    const offset = (maxVal - complianceMeta) / (maxVal - minVal)
    return Math.max(0, Math.min(100, offset * 100))
  }, [complianceChartData, complianceMeta])

  const complianceMatrixData = useMemo(() => {
    const startWeek = complianceStartWeek !== null ? complianceStartWeek : globalWeekRange.minWeek
    const endWeek = complianceEndWeek !== null ? complianceEndWeek : globalWeekRange.maxWeek
    
    if (startWeek === 0 || endWeek === 0 || complianceSelectedEtapas.length === 0) return []

    const visibleWeeks: number[] = []
    const range = Math.max(1, endWeek - startWeek + 1)
    for (let i = 0; i < range; i++) {
      visibleWeeks.push(startWeek + i)
    }

    const clientFilteredRecords = data.filter(r => {
      return complianceClienteFilter === 'todos' || r.cliente === complianceClienteFilter
    })

    return complianceSelectedEtapas.map(etapa => {
      const stageRecords = clientFilteredRecords.filter(r => normalizeEtapa(r.etapa) === etapa)
      
      const weeklyCompliance = visibleWeeks.map(absWeek => {
        const progRecords = stageRecords.filter(r => {
          const anoAtual = parseInt(r.anoAtual) || 0
          const prog = parseInt(r.programado) || 0
          return (anoAtual * 52 + prog) === absWeek
        })
        
        const total = progRecords.length
        const completed = progRecords.filter(r => r.statusGeral === 'Concluído').length
        
        return {
          absWeek,
          total,
          completed,
          pct: total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : null
        }
      })
      
      return {
        etapa,
        weeklyCompliance
      }
    })
  }, [complianceStartWeek, complianceEndWeek, complianceSelectedEtapas, complianceClienteFilter, globalWeekRange])

  const occupancyChartData = useMemo(() => {
    const clientRecords = data.filter(r => {
      return occupancyClienteFilter === 'todos' || r.cliente === occupancyClienteFilter
    })

    const stageMap = new Map<string, { minProg: number; maxProg: number }>()

    clientRecords.forEach(r => {
      const stageName = normalizeEtapa(r.etapa)
      if (stageName === 'Outros') return

      const anoAtual = parseInt(r.anoAtual) || 0
      const prog = parseInt(r.programado) || 0
      if (anoAtual > 0 && prog > 0) {
        const absWeek = anoAtual * 52 + prog
        const current = stageMap.get(stageName)
        if (!current) {
          stageMap.set(stageName, { minProg: absWeek, maxProg: absWeek })
        } else {
          stageMap.set(stageName, {
            minProg: Math.min(current.minProg, absWeek),
            maxProg: Math.max(current.maxProg, absWeek)
          })
        }
      }
    })

    const result: any[] = []
    stageMap.forEach((val, etapa) => {
      if (occupancySelectedEtapas.includes(etapa)) {
        const minYear = Math.floor((val.minProg - 1) / 52)
        let minNum = val.minProg % 52
        if (minNum === 0) minNum = 52

        const maxYear = Math.floor((val.maxProg - 1) / 52)
        let maxNum = val.maxProg % 52
        if (maxNum === 0) maxNum = 52

        result.push({
          etapa,
          range: [val.minProg, val.maxProg],
          minProg: val.minProg,
          maxProg: val.maxProg,
          semanaInicioLabel: `S${minNum} ('${String(minYear).substring(2)})`,
          semanaFimLabel: `S${maxNum} ('${String(maxYear).substring(2)})`,
          duracao: val.maxProg - val.minProg + 1
        })
      }
    })

    return result.sort((a, b) => a.minProg - b.minProg || a.etapa.localeCompare(b.etapa))
  }, [occupancyClienteFilter, occupancySelectedEtapas])

  // Compliance Custom Helpers
  const CustomDot = (props: any) => {
    const { cx, cy, value } = props
    if (value === null || value === undefined) return null
    const color = value >= complianceMeta ? '#10b981' : '#ef4444'
    return (
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0d0e12" strokeWidth={1.5} />
    )
  }

  const ComplianceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      const val = d.Atendimento
      const statusColor = val >= complianceMeta ? 'text-emerald-400' : 'text-red-400'
      
      return (
        <div className="bg-[#1a1c28] border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
          <p className="font-bold text-white mb-1">{d.semanaLabel}</p>
          {val !== null ? (
            <div className="space-y-1 mt-1.5">
              <p className="flex justify-between gap-4">
                <span>Atendimento:</span>
                <span className={`font-bold ${statusColor}`}>{val}%</span>
              </p>
              <p className="flex justify-between gap-4 text-slate-400">
                <span>Programados:</span>
                <span className="font-semibold text-slate-200">{d.totalProgramados}</span>
              </p>
              <p className="flex justify-between gap-4 text-slate-400">
                <span>Concluídos:</span>
                <span className="font-semibold text-emerald-400">{d.totalConcluidos}</span>
              </p>
            </div>
          ) : (
            <p className="text-slate-500 italic mt-1">Nenhuma etapa programada para esta semana</p>
          )}
        </div>
      )
    }
    return null
  }

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
    { id: 'gantt', label: 'Cronograma', icon: Calendar },
    { id: 'compliance', label: 'Atendimento ao Plano', icon: CheckCircle2 },
    { id: 'occupancy', label: 'Ocupação', icon: Layers },
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
            {updateStatus.type !== 'idle' && (
              <span className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                updateStatus.type === 'loading' ? 'bg-slate-800/80 text-slate-300 animate-pulse' :
                updateStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {updateStatus.message}
              </span>
            )}
            <button
              onClick={handleUpdateData}
              disabled={updateStatus.type === 'loading'}
              className="inline-flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${updateStatus.type === 'loading' ? 'animate-spin' : ''}`} />
              {updateStatus.type === 'loading' ? 'Atualizando...' : 'Atualizar Dados'}
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
                <KpiCard
                  label="Total de Kits"
                  value={totalKits.toLocaleString()}
                  icon={<FolderKanban className="h-5 w-5" />}
                  color="indigo"
                  sub="Registros filtrados"
                  active={statusFilter === 'todos'}
                  onClick={() => setStatusFilter('todos')}
                />
                <KpiCard
                  label="Concluídos"
                  value={`${pctConcluido}%`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  color="emerald"
                  sub={`${concluidos.toLocaleString()} kits finalizados`}
                  active={statusFilter === 'Concluído'}
                  onClick={() => setStatusFilter('Concluído')}
                />
                <KpiCard
                  label="Em Produção"
                  value={`${pctEmProducao}%`}
                  icon={<Loader2 className="h-5 w-5" />}
                  color="blue"
                  sub={`${emProducao.toLocaleString()} kits em produção`}
                  active={statusFilter === 'Em Produção'}
                  onClick={() => setStatusFilter('Em Produção')}
                />
                <KpiCard
                  label="Atrasados"
                  value={`${pctAtrasados}%`}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  color="red"
                  sub={`${atrasados.toLocaleString()} kits atrasados`}
                  active={statusFilter === 'Atrasado'}
                  onClick={() => setStatusFilter('Atrasado')}
                />
              </div>

              {/* Charts row */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Status chart */}
                <ChartCard title="Itens Ativos por Status" className="lg:col-span-1">
                  <div className="relative flex items-center justify-center" style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {statusChartData.map((entry, i) => (
                            <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none" style={{ top: 'calc(45% - 20px)' }}>
                      <span className="text-2xl font-black text-white">
                        {(atrasados + emProducao).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Ativos
                      </span>
                    </div>
                  </div>
                </ChartCard>

                {/* Pareto Etapas */}
                <ChartCard title={paretoTitle} className="lg:col-span-2">
                  {paretoEtapasData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={paretoEtapasData} margin={{ left: -10, right: 10, top: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'medium' }} angle={-30} textAnchor="end" height={70} interval={0} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Qtd Itens', angle: -90, position: 'insideLeft', fill: '#94a3b8', style: { textAnchor: 'middle' }, offset: 0 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="Quantidade"
                          fill={paretoColor}
                          name="Qtd Itens"
                          radius={[4, 4, 0, 0]}
                          barSize={24}
                          onClick={(data) => {
                            if (data && data.name) {
                              setTblEtap(data.name)
                              setTblPage(1)
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <LabelList dataKey="Quantidade" position="top" fill="#cbd5e1" fontSize={9} style={{ fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-xs text-slate-500">
                      Nenhum item encontrado com os filtros aplicados.
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Dynamic Table (replaces both old tables) */}
              <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {tableIcon} {tableTitle}
                  </h3>
                </div>

                {(tblEtap === 'CDI' || tblEtap === 'Pré CDI') && (
                  <div className="mb-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
                    <div>
                      <strong className="text-white">Rastreamento de Gargalo Ativo ({tblEtap}):</strong> Exibindo todas as etapas ativas (atrasadas ou em produção) para os kits que estão com atraso em <strong>{tblEtap}</strong>. Isso ajuda a rastrear em quais outras etapas do processo esses kits estão concorrendo ou retidos.
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-left font-semibold w-[120px]">Projeto</th>
                        <th className="py-2.5 px-3 text-left font-semibold w-[160px]">Cliente</th>
                        <th className="py-2.5 px-3 text-left font-semibold">Equipamento</th>
                        <th className="py-2.5 px-3 text-left font-semibold w-[120px]">Kit</th>
                        <th className="py-2.5 px-3 text-left font-semibold w-[160px]">Etapa</th>
                        <th className="py-2.5 px-3 text-center font-semibold w-[80px]">Sem. Prog.</th>
                        <th className="py-2.5 px-3 text-center font-semibold w-[80px]">Sem. Real</th>
                      </tr>
                      <tr className="border-b border-slate-800/80 bg-slate-900/40">
                        <th className="p-1.5">
                          <select
                            value={tblProj}
                            onChange={e => { setTblProj(e.target.value); setTblPage(1); }}
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-1 text-[11px] font-normal text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="todos">Todos</option>
                            {uniqueTableProj.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </th>
                        <th className="p-1.5">
                          <select
                            value={tblCli}
                            onChange={e => { setTblCli(e.target.value); setTblPage(1); }}
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-1 text-[11px] font-normal text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="todos">Todos</option>
                            {uniqueTableCli.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </th>
                        <th className="p-1.5">
                          <select
                            value={tblEquip}
                            onChange={e => { setTblEquip(e.target.value); setTblPage(1); }}
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-1 text-[11px] font-normal text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="todos">Todos</option>
                            {uniqueTableEquip.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                          </select>
                        </th>
                        <th className="p-1.5">
                          <select
                            value={tblKit}
                            onChange={e => { setTblKit(e.target.value); setTblPage(1); }}
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-1 text-[11px] font-normal text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="todos">Todos</option>
                            {uniqueTableKits.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </th>
                        <th className="p-1.5">
                          <select
                            value={tblEtap}
                            onChange={e => { setTblEtap(e.target.value); setTblPage(1); }}
                            className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-1 text-[11px] font-normal text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="todos">Todas</option>
                            {uniqueTableEtapas.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </th>
                        <th className="p-1.5"></th>
                        <th className="p-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTable.length > 0 ? (
                        paginatedTable.map((item, i) => {
                          const isAtrasado = item.statusGeral === 'Atrasado'
                          return (
                            <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-slate-200">{item.projeto}</td>
                              <td className="py-2.5 px-3 text-slate-300">{item.cliente}</td>
                              <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">{item.equipamento}</td>
                              <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate">{item.kits}</td>
                              <td className="py-2.5 px-3"><span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{normalizeEtapa(item.etapa)}</span></td>
                              <td className="py-2.5 px-3 text-center text-blue-400 font-semibold">{item.programado}</td>
                              <td className={`py-2.5 px-3 text-center font-semibold ${isAtrasado ? 'text-red-400' : 'text-slate-400'}`}>
                                {item.realizadoSemana || '-'}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Nenhum item encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalTablePages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-xs text-slate-400 border-t border-slate-800/50 pt-4">
                    <span>Mostrando página {tblPage} de {totalTablePages} ({filteredTableItems.length} itens)</span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={tblPage === 1}
                        onClick={() => setTblPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 disabled:opacity-40 disabled:hover:bg-slate-800/60 transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        disabled={tblPage === totalTablePages}
                        onClick={() => setTblPage(p => Math.min(totalTablePages, p + 1))}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 disabled:opacity-40 disabled:hover:bg-slate-800/60 transition-colors"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================== LEAD TIME TAB ================== */}
          {activeTab === 'leadtime' && (
            <>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" /> Lead Time — Análise de Equipamentos Concluídos
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Acompanhe o lead time médio dos clientes calculado exclusivamente a partir de equipamentos 100% concluídos na fábrica.
                </p>
              </div>

              {/* Grid of Clients (Left) and Equipments Chart (Right) */}
              <div className="grid gap-6 lg:grid-cols-12 items-start">
                
                {/* Left Column: Clients List */}
                <div className="lg:col-span-5 bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Clientes com Equip. Concluídos ({filteredLtClients.length})
                    </h3>
                  </div>
                  
                  {/* Search box for clients */}
                  <div className="relative mb-3.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filtrar cliente pelo nome..."
                      value={ltClientSearch}
                      onChange={e => setLtClientSearch(e.target.value)}
                      className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all"
                    />
                  </div>

                  {/* Scrollable Clients Table */}
                  <div className="flex-1 overflow-y-auto pr-1 text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-2 px-2">Cliente</th>
                          <th className="py-2 px-2 text-center">Equip.</th>
                          <th className="py-2 px-2 text-center">Prog.</th>
                          <th className="py-2 px-2 text-center">Real.</th>
                          <th className="py-2 px-2 text-center">Desvio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLtClients.length > 0 ? (
                          filteredLtClients.map((c, i) => {
                            const isSelected = selectedLtClient === c.name
                            return (
                              <tr
                                key={i}
                                onClick={() => handleSelectClient(c.name)}
                                className={`border-b border-slate-800/30 hover:bg-slate-800/30 transition-all cursor-pointer ${
                                  isSelected ? 'bg-indigo-600/10 hover:bg-indigo-600/15 border-l-2 border-l-indigo-500 pl-1.5' : ''
                                }`}
                              >
                                <td className="py-2.5 px-2 font-medium text-slate-200 max-w-[120px] truncate" title={c.name}>
                                  {c.name}
                                </td>
                                <td className="py-2.5 px-2 text-center text-slate-400 font-bold">{c.completedCount}</td>
                                <td className="py-2.5 px-2 text-center text-blue-400 font-semibold">{c.ltProgramado}s</td>
                                <td className="py-2.5 px-2 text-center text-slate-300 font-semibold">{c.ltRealizado}s</td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    c.desvio > 0 ? 'bg-red-500/10 text-red-400' :
                                    c.desvio < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-400'
                                  }`}>
                                    {c.desvio > 0 ? `+${c.desvio}` : c.desvio}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              Nenhum cliente encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Equipments Comparison Chart */}
                <div className="lg:col-span-7 bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 h-[520px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {selectedLtClient 
                        ? `Equipamentos Concluídos — ${selectedLtClient}`
                        : 'Lead Time dos Equipamentos'
                      }
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedLtClient 
                        ? 'Clique em um equipamento para visualizar o detalhamento das etapas produtivas abaixo.' 
                        : 'Selecione um cliente à esquerda para carregar seus equipamentos concluídos.'
                      }
                    </p>
                  </div>

                  {selectedLtClient ? (
                    selectedClientEquipmentsLtData.length > 0 ? (
                      <div className="flex-1 overflow-y-auto mt-4 pr-1">
                        <ResponsiveContainer width="100%" height={Math.max(300, selectedClientEquipmentsLtData.length * 45)}>
                          <BarChart
                            data={selectedClientEquipmentsLtData}
                            layout="vertical"
                            margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Semanas', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={140}
                              stroke="#94a3b8"
                              tickFormatter={(val) => val.length > 18 ? val.substring(0, 15) + '...' : val}
                              tick={{ fill: '#cbd5e1', fontSize: 9, fontWeight: 'medium' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 5 }} />
                            <Bar
                              dataKey="ltProgramado"
                              name="Programado"
                              fill="#6366f1"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                              onClick={(entry) => {
                                if (entry && entry.key) {
                                  setSelectedLtEquipment(String(entry.key))
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <LabelList dataKey="ltProgramado" position="right" fill="#cbd5e1" fontSize={8} style={{ fontWeight: 'bold' }} />
                            </Bar>
                            <Bar
                              dataKey="ltRealizado"
                              name="Realizado"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                              onClick={(entry) => {
                                if (entry && entry.key) {
                                  setSelectedLtEquipment(String(entry.key))
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <LabelList dataKey="ltRealizado" position="right" fill="#cbd5e1" fontSize={8} style={{ fontWeight: 'bold' }} />
                              {selectedClientEquipmentsLtData.map((entry, idx) => (
                                <Cell
                                  key={idx}
                                  fill={entry.desvio > 0 ? '#ef4444' : '#10b981'}
                                  stroke={selectedLtEquipment === entry.key ? '#ffffff' : undefined}
                                  strokeWidth={selectedLtEquipment === entry.key ? 2 : undefined}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                        <Clock className="h-10 w-10 text-slate-600 mb-2" />
                        <p className="text-xs">Nenhum equipamento com lead time válido encontrado para este cliente.</p>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/10">
                      <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 animate-pulse">
                        <Filter className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-300">Aguardando Seleção de Cliente</p>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">Selecione um cliente na lista à esquerda para carregar seus equipamentos e comparar os lead times planejados e realizados.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Stage-level detail chart */}
              <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-5">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    {selectedLtEquipment ? (
                      <>
                        <Layers className="h-4 w-4 text-indigo-400" />
                        Detalhamento por Etapa — {completedEquipments[selectedLtEquipment]?.name} (Proj. {completedEquipments[selectedLtEquipment]?.projeto})
                      </>
                    ) : (
                      'Detalhamento do Processo por Etapa'
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedLtEquipment 
                      ? 'Veja a duração (em semanas) planejada vs realizada de cada etapa de produção deste equipamento, organizada na sequência cronológica.' 
                      : 'Clique em um equipamento no gráfico superior para visualizar a duração das etapas individuais de fabricação.'
                    }
                  </p>
                </div>

                {selectedLtEquipment ? (
                  selectedEquipmentStagesLtData.length > 0 ? (
                    <div className="mt-6 space-y-6">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={selectedEquipmentStagesLtData}
                          margin={{ left: -10, right: 10, top: 15, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'medium' }}
                            angle={-20}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            label={{ value: 'Semanas', angle: -90, position: 'insideLeft', fill: '#94a3b8', style: { textAnchor: 'middle' }, offset: 5 }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <Bar dataKey="ltProgramado" name="Programado" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20}>
                            <LabelList dataKey="ltProgramado" position="top" fill="#cbd5e1" fontSize={8} style={{ fontWeight: 'bold' }} />
                          </Bar>
                          <Bar dataKey="ltRealizado" name="Realizado" radius={[4, 4, 0, 0]} barSize={20}>
                            <LabelList dataKey="ltRealizado" position="top" fill="#cbd5e1" fontSize={8} style={{ fontWeight: 'bold' }} />
                            {selectedEquipmentStagesLtData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.desvio > 0 ? '#ef4444' : '#10b981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Mini-table detailing stages */}
                      <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-900/10">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                              <th className="py-2.5 px-4">Etapa Produtiva</th>
                              <th className="py-2.5 px-4 text-center">LT Programado (sem)</th>
                              <th className="py-2.5 px-4 text-center">LT Realizado (sem)</th>
                              <th className="py-2.5 px-4 text-center">Desvio (sem)</th>
                              <th className="py-2.5 px-4 text-center">Ordem Cronológica</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEquipmentStagesLtData.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                                <td className="py-2 px-4 font-medium text-slate-300">{item.name}</td>
                                <td className="py-2 px-4 text-center text-blue-400 font-semibold">{item.ltProgramado}</td>
                                <td className="py-2 px-4 text-center font-semibold" style={{ color: item.desvio > 0 ? '#ef4444' : '#10b981' }}>
                                  {item.ltRealizado}
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.desvio > 0 ? 'bg-red-500/10 text-red-400' :
                                    item.desvio < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-400'
                                  }`}>
                                    {item.desvio > 0 ? `+${item.desvio}` : item.desvio}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-center text-slate-500">
                                  {idx + 1}ª etapa (início programado na semana {item.minProg !== Infinity ? (item.minProg % 52 === 0 ? 52 : item.minProg % 52) : '-'})
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                      Sem dados de etapas disponíveis para este equipamento.
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 mt-4">
                    <Clock className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
                    <p className="text-xs text-slate-500">Nenhum equipamento selecionado. Clique em uma barra de equipamento acima para carregar suas etapas produtivas.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================== GANTT TIMELINE TAB ================== */}
          {activeTab === 'gantt' && (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-400" /> Cronograma Semanal de Produção (Gantt)
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Visualize a programação e realização semanal das etapas produtivas por equipamento.
                </p>
              </div>

              {/* Client & Filters Row */}
              <div className="grid gap-4 md:grid-cols-12 items-center bg-[#12141c] border border-slate-800/80 rounded-2xl p-4">
                
                {/* Client dropdown */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cliente</label>
                  <select
                    value={ganttClienteFilter}
                    onChange={e => setGanttClienteFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {uniqueClientes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Start Week dropdown */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semana Início</label>
                  <select
                    value={ganttStartWeek !== null ? ganttStartWeek : ''}
                    onChange={e => setGanttStartWeek(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {ganttData.fullWeekList.map(w => (
                      <option key={w.abs} value={w.abs}>S{w.number} ({w.year})</option>
                    ))}
                  </select>
                </div>

                {/* End Week dropdown */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semana Fim</label>
                  <select
                    value={ganttEndWeek !== null ? ganttEndWeek : ''}
                    onChange={e => setGanttEndWeek(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {ganttData.fullWeekList
                      .filter(w => ganttStartWeek === null || w.abs >= ganttStartWeek)
                      .map(w => (
                        <option key={w.abs} value={w.abs}>S{w.number} ({w.year})</option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Etapa</label>
                  <select
                    value={ganttStatusFilter}
                    onChange={e => setGanttStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Em Produção">Em Produção</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>

                {/* Gantt Legend */}
                <div className="md:col-span-3 flex flex-wrap gap-x-4 gap-y-2 justify-end self-end h-full py-1 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="h-2.5 w-4 bg-[#6366f1]/60 border border-[#6366f1]/30 rounded"></div>
                    <span>Prog.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="h-2.5 w-4 bg-emerald-500/70 border border-emerald-400/30 rounded"></div>
                    <span>Concluído</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="h-2.5 w-4 bg-blue-500/70 border border-blue-400/30 rounded"></div>
                    <span>Produção</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="h-2.5 w-4 bg-red-500/70 border border-red-400/30 rounded"></div>
                    <span>Atrasado</span>
                  </div>
                </div>

              </div>

              {/* Gantt Chart Panel */}
              <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col">
                {ganttData.weekList.length > 0 ? (
                  <div className="overflow-x-auto select-none">
                    <div className="min-w-max flex flex-col">
                      
                      {/* Timeline Header Row */}
                      <div className="flex border-b border-slate-800 bg-[#0d0e12]">
                        {/* Sticky Header Left Corner */}
                        <div className="w-[320px] shrink-0 sticky left-0 bg-[#0d0e12] z-20 border-r border-slate-800 p-4 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <span>Equipamento / Etapa</span>
                          <span>Status</span>
                        </div>
                        
                        {/* Week Headers */}
                        <div className="flex">
                          {ganttData.weekList.map((w, idx) => (
                            <div
                              key={idx}
                              className="w-[60px] shrink-0 border-r border-slate-800/60 p-2.5 text-center flex flex-col items-center justify-center"
                            >
                              <span className="text-[11px] font-extrabold text-slate-300">S{w.number}</span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">'{String(w.year).substring(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline Body */}
                      <div className="flex flex-col">
                        {ganttData.equipments.map((eq) => {
                          const isExpanded = expandedEquipments[eq.key] !== false
                          const statusColor = 
                            eq.status === 'Concluído' ? 'text-emerald-400' :
                            eq.status === 'Atrasado' ? 'text-red-400' : 'text-blue-400'
                          
                          return (
                            <div key={eq.key} className="flex flex-col">
                              
                              {/* Equipment Row */}
                              <div className="flex border-b border-slate-800 bg-[#161922]/80 hover:bg-[#1a1e2a] transition-colors">
                                {/* Sticky Equipment Label */}
                                <div
                                  onClick={() => toggleExpand(eq.key)}
                                  className="w-[320px] shrink-0 sticky left-0 bg-[#161922] z-10 border-r border-slate-800 p-3.5 flex items-center gap-2 cursor-pointer select-none text-left"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                        Proj {eq.projeto}
                                      </span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 ${statusColor}`}>
                                        {eq.completionPct}%
                                      </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-100 truncate mt-1" title={eq.name}>
                                      {eq.name}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Background Cells for Equipment Row */}
                                <div className="flex bg-[#161922]/30">
                                  {ganttData.weekList.map((_, idx) => (
                                    <div
                                      key={idx}
                                      className="w-[60px] shrink-0 border-r border-slate-800/30 h-14"
                                    ></div>
                                  ))}
                                </div>
                              </div>

                              {/* Stages Rows (conditional) */}
                              {isExpanded && eq.stages.map((stage) => {
                                const isStageCompleted = stage.status === 'Concluído'
                                const isStageDelayed = stage.status === 'Atrasado'
                                
                                const stageIcon = 
                                  isStageCompleted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> :
                                  isStageDelayed ? <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" /> :
                                  <Loader2 className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-spin" />

                                const stageBadgeColor = 
                                  isStageCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  isStageDelayed ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'

                                return (
                                  <div key={stage.name} className="flex border-b border-slate-800/40 hover:bg-slate-800/10 transition-colors">
                                    
                                    {/* Sticky Left Stage Cell */}
                                    <div className="w-[320px] shrink-0 sticky left-0 bg-[#12141c] z-10 border-r border-slate-800 p-3 pl-8 flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-slate-300 truncate pr-2" title={stage.name}>
                                        {stage.name}
                                      </span>
                                      <div className={`flex items-center gap-1 text-[9px] font-semibold border rounded-lg px-1.5 py-0.5 ${stageBadgeColor}`}>
                                        {stageIcon}
                                        <span>{stage.status}</span>
                                      </div>
                                    </div>

                                    {/* Timeline Grid Cell Container */}
                                    <div className="flex relative h-14">
                                      
                                      {/* Background Grid Cells */}
                                      {ganttData.weekList.map((_, idx) => (
                                        <div
                                          key={idx}
                                          className="w-[60px] shrink-0 border-r border-slate-800/20 h-full"
                                        ></div>
                                      ))}

                                      {/* Programmed Bar */}
                                      {stage.minProg !== null && stage.maxProg !== null && (
                                        <div
                                          className="absolute top-[10px] h-[10px] bg-[#6366f1]/60 border border-[#6366f1]/30 rounded-full cursor-pointer hover:bg-[#6366f1]/85 transition-colors"
                                          style={{
                                            left: `${(stage.minProg - (ganttData.minWeek || 0)) * 60 + 4}px`,
                                            width: `${(stage.maxProg - stage.minProg + 1) * 60 - 8}px`
                                          }}
                                          title={`Programado: Semana ${stage.minProg % 52 === 0 ? 52 : stage.minProg % 52} até ${stage.maxProg % 52 === 0 ? 52 : stage.maxProg % 52}`}
                                        ></div>
                                      )}

                                      {/* Realized Bar */}
                                      {stage.minReal !== null && stage.maxReal !== null && (
                                        <div
                                          className={`absolute top-[28px] h-[10px] rounded-full cursor-pointer transition-colors border ${
                                            isStageCompleted ? 'bg-emerald-500/70 border-emerald-400/30 hover:bg-emerald-500/90' :
                                            isStageDelayed ? 'bg-red-500/70 border-red-400/30 hover:bg-red-500/90' :
                                            'bg-blue-500/70 border-blue-400/30 hover:bg-blue-500/90'
                                          }`}
                                          style={{
                                            left: `${(stage.minReal - (ganttData.minWeek || 0)) * 60 + 4}px`,
                                            width: `${(stage.maxReal - stage.minReal + 1) * 60 - 8}px`
                                          }}
                                          title={`Realizado: Semana ${stage.minReal % 52 === 0 ? 52 : stage.minReal % 52} até ${stage.maxReal % 52 === 0 ? 52 : stage.maxReal % 52}`}
                                        ></div>
                                      )}

                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-16 text-slate-500">
                    <Calendar className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-slate-400">Sem cronograma disponível</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm">Este cliente não possui dados temporais cadastrados ou o cliente selecionado é inválido.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================== COMPLIANCE (ATENDIMENTO AO PLANO) TAB ================== */}
          {activeTab === 'compliance' && (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Atendimento ao Plano (Aderência de Cronograma)
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Analise o percentual de kits concluídos em relação aos que foram programados para cada semana.
                </p>
              </div>

              {/* Filters Panel */}
              <div className="grid gap-4 md:grid-cols-12 items-center bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 relative">
                
                {/* Client filter */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cliente</label>
                  <select
                    value={complianceClienteFilter}
                    onChange={e => setComplianceClienteFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    <option value="todos">Todos os Clientes</option>
                    {uniqueClientes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Multi-Select Dropdown for Stages */}
                <div className="relative md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Etapas Produtivas</label>
                  <button
                    onClick={() => setEtapaDropdownOpen(!etapaDropdownOpen)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full text-left flex items-center justify-between"
                  >
                    <span className="truncate">
                      {complianceSelectedEtapas.length === uniqueEtapas.length
                        ? 'Todas as etapas selecionadas'
                        : complianceSelectedEtapas.length === 0
                        ? 'Nenhuma etapa selecionada'
                        : `${complianceSelectedEtapas.length} de ${uniqueEtapas.length} selecionadas`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                  
                  {etapaDropdownOpen && (
                    <>
                      {/* Dropdown Overlay to close it when clicking outside */}
                      <div className="fixed inset-0 z-30" onClick={() => setEtapaDropdownOpen(false)}></div>
                      
                      {/* Dropdown Box */}
                      <div className="absolute top-[55px] left-0 w-full bg-[#1a1d28] border border-slate-700/80 rounded-xl shadow-2xl p-3 z-40 max-h-[260px] overflow-y-auto flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-bold text-slate-400">
                          <button
                            onClick={() => setComplianceSelectedEtapas(uniqueEtapas)}
                            className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Selecionar Todas
                          </button>
                          <button
                            onClick={() => setComplianceSelectedEtapas([])}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Limpar Seleção
                          </button>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {uniqueEtapas.map(etapa => {
                            const isChecked = complianceSelectedEtapas.includes(etapa)
                            return (
                              <label key={etapa} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:text-white select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setComplianceSelectedEtapas(complianceSelectedEtapas.filter(e => e !== etapa))
                                    } else {
                                      setComplianceSelectedEtapas([...complianceSelectedEtapas, etapa])
                                    }
                                  }}
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 h-3.5 w-3.5"
                                />
                                <span>{etapa}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Start Week dropdown */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semana Início</label>
                  <select
                    value={complianceStartWeek !== null ? complianceStartWeek : ''}
                    onChange={e => setComplianceStartWeek(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {globalWeekRange.weekList.map(w => (
                      <option key={w.abs} value={w.abs}>S{w.number} ({w.year})</option>
                    ))}
                  </select>
                </div>

                {/* End Week dropdown */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Semana Fim</label>
                  <select
                    value={complianceEndWeek !== null ? complianceEndWeek : ''}
                    onChange={e => setComplianceEndWeek(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {globalWeekRange.weekList
                      .filter(w => complianceStartWeek === null || w.abs >= complianceStartWeek)
                      .map(w => (
                        <option key={w.abs} value={w.abs}>S{w.number} ({w.year})</option>
                      ))}
                  </select>
                </div>

                {/* Meta Selection */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Meta</label>
                  <select
                    value={complianceMeta}
                    onChange={e => setComplianceMeta(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    {Array.from({ length: 21 }, (_, i) => i * 5).reverse().map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Line Chart Panel */}
              <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Percentual de Atendimento ao Plano por Semana</h3>
                  <div className="flex gap-4 items-center text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Meta Alcançada (≥ {complianceMeta}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Abaixo da Meta ({"<"} {complianceMeta}%)
                    </span>
                  </div>
                </div>

                {complianceChartData.length > 0 ? (
                  <div className="h-[380px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={complianceChartData}
                        margin={{ top: 15, right: 30, left: -15, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={`${complianceGradientOffset}%`} stopColor="#10b981" />
                            <stop offset={`${complianceGradientOffset}%`} stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="semanaShort"
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          domain={[0, 100]}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip content={<ComplianceTooltip />} />
                        
                        {/* Reference Line for the Meta */}
                        <ReferenceLine
                          y={complianceMeta}
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          label={{
                            value: `Meta: ${complianceMeta}%`,
                            position: 'top',
                            fill: '#f59e0b',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }}
                        />

                        {/* Plan Compliance Line */}
                        <Line
                          type="monotone"
                          dataKey="Atendimento"
                          name="Atendimento ao Plano"
                          stroke="url(#complianceGradient)"
                          strokeWidth={3}
                          connectNulls={true}
                          dot={<CustomDot />}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-16 text-slate-500">
                    <Clock className="h-10 w-10 text-slate-700 mb-2" />
                    <p className="text-xs">Nenhum dado programado para o range de semanas ou etapas selecionadas.</p>
                  </div>
                )}
              </div>

              {/* Matrix Table Panel */}
              {complianceChartData.length > 0 && (
                <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4 mt-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">Matriz de Atendimento ao Plano por Etapa</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Visualização em matriz do percentual de atendimento por etapa produtiva em cada semana. Células coloridas indicam se o objetivo foi atingido (Meta: {complianceMeta}%).
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/10">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/30 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 text-left font-semibold sticky left-0 bg-[#12141c] border-r border-slate-800 z-10 min-w-[150px]">Etapa</th>
                          {complianceChartData.map(d => (
                            <th key={d.absWeek} className="py-3 px-3 text-center font-semibold min-w-[70px]">{d.semanaShort}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {complianceMatrixData.map(row => (
                          <tr key={row.etapa} className="border-b border-slate-800/60 hover:bg-slate-800/10 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-[#12141c] border-r border-slate-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{row.etapa}</td>
                            {row.weeklyCompliance.map(cell => {
                              const isAbove = cell.pct !== null && cell.pct >= complianceMeta
                              return (
                                <td key={cell.absWeek} className="py-2.5 px-2 text-center border-r border-slate-800/40 last:border-r-0">
                                  {cell.pct !== null ? (
                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold min-w-[45px] ${
                                      isAbove ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                      {cell.pct}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-medium">-</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                        {/* Summary / Consolidado Row */}
                        <tr className="border-t border-slate-800 bg-slate-900/20 font-semibold">
                          <td className="py-3 px-4 text-white font-extrabold sticky left-0 bg-[#12141c] border-r border-slate-800 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Consolidado</td>
                          {complianceChartData.map(d => {
                            const isAbove = d.Atendimento !== null && d.Atendimento >= complianceMeta
                            return (
                              <td key={d.absWeek} className="py-3 px-2 text-center border-r border-slate-800/40 last:border-r-0">
                                {d.Atendimento !== null ? (
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-extrabold min-w-[45px] ${
                                    isAbove ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
                                  }`}>
                                    {d.Atendimento}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================== OCCUPANCY (OCUPAÇÃO) TAB ================== */}
          {activeTab === 'occupancy' && (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" /> Ocupação das Etapas Produtivas
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Visualização da janela de programação temporal de cada etapa produtiva, mostrando o início e o fim planejado das atividades.
                </p>
              </div>

              {/* Filters Panel */}
              <div className="grid gap-4 md:grid-cols-12 items-center bg-[#12141c] border border-slate-800/80 rounded-2xl p-5 relative">
                
                {/* Client filter */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cliente</label>
                  <select
                    value={occupancyClienteFilter}
                    onChange={e => setOccupancyClienteFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full"
                  >
                    <option value="todos">Todos os Clientes</option>
                    {uniqueClientes.map(cli => (
                      <option key={cli} value={cli}>{cli}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Multi-Select Dropdown for Stages */}
                <div className="relative md:col-span-4 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Etapas</label>
                  <button
                    onClick={() => setOccupancyDropdownOpen(!occupancyDropdownOpen)}
                    className="bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer w-full text-left flex items-center justify-between"
                  >
                    <span className="truncate">
                      {occupancySelectedEtapas.length === uniqueEtapas.length
                        ? 'Todas as etapas selecionadas'
                        : occupancySelectedEtapas.length === 0
                        ? 'Nenhuma etapa selecionada'
                        : `${occupancySelectedEtapas.length} de ${uniqueEtapas.length} selecionadas`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                  
                  {occupancyDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setOccupancyDropdownOpen(false)}></div>
                      <div className="absolute top-[55px] left-0 w-full bg-[#1a1d28] border border-slate-700/80 rounded-xl shadow-2xl p-3 z-40 max-h-[260px] overflow-y-auto flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-bold text-slate-400">
                          <button
                            onClick={() => setOccupancySelectedEtapas(uniqueEtapas)}
                            className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                          >
                            Selecionar Todas
                          </button>
                          <button
                            onClick={() => setOccupancySelectedEtapas([])}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Limpar Seleção
                          </button>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {uniqueEtapas.map(etapa => {
                            const isChecked = occupancySelectedEtapas.includes(etapa)
                            return (
                              <label key={etapa} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:text-white select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setOccupancySelectedEtapas(occupancySelectedEtapas.filter(e => e !== etapa))
                                    } else {
                                      setOccupancySelectedEtapas([...occupancySelectedEtapas, etapa])
                                    }
                                  }}
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 h-3.5 w-3.5"
                                />
                                <span>{etapa}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Horizontal Bar Chart Panel */}
              <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Cronograma de Janela de Atividade por Etapa</h3>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {occupancyChartData.length} etapas sendo exibidas
                  </div>
                </div>

                {occupancyChartData.length > 0 ? (
                  <div className="w-full mt-4" style={{ height: `${Math.max(250, occupancyChartData.length * 40 + 80)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={occupancyChartData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="occupancyBarGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={['dataMin - 1', 'dataMax + 1']}
                          tickFormatter={tickVal => {
                            const year = Math.floor((tickVal - 1) / 52)
                            let num = tickVal % 52
                            if (num === 0) num = 52
                            return `S${num} ('${String(year).substring(2)})`
                          }}
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="etapa"
                          stroke="#94a3b8"
                          tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 'bold' }}
                          width={100}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#1a1c28] border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
                                  <p className="font-bold text-white mb-2">{d.etapa}</p>
                                  <div className="space-y-1 text-slate-300 font-semibold">
                                    <p>Início Planejado: <span className="text-indigo-400">{d.semanaInicioLabel}</span></p>
                                    <p>Término Planejado: <span className="text-emerald-400">{d.semanaFimLabel}</span></p>
                                    <p>Janela de Ocupação: <span className="text-amber-400">{d.duracao} {d.duracao === 1 ? 'semana' : 'semanas'}</span></p>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar
                          dataKey="range"
                          fill="url(#occupancyBarGradient)"
                          radius={[6, 6, 6, 6]}
                          barSize={18}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-16 text-slate-500">
                    <Clock className="h-10 w-10 text-slate-700 mb-2" />
                    <p className="text-xs">Nenhum dado de programação disponível para o cliente ou etapas selecionadas.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// --- Reusable components ---
function KpiCard({
  label,
  value,
  icon,
  color,
  sub,
  active,
  onClick
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  sub: string
  active?: boolean
  onClick?: () => void
}) {
  const colorMap: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'bg-indigo-600/5', border: 'border-indigo-500/80 shadow-lg shadow-indigo-500/5' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'bg-emerald-600/5', border: 'border-emerald-500/80 shadow-lg shadow-emerald-500/5' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'bg-blue-600/5', border: 'border-blue-500/80 shadow-lg shadow-blue-500/5' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'bg-red-600/5', border: 'border-red-500/80 shadow-lg shadow-red-500/5' },
  }
  const c = colorMap[color] || colorMap.indigo
  return (
    <div
      onClick={onClick}
      className={`bg-[#12141c] border ${active ? c.border : 'border-slate-800/80'} rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-slate-700' : ''}`}
    >
      <div className={`absolute top-0 right-0 h-28 w-28 ${c.glow} rounded-full blur-2xl -mr-4 -mt-4 group-hover:opacity-150 transition-opacity`}></div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`h-10 w-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="mt-4">
        <span className="text-4xl font-black text-white tracking-tight">{value}</span>
      </div>
      <p className="text-sm font-bold text-slate-300 mt-1.5">{sub}</p>
    </div>
  )
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#12141c] border border-slate-800/80 rounded-2xl p-6 ${className}`}>
      <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
