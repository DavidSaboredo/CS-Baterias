'use client'

import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Plus, X, Search, User, Clock, Calendar as CalendarIcon, FileText, Battery, Music, Sun, MoreHorizontal, Trash2 } from 'lucide-react'
import { createAppointment, getAppointments, deleteAppointment } from '@/app/actions/appointments'

type Client = {
  id: number
  name: string
  licensePlate: string | null
}

type Appointment = {
  id: number
  startTime: Date
  endTime: Date
  reason: string
  description: string | null
  client: Client
}

const REASONS = [
  { id: 'battery', label: 'Instalación de Batería', color: '#ef4444', textColor: '#ffffff', icon: Battery }, // red-500
  { id: 'audio', label: 'Instalación de Audio', color: '#3b82f6', textColor: '#ffffff', icon: Music }, // blue-500
  { id: 'tint', label: 'Polarizado', color: '#10b981', textColor: '#ffffff', icon: Sun }, // emerald-500
  { id: 'other', label: 'Otro', color: '#6b7280', textColor: '#ffffff', icon: MoreHorizontal }, // gray-500
]

export default function AppointmentCalendar({ clients }: { clients: Client[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Form State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [reason, setReason] = useState(REASONS[0].label)
  const [duration, setDuration] = useState(60) // minutes
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile() // Check on mount
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      const newView = isMobile ? 'timeGridDay' : 'timeGridWeek'
      if (calendarApi.view.type !== newView) {
        calendarApi.changeView(newView)
      }
    }
  }, [isMobile])

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    // Fetch for a wide range, ideally based on current view
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const end = new Date()
    end.setMonth(end.getMonth() + 2)
    
    const res = await getAppointments(start, end)
    if (res.success && res.data) {
      setAppointments(res.data)
    }
  }

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.date)
    setIsModalOpen(true)
    // Reset form
    setSelectedClient(null)
    setClientSearch('')
    setReason(REASONS[0].label)
    setDuration(60)
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedClient) return

    setIsLoading(true)
    const res = await createAppointment({
      startTime: selectedDate,
      duration,
      clientId: selectedClient.id,
      reason,
      description
    })

    if (res.success) {
      setIsModalOpen(false)
      fetchAppointments()
    } else {
      alert('Error al crear el turno')
    }
    setIsLoading(false)
  }

  const handleDeleteAppointment = async (id: number) => {
    const res = await deleteAppointment(id)
    if (res.success) {
      fetchAppointments()
    } else {
      alert('Error al eliminar el turno')
    }
  }

  // Filter clients
  const filteredClients = clientSearch 
    ? clients.filter(c => 
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
        (c.licensePlate && c.licensePlate.toLowerCase().includes(clientSearch.toLowerCase()))
      ).slice(0, 5)
    : []

  const events = appointments.map(apt => {
    // Try to match by label first (current behavior), then by ID (legacy/fallback), then default
    const reasonConfig = REASONS.find(r => r.label === apt.reason) || 
                         REASONS.find(r => r.id === apt.reason) || 
                         REASONS.find(r => r.id === 'other')
    
    return {
      id: apt.id.toString(),
      title: `${apt.client.name} - ${apt.reason}`,
      start: apt.startTime,
      end: apt.endTime,
      backgroundColor: reasonConfig?.color,
      borderColor: reasonConfig?.color,
      textColor: reasonConfig?.textColor,
      classNames: ['font-semibold', 'text-xs', 'shadow-sm', 'border-0'],
      extendedProps: {
        description: apt.description,
        client: apt.client,
        reason: apt.reason
      }
    }
  })

  const renderEventContent = (eventInfo: any) => {
    const reasonConfig = REASONS.find(r => r.label === eventInfo.event.extendedProps.reason) || 
                         REASONS.find(r => r.id === eventInfo.event.extendedProps.reason) ||
                         REASONS.find(r => eventInfo.event.title.includes(r.label)) ||
                         REASONS.find(r => r.id === 'other')
    
    const Icon = reasonConfig?.icon || MoreHorizontal

    return (
      <div className="flex flex-col overflow-hidden h-full p-1 gap-0.5 relative group">
        <div 
          role="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (confirm('¿Eliminar este turno?')) {
              handleDeleteAppointment(Number(eventInfo.event.id))
            }
          }}
          className="absolute top-0 right-0 p-1 text-gray-500 hover:text-red-600 bg-white/90 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm cursor-pointer"
          title="Eliminar turno"
        >
          <Trash2 className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-1.5 font-bold truncate text-[11px] leading-tight pr-4">
          <Icon className="w-3 h-3 shrink-0" />
          <span className="truncate">{eventInfo.event.title.split(' - ')[0]}</span>
        </div>
        <div className="text-[10px] opacity-90 truncate pl-4.5">
          {eventInfo.timeText}
        </div>
        {eventInfo.event.extendedProps.description && (
          <div className="text-[9px] opacity-75 truncate pl-4.5 italic">
            "{eventInfo.event.extendedProps.description}"
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 relative">
      <style jsx global>{`
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid #f3f4f6;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #f3f4f6;
        }
        .fc-col-header-cell-cushion {
          padding-top: 12px;
          padding-bottom: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
        }
        .fc-timegrid-slot-label-cushion {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 500;
        }
        .fc-timegrid-now-indicator-line {
          border-color: #ef4444;
          border-width: 2px;
        }
        .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444;
          border-width: 6px;
          border-bottom-color: transparent;
          border-top-color: transparent;
        }
        .fc-button-primary {
          background-color: white !important;
          border-color: #e5e7eb !important;
          color: #374151 !important;
          font-weight: 500 !important;
          text-transform: capitalize !important;
          padding: 0.5rem 1rem !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        }
        .fc-button-primary:hover {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
        }
        .fc-button-primary:focus {
          box-shadow: 0 0 0 2px rgba(229, 231, 235, 0.5) !important;
        }
        .fc-button-active {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
          border-color: #d1d5db !important;
        }
        .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #111827 !important;
          text-transform: capitalize !important;
        }
        .fc-event {
          border-radius: 6px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        }
        .fc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
          z-index: 50 !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: isMobile ? 'prev,next' : 'prev,next today',
          center: 'title',
          right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        locale="es"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        events={events}
        eventContent={renderEventContent}
        dateClick={handleDateClick}
        contentHeight="auto"
        expandRows={false}
        stickyHeaderDates={true}
        dayMaxEvents={true}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día'
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-500" />
                Nuevo Turno
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              
              {/* Date Display */}
              <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center">
                {selectedDate?.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
              </div>

              {/* Client Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Cliente</label>
                {!selectedClient ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o patente..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                    {filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client)
                              setClientSearch('')
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 text-sm"
                          >
                            <span className="font-medium text-gray-900">{client.name}</span>
                            <span className="text-xs text-gray-500">{client.licensePlate}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs shrink-0">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-gray-900 text-sm truncate">{selectedClient.name}</p>
                        <p className="text-xs text-gray-500">{selectedClient.licensePlate || 'Sin patente'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Reason Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Motivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map(r => {
                    const Icon = r.icon
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReason(r.label)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${
                          reason === r.label
                            ? 'border-transparent shadow-sm ring-2 ring-offset-1'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        style={{
                          backgroundColor: reason === r.label ? r.color : undefined,
                          color: reason === r.label ? r.textColor : undefined,
                          borderColor: reason === r.label ? r.color : undefined,
                          '--tw-ring-color': r.color
                        } as any}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Duration & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Duración (min)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      step="15"
                      min="15"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Notas</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Opcional..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedClient || isLoading}
                className="w-full mt-4 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
              >
                {isLoading ? 'Agendando...' : 'Agendar Turno'}
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
