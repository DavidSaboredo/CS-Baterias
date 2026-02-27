'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAppointments(start: Date, end: Date) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        client: true,
      },
    })
    return { success: true, data: appointments }
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return { success: false, error: 'Error al obtener los turnos' }
  }
}

export async function createAppointment(data: {
  startTime: Date
  duration: number // in minutes
  clientId: number
  reason: string
  description?: string
}) {
  try {
    const endTime = new Date(data.startTime.getTime() + data.duration * 60000)

    const appointment = await prisma.appointment.create({
      data: {
        startTime: data.startTime,
        endTime: endTime,
        clientId: data.clientId,
        reason: data.reason,
        description: data.description,
      },
    })

    revalidatePath('/appointments')
    return { success: true, data: appointment }
  } catch (error) {
    console.error('Error creating appointment:', error)
    return { success: false, error: 'Error al crear el turno' }
  }
}

export async function deleteAppointment(id: number) {
  try {
    await prisma.appointment.delete({
      where: { id },
    })
    revalidatePath('/appointments')
    return { success: true }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: 'Error al eliminar el turno' }
  }
}
