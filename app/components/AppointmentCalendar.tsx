'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Battery, Calendar as CalendarIcon, MoreHorizontal, Music, Search, Sun, Trash2, X } from 'lucide-react'
import { createAppointment, deleteAppointment, getAppointments } from '@/app/actions/appointments'

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
  { id: 'battery', label: 'Instalacion de Bateria', color: '#ef4444', textColor: '#ffffff', icon: Battery },
  { id: 'audio', label: 'Instalacion de Audio', color: '#3b82f6', textColor: '#ffffff', icon: Music },
  { id: 'tint', label: 'Polarizado', color: '#10b981', textColor: '#ffffff', icon: Sun },
  { id: 'other', label: 'Otro', color: '#6b7280', textColor: '#ffffff', icon: MoreHorizontal },
]

export default function AppointmentCalendar({ clients }: { clients: Client[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [reason, setReason] = useState(REASONS[0].label)
  const [duration, setDuration] = useState(60)
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const nextView = isMobile ? 'timeGridDay' : 'timeGridWeek'
    if (api.view.type !== nextView) api.changeView(nextView)
  }, [isMobile])

  const fetchAppointments = async (start: Date, end: Date) => {
    setIsFetching(true)
    setFetchError(null)
    const res = await getAppointments(start, end)
    if (res.success && res.data) {
      setAppointments(res.data)
    } else {
      setAppointments([])
      setFetchError(res.error || 'Error al cargar turnos.')
    }
    setIsFetching(false)
  }

  const refreshFromCurrentView = () => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    void fetchAppointments(api.view.activeStart, api.view.activeEnd)
  }

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return []
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.licensePlate && c.licensePlate.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [clients, clientSearch])

  const events = useMemo(() => {
    return appointments.map((appointment) => {
      const reasonConfig =
        REASONS.find((item) => item.label === appointment.reason) ||
        REASONS.find((item) => item.id === appointment.reason) ||
        REASONS.find((item) => item.id === 'other')

      return {
        id: String(appointment.id),
        title: `${appointment.client.name} - ${appointment.reason}`,
        start: appointment.startTime,
        end: appointment.endTime,
        backgroundColor: reasonConfig?.color,
        borderColor: reasonConfig?.color,
        textColor: reasonConfig?.textColor,
        extendedProps: {
          description: appointment.description,
          reason: appointment.reason,
          client: appointment.client,
        },
      }
    })
  }, [appointments])

  const openModalForDate = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
    setSelectedClient(null)
    setClientSearch('')
    setReason(REASONS[0].label)
    setDuration(60)
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedClient || isSaving) return

    setIsSaving(true)
    const res = await createAppointment({
      startTime: selectedDate,
      duration,
      clientId: selectedClient.id,
      reason,
      description,
    })
    setIsSaving(false)

    if (!res.success) {
      alert(res.error || 'Error al crear el turno')
      return
    }

    setIsModalOpen(false)
    refreshFromCurrentView()
  }

  const renderEventContent = (eventInfo: any) => {
    const reasonConfig =
      REASONS.find((item) => item.label === eventInfo.event.extendedProps.reason) ||
      REASONS.find((item) => item.id === eventInfo.event.extendedProps.reason) ||
      REASONS.find((item) => item.id === 'other')
    const Icon = reasonConfig?.icon || MoreHorizontal

    return (
      <div className="flex flex-col overflow-hidden h-full p-1.5 gap-1 relative group">
        <div
          role="button"
          onClick={(clickEvent) => {
            clickEvent.preventDefault()
            clickEvent.stopPropagation()
            if (confirm('¿Eliminar este turno?')) {
              void deleteAppointment(Number(eventInfo.event.id)).then((res) => {
                if (res.success) refreshFromCurrentView()
                else alert(res.error || 'Error al eliminar el turno')
              })
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
        <div className="text-[10px] opacity-90 truncate">{eventInfo.timeText}</div>
        <div className="text-[10px] opacity-80 truncate">{eventInfo.event.extendedProps.reason}</div>
      </div>
    )
  }

  return (
    <div className="bg-white p-2 md:p-4 rounded-xl shadow-sm border border-gray-100 relative">
      {(isFetching || fetchError) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <div className="font-semibold text-gray-800">{isFetching ? 'Cargando turnos...' : fetchError}</div>
          <button
            type="button"
            onClick={refreshFromCurrentView}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 border border-gray-200 hover:bg-gray-100"
          >
            Actualizar
          </button>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: isMobile ? 'prev,next' : 'prev,next today',
          center: isMobile ? '' : 'title',
          right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        datesSet={(arg) => {
          void fetchAppointments(arg.view.activeStart, arg.view.activeEnd)
        }}
        locale="es"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        events={events}
        eventContent={renderEventContent}
        dateClick={(arg) => openModalForDate(arg.date)}
        contentHeight="auto"
        expandRows={false}
        stickyHeaderDates={true}
        dayMaxEvents={true}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
        }}
      />

      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-500" />
                Nuevo Turno
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-900">
                <div className="font-semibold">Horario seleccionado</div>
                <div className="mt-1 capitalize">
                  {selectedDate.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cliente</label>
                {!selectedClient ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Buscar por nombre o patente"
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    {filteredClients.length > 0 && (
                      <div className="absolute z-20 w-full mt-2 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client)
                              setClientSearch('')
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-xs text-gray-500">{client.licensePlate || 'Sin patente'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 gap-3">
                    <div className="overflow-hidden">
                      <div className="font-medium text-gray-900 truncate">{selectedClient.name}</div>
                      <div className="text-xs text-gray-500 truncate">{selectedClient.licensePlate || 'Sin patente'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {REASONS.map((r) => (
                      <option key={r.id} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                  <select
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {[30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving || !selectedClient}
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSaving ? 'Guardando…' : 'Crear turno'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

