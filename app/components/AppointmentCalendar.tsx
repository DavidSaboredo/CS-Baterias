'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  AlertCircle,
  Battery,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  MoreHorizontal,
  Music,
  Search,
  Sun,
  Trash2,
  User,
} from 'lucide-react'
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

const QUICK_DURATIONS = [30, 45, 60, 90, 120]

function roundToNextQuarter(date: Date) {
  const roundedDate = new Date(date)
  roundedDate.setSeconds(0, 0)

  const minutes = roundedDate.getMinutes()
  const roundedMinutes = Math.ceil(minutes / 15) * 15
  roundedDate.setMinutes(roundedMinutes)

  return roundedDate
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeInputValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export default function AppointmentCalendar({ clients }: { clients: Client[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(roundToNextQuarter(new Date()))
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [reason, setReason] = useState(REASONS[0].label)
  const [duration, setDuration] = useState(60)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!calendarRef.current) {
      return
    }

    const calendarApi = calendarRef.current.getApi()
    const nextView = isMobile ? 'timeGridDay' : 'timeGridWeek'

    if (calendarApi.view.type !== nextView) {
      calendarApi.changeView(nextView)
    }
  }, [isMobile])

  useEffect(() => {
    void fetchAppointments()
  }, [])

  useEffect(() => {
    if (!calendarRef.current) {
      return
    }

    calendarRef.current.getApi().gotoDate(selectedDate)
  }, [selectedDate])

  const fetchAppointments = async () => {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)

    const end = new Date()
    end.setMonth(end.getMonth() + 2)

    const response = await getAppointments(start, end)
    if (response.success && response.data) {
      setAppointments(response.data)
    }
  }

  const filteredClients = clientSearch
    ? clients
        .filter(
          (client) =>
            client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            (client.licensePlate && client.licensePlate.toLowerCase().includes(clientSearch.toLowerCase())),
        )
        .slice(0, 5)
    : []

  const appointmentsForSelectedDay = useMemo(
    () =>
      appointments
        .filter((appointment) => isSameCalendarDay(new Date(appointment.startTime), selectedDate))
        .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()),
    [appointments, selectedDate],
  )

  const events = appointments.map((appointment) => {
    const reasonConfig =
      REASONS.find((item) => item.label === appointment.reason) ||
      REASONS.find((item) => item.id === appointment.reason) ||
      REASONS.find((item) => item.id === 'other')

    return {
      id: appointment.id.toString(),
      title: `${appointment.client.name} - ${appointment.reason}`,
      start: appointment.startTime,
      end: appointment.endTime,
      backgroundColor: reasonConfig?.color,
      borderColor: reasonConfig?.color,
      textColor: reasonConfig?.textColor,
      classNames: ['font-semibold', 'text-xs', 'shadow-sm', 'border-0'],
      extendedProps: {
        description: appointment.description,
        client: appointment.client,
        reason: appointment.reason,
      },
    }
  })

  const updateSelectedDatePart = (part: 'date' | 'time', value: string) => {
    const nextDate = new Date(selectedDate)

    if (part === 'date') {
      const [year, month, day] = value.split('-').map(Number)
      nextDate.setFullYear(year, month - 1, day)
    }

    if (part === 'time') {
      const [hours, minutes] = value.split(':').map(Number)
      nextDate.setHours(hours, minutes, 0, 0)
    }

    setSelectedDate(nextDate)
    setFeedback(null)
  }

  const handleDateClick = (arg: { date: Date }) => {
    setSelectedDate(new Date(arg.date))
    setFeedback(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedClient || isLoading) {
      return
    }

    setIsLoading(true)
    setFeedback(null)

    const response = await createAppointment({
      startTime: selectedDate,
      duration,
      clientId: selectedClient.id,
      reason,
      description,
    })

    if (response.success) {
      setFeedback({ type: 'success', text: 'Turno agendado correctamente.' })
      setDescription('')
      await fetchAppointments()
    } else {
      setFeedback({ type: 'error', text: response.error || 'Error al crear el turno' })
    }

    setIsLoading(false)
  }

  const handleDeleteAppointment = async (id: number) => {
    const response = await deleteAppointment(id)

    if (response.success) {
      setFeedback({ type: 'success', text: 'Turno eliminado correctamente.' })
      await fetchAppointments()
    } else {
      setFeedback({ type: 'error', text: response.error || 'Error al eliminar el turno' })
    }
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
              void handleDeleteAppointment(Number(eventInfo.event.id))
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
    <div className="space-y-6">
      <style jsx global>{`
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid #f3f4f6;
          border-radius: 1rem;
          overflow: hidden;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #f3f4f6;
        }
        .fc-col-header-cell-cushion {
          padding-top: 14px;
          padding-bottom: 14px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #111827;
          text-transform: capitalize;
        }
        .fc-timegrid-slot {
          height: 3.5rem;
        }
        .fc-timegrid-slot-label-cushion {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
        }
        .fc-timegrid-axis-cushion,
        .fc-timegrid-slot-label-cushion {
          padding-right: 0.75rem;
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
          font-weight: 600 !important;
          text-transform: capitalize !important;
          padding: 0.55rem 0.95rem !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        }
        .fc-button-primary:hover {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
        }
        .fc-button-active {
          background-color: #111827 !important;
          color: white !important;
          border-color: #111827 !important;
        }
        .fc-toolbar {
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1rem !important;
        }
        .fc-toolbar-title {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          color: #111827 !important;
          text-transform: capitalize !important;
        }
        .fc-event {
          border-radius: 10px !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08) !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease !important;
        }
        .fc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 18px rgba(0,0,0,0.12) !important;
          z-index: 50 !important;
        }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden xl:sticky xl:top-6">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-red-300" />
              <h2 className="text-lg font-semibold">Agendado rapido</h2>
            </div>
            <p className="text-sm text-gray-200">
              Toca un horario en el calendario o elegi fecha y hora manualmente.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={formatDateInputValue(selectedDate)}
                  onChange={(event) => updateSelectedDatePart('date', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  step={900}
                  value={formatTimeInputValue(selectedDate)}
                  onChange={(event) => updateSelectedDatePart('time', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

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
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-medium text-gray-900 truncate">{selectedClient.name}</div>
                      <div className="text-xs text-gray-500 truncate">{selectedClient.licensePlate || 'Sin patente'}</div>
                    </div>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Motivo</label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((item) => {
                  const Icon = item.icon
                  const active = reason === item.label

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReason(item.label)}
                      className={`rounded-xl px-3 py-3 text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                        active
                          ? 'shadow-sm ring-2 ring-offset-1 border-transparent'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: active ? item.color : undefined,
                        color: active ? item.textColor : undefined,
                        borderColor: active ? item.color : undefined,
                        '--tw-ring-color': item.color,
                      } as CSSProperties}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Duracion</label>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_DURATIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDuration(item)}
                    className={`rounded-xl px-2 py-2.5 text-xs font-semibold border transition-colors ${
                      duration === item
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item}m
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Observaciones o detalle opcional"
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedClient || isLoading}
              className="w-full rounded-xl bg-red-600 text-white py-3 font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Agendando...' : 'Guardar turno'}
            </button>

            {feedback && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {feedback.text}
              </div>
            )}
          </form>
        </section>

        <section className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Vista actual</div>
                  <div className="font-semibold text-gray-900 capitalize">{currentTitle || 'Calendario'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Agenda del dia</div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {appointmentsForSelectedDay.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    No hay turnos cargados para este dia.
                  </div>
                ) : (
                  appointmentsForSelectedDay.map((appointment) => {
                    const config =
                      REASONS.find((item) => item.label === appointment.reason) ||
                      REASONS.find((item) => item.id === appointment.reason) ||
                      REASONS.find((item) => item.id === 'other')

                    return (
                      <div key={appointment.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900">{appointment.client.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(appointment.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(appointment.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span
                            className="text-[11px] font-semibold px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${config?.color}20`, color: config?.color }}
                          >
                            {appointment.reason}
                          </span>
                        </div>
                        {appointment.description && (
                          <div className="text-xs text-gray-600 mt-2">{appointment.description}</div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 lg:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-medium text-gray-600">
              {REASONS.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>

            {isMobile && (
              <h2 className="text-lg font-bold text-gray-900 mb-4 capitalize">{currentTitle}</h2>
            )}

            <div className="overflow-x-auto">
              <div className="min-w-[760px] xl:min-w-0">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: isMobile ? '' : 'title',
                    right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay',
                  }}
                  datesSet={(arg) => setCurrentTitle(arg.view.title)}
                  locale="es"
                  slotMinTime="08:00:00"
                  slotMaxTime="20:00:00"
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00:00"
                  allDaySlot={false}
                  nowIndicator={true}
                  height="auto"
                  events={events}
                  eventContent={renderEventContent}
                  dateClick={handleDateClick}
                  eventClick={(eventInfo) => {
                    if (eventInfo.event.start) {
                      setSelectedDate(new Date(eventInfo.event.start))
                    }
                  }}
                  stickyHeaderDates={true}
                  dayMaxEvents={true}
                  buttonText={{
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Dia',
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}